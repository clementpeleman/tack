export function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tack-Reviewer',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
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
