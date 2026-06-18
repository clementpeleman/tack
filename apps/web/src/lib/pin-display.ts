function ensureScheme(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function buildPreviewLink(
  previewUrl: string,
  pinUrl: string,
  pinId: string,
): string {
  // pinUrl is normally a root-relative path ("/about"), but tolerate an
  // absolute URL too.
  const pinIsAbsolute = /^https?:\/\//i.test(pinUrl)
  const path = pinUrl.startsWith('/') ? pinUrl : `/${pinUrl}`

  try {
    if (pinIsAbsolute) {
      const url = new URL(pinUrl)
      url.searchParams.set('pin', pinId)
      return url.toString()
    }
    // Anchor the path to the preview ORIGIN. The stored previewUrl may carry a
    // path/query/trailing slash; the pin path is already root-relative, so use
    // only the origin to avoid producing a wrong URL like ".../preview/about".
    // ensureScheme guarantees `new URL` (called during render) won't throw on a
    // value like "preview.acme.com" or "localhost:5173".
    const origin = new URL(ensureScheme(previewUrl)).origin
    const url = new URL(`${origin}${path}`)
    url.searchParams.set('pin', pinId)
    return url.toString()
  } catch {
    // Last-resort fallback: best-effort concatenation rather than crashing.
    const base = ensureScheme(previewUrl).replace(/\/$/, '')
    const sep = `${base}${path}`.includes('?') ? '&' : '?'
    return `${base}${path}${sep}pin=${encodeURIComponent(pinId)}`
  }
}

// Stored timestamps come from SQLite `datetime('now')` as "YYYY-MM-DD HH:MM:SS"
// in UTC with no zone marker; `new Date()` would parse that as local time and
// skew every relative time by the viewer's UTC offset. Normalize to UTC.
export function parseStoredTimestamp(dateStr: string): number {
  const s = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T')
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`
  return new Date(withZone).getTime()
}

export function getTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = parseStoredTimestamp(dateStr)
  const diff = Math.max(0, now - then)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function parseBrowser(ua: string): string {
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return ua.slice(0, 30)
}
