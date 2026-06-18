const TRACKING_PARAMS = /^utm_|^fbclid$/i

export function normalizePinUrl(
  pathname: string,
  search = '',
  pinQueryParams?: string[],
): string {
  // Drop any hash fragment, normalize to a leading slash, collapse duplicate
  // slashes, and strip a trailing slash (except root).
  let path = (pathname || '/').split('#')[0]
  if (!path.startsWith('/')) path = `/${path}`
  path = path.replace(/\/{2,}/g, '/')
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)

  const rawWithHash = search.startsWith('?') ? search.slice(1) : search
  const raw = rawWithHash.split('#')[0]
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
