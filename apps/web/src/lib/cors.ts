export function corsHeaders(allowOrigin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tack-Reviewer',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  // Only echo an allowed origin. Never reflect arbitrary origins with `*`:
  // a disallowed origin gets no ACAO header and so cannot read the response.
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin
  return headers
}

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  }
  return null
}
