export function buildPreviewLink(
  previewUrl: string,
  pinUrl: string,
  pinId: string,
): string {
  const base = previewUrl.replace(/\/$/, '')
  const path = pinUrl.startsWith('/') ? pinUrl : `/${pinUrl}`
  const url = new URL(`${base}${path}`)
  url.searchParams.set('pin', pinId)
  return url.toString()
}

export function getTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
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
