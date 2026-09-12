const ID_KEY = 'tack_reviewer_id'
const NAME_KEY = 'tack_reviewer_name'
const HINT_KEY = 'tack_launcher_hint_seen'

// localStorage throws in sandboxed iframes and some privacy modes; the
// widget must degrade (a per-load id) rather than fail to mount.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `r_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function getReviewerId(): string {
  let id = read(ID_KEY)
  if (!id) {
    id = randomId()
    write(ID_KEY, id)
  }
  return id
}

/** The name a reviewer last typed, so they enter it once per browser. */
export function getReviewerName(): string {
  return read(NAME_KEY) ?? ''
}

export function rememberReviewerName(name: string): void {
  const trimmed = name.trim()
  if (trimmed) write(NAME_KEY, trimmed.slice(0, 120))
}

export function hasSeenLauncherHint(): boolean {
  return read(HINT_KEY) === '1'
}

export function markLauncherHintSeen(): void {
  write(HINT_KEY, '1')
}
