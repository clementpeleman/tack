const TRACKING_PARAMS = /^utm_|^fbclid$/i

export function normalizePinUrl(
  pathname: string,
  search = '',
  pinQueryParams?: string[],
): string {
  let path = pathname || '/'
  if (!path.startsWith('/')) path = `/${path}`
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)

  const raw = search.startsWith('?') ? search.slice(1) : search
  if (!raw) return path

  const params = new URLSearchParams(raw)
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.test(key)) params.delete(key)
  }

  if (pinQueryParams?.length) {
    for (const key of [...params.keys()]) {
      if (!pinQueryParams.includes(key)) params.delete(key)
    }
    const qs = params.toString()
    return qs ? `${path}?${qs}` : path
  }

  return path
}
