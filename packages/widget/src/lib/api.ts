export class WidgetApiError extends Error {
  status: number
  retryAfter: number | null

  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message)
    this.name = 'WidgetApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

async function parseJsonResponse(res: Response) {
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '60')
    throw new WidgetApiError(
      `Too many requests. Try again in ${retryAfter}s.`,
      429,
      retryAfter,
    )
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new WidgetApiError(
      body.error ?? `Request failed (${res.status})`,
      res.status,
    )
  }

  return res.json()
}

let apiHost = ''

export function setApiHost(host: string) {
  apiHost = host.replace(/\/$/, '')
}

export async function widgetInit(projectKey: string, url: string) {
  const params = new URLSearchParams({ projectKey, url })
  const res = await fetch(`${apiHost}/api/widget/init?${params}`)
  return parseJsonResponse(res)
}

export async function createPin(data: {
  projectKey: string
  url: string
  reviewerId: string
  reviewerName?: string
  xPct: number
  yPct: number
  scrollY: number
  viewportW: number
  viewportH: number
  selector?: string
  xpath?: string
  tackId?: string
  elementText?: string
  body: string
  browser?: string
  os?: string
  screenshot?: string
}) {
  const res = await fetch(`${apiHost}/api/widget/pins`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data),
  })
  return parseJsonResponse(res)
}

export async function updatePin(data: {
  projectKey: string
  pinId: string
  reviewerId: string
  comment: string
  reviewerName?: string
}) {
  const res = await fetch(`${apiHost}/api/widget/pins/${data.pinId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      projectKey: data.projectKey,
      reviewerId: data.reviewerId,
      comment: data.comment,
      reviewerName: data.reviewerName,
    }),
  })
  return parseJsonResponse(res)
}

export async function deletePin(data: {
  projectKey: string
  pinId: string
  reviewerId: string
}) {
  const res = await fetch(`${apiHost}/api/widget/pins/${data.pinId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      projectKey: data.projectKey,
      reviewerId: data.reviewerId,
    }),
  })
  return parseJsonResponse(res)
}

export interface WidgetReply {
  id: string
  authorType: 'owner' | 'reviewer'
  authorName: string
  body: string
  createdAt: string
}

export async function fetchReplies(projectKey: string, pinId: string) {
  const params = new URLSearchParams({ projectKey })
  const res = await fetch(
    `${apiHost}/api/widget/pins/${pinId}/replies?${params}`,
  )
  return parseJsonResponse(res) as Promise<{ replies: WidgetReply[] }>
}

export async function createReply(data: {
  projectKey: string
  pinId: string
  reviewerId: string
  comment: string
  reviewerName?: string
}) {
  const res = await fetch(`${apiHost}/api/widget/pins/${data.pinId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      projectKey: data.projectKey,
      reviewerId: data.reviewerId,
      comment: data.comment,
      reviewerName: data.reviewerName,
    }),
  })
  return parseJsonResponse(res) as Promise<{ reply: WidgetReply }>
}

export async function reportPlacements(
  projectKey: string,
  placements: { pinId: string; placement: string }[],
): Promise<void> {
  if (placements.length === 0) return
  // Best-effort: never let placement reporting surface errors to the reviewer.
  try {
    await fetch(`${apiHost}/api/widget/placement`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ projectKey, placements }),
    })
  } catch {
    /* ignore */
  }
}

export function connectWidgetEvents(
  projectKey: string,
  onEvent: () => void,
): () => void {
  let es: EventSource | null = null
  let retryMs = 1000
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let closed = false

  const connect = () => {
    if (closed) return
    es?.close()
    const params = new URLSearchParams({ projectKey })
    es = new EventSource(`${apiHost}/api/widget/events?${params}`)
    es.onmessage = () => onEvent()
    es.onopen = () => {
      retryMs = 1000
    }
    es.onerror = () => {
      es?.close()
      if (closed) return
      retryTimer = setTimeout(connect, retryMs)
      retryMs = Math.min(retryMs * 2, 30_000)
    }
  }

  connect()

  return () => {
    closed = true
    if (retryTimer) clearTimeout(retryTimer)
    es?.close()
  }
}
