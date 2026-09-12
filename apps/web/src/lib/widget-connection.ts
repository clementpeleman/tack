import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { corsHeaders } from '#/lib/cors'

/** The fields the origin gate needs. Any full project row satisfies this. */
export interface OriginScope {
  previewUrl: string
  allowedOrigins: string[] | null
}

export const MAX_ALLOWED_ORIGINS = 10

export function previewOriginMatches(
  previewUrl: string,
  origin: string,
): boolean {
  try {
    const requestHost = new URL(origin).host.toLowerCase()
    // Parse the preview host tolerantly so a wildcard like `*.vercel.app`
    // (for dynamic preview deployments) survives `new URL` rejection.
    const previewHost = previewUrl
      .trim()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .replace(/[/?#].*$/, '')
      .toLowerCase()
    if (!previewHost) return false
    if (previewHost.startsWith('*.')) {
      const base = previewHost.slice(2)
      return requestHost === base || requestHost.endsWith(`.${base}`)
    }
    return requestHost === previewHost
  } catch {
    return false
  }
}

/**
 * Strict normalization for allowlist entries: `scheme://host[:port]`, http(s)
 * only, no path and no wildcard. Deliberately stricter than `previewUrl`,
 * which is typed by a human and tolerates a `*.` prefix — allowlist entries
 * are machine-written, so there is no reason to accept fuzzy input.
 */
export function normalizeOrigin(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Loopback origins are the only ones the CLI may register on its own. The
 * project key is public by design, so the origin check is the real
 * authorization gate for reading and writing pins — letting a CLI token
 * register an arbitrary origin would turn a stolen token into "this domain
 * can now read all reviewer feedback". Remote origins go through the
 * dashboard, where a human is authenticated by session.
 */
export function isLoopbackOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin)
  if (!normalized) return false
  try {
    const hostname = new URL(normalized).hostname.toLowerCase()
    // `new URL` keeps IPv6 hosts bracketed in `hostname`.
    const bare = hostname.replace(/^\[|\]$/g, '')
    return (
      bare === 'localhost' ||
      bare === '::1' ||
      bare.endsWith('.localhost') ||
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(bare)
    )
  } catch {
    return false
  }
}

/** True when `origin` may load the widget for this project. */
export function originAllowed(project: OriginScope, origin: string): boolean {
  if (previewOriginMatches(project.previewUrl, origin)) return true

  const requestOrigin = normalizeOrigin(origin)
  if (!requestOrigin) return false

  return (project.allowedOrigins ?? []).some(
    (allowed) => normalizeOrigin(allowed) === requestOrigin,
  )
}

/**
 * Validate a caller-supplied allowlist. `loopbackOnly` is set for CLI-issued
 * writes; the dashboard may register remote preview origins.
 */
export function validateAllowedOrigins(
  input: unknown,
  { loopbackOnly = false }: { loopbackOnly?: boolean } = {},
): { ok: true; origins: string[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: 'Origins must be an array.' }
  }
  if (input.length > MAX_ALLOWED_ORIGINS) {
    return {
      ok: false,
      error: `At most ${MAX_ALLOWED_ORIGINS} origins are allowed.`,
    }
  }

  const origins: string[] = []
  for (const entry of input) {
    if (typeof entry !== 'string' || entry.length > 200) {
      return { ok: false, error: 'Each origin must be a string under 200 characters.' }
    }
    const normalized = normalizeOrigin(entry)
    if (!normalized) {
      return { ok: false, error: `"${entry}" is not a valid http(s) origin.` }
    }
    if (loopbackOnly && !isLoopbackOrigin(normalized)) {
      return {
        ok: false,
        error: `"${normalized}" is not a loopback origin. Add remote origins from project settings.`,
      }
    }
    if (!origins.includes(normalized)) origins.push(normalized)
  }

  return { ok: true, origins }
}

/**
 * The origin a widget request comes from. Browsers send `Origin` on every
 * cross-origin fetch and on same-origin POSTs; a same-origin GET (the widget
 * running on the Tack host itself, e.g. `/demo`) carries only `Referer`, so
 * that is the fallback. A request with neither is not a browser running the
 * widget and gets `null`, which the gate rejects. Never trust a client-sent
 * `X-*` header here: the whole point of the origin gate is that the project
 * key is public, so the only credential is what the browser itself asserts.
 */
export function resolveRequestOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')
  if (origin && origin !== 'null') return origin
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).origin
    } catch {
      return null
    }
  }
  return null
}

/**
 * Gate a widget request by origin. The request origin must match the
 * project's preview origin or one of its allowed origins. A request with no
 * resolvable origin at all (curl, a script) is rejected too: the project key
 * is public, so "no origin" must not be a way around the only real check.
 * Returns a 403 Response with no ACAO, so a disallowed origin cannot read it.
 */
export function enforceWidgetOrigin(
  project: OriginScope,
  origin: string | null,
): Response | null {
  if (!origin || !originAllowed(project, origin)) {
    return Response.json(
      { error: 'This origin is not allowed for this project.' },
      { status: 403, headers: corsHeaders(null) },
    )
  }
  return null
}

/**
 * Remember the most recent origin that tried to load the widget and was
 * refused, so the dashboard can say "the widget tried to load from X" instead
 * of a bare "not connected". Throttled per process so a hostile page cannot
 * turn every request into a write.
 */
const rejectedWriteAt = new Map<string, number>()
const REJECTED_WRITE_INTERVAL_MS = 30_000

export async function recordRejectedOrigin(
  projectId: string,
  origin: string,
): Promise<void> {
  const normalized = normalizeOrigin(origin)
  if (!normalized) return
  const last = rejectedWriteAt.get(projectId) ?? 0
  if (Date.now() - last < REJECTED_WRITE_INTERVAL_MS) return
  rejectedWriteAt.set(projectId, Date.now())
  await db
    .update(projects)
    .set({
      lastRejectedOrigin: normalized,
      lastRejectedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, projectId))
}

export async function recordWidgetConnection(
  project: OriginScope & { id: string; firstWidgetSeenAt: string | null },
  origin: string | null,
): Promise<boolean> {
  if (!origin || project.firstWidgetSeenAt) return false
  if (!originAllowed(project, origin)) return false

  const now = new Date().toISOString()
  await db
    .update(projects)
    .set({
      firstWidgetSeenAt: now,
      firstWidgetOrigin: normalizeOrigin(origin) ?? origin,
    })
    .where(eq(projects.id, project.id))

  return true
}
