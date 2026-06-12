export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

class SlidingWindowLimiter {
  private buckets = new Map<string, number[]>()

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now()
    const windowStart = now - windowMs
    let timestamps = this.buckets.get(key) ?? []
    timestamps = timestamps.filter((t) => t > windowStart)

    if (timestamps.length >= limit) {
      const oldest = timestamps[0] ?? now
      const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000)
      this.buckets.set(key, timestamps)
      return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) }
    }

    timestamps.push(now)
    this.buckets.set(key, timestamps)
    return { allowed: true, retryAfterSeconds: 0 }
  }
}

const widgetLimiter = new SlidingWindowLimiter()
const magicLinkEmailLimiter = new SlidingWindowLimiter()
const magicLinkIpLimiter = new SlidingWindowLimiter()
const dashboardLimiter = new SlidingWindowLimiter()

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export function rateLimitResponse(
  retryAfterSeconds: number,
  headers?: HeadersInit,
): Response {
  const merged = new Headers(headers)
  merged.set('Content-Type', 'application/json')
  merged.set('Retry-After', String(retryAfterSeconds))
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: merged,
  })
}

export function enforceWidgetRateLimit(
  projectKey: string,
  headers?: HeadersInit,
): Response | null {
  const result = widgetLimiter.check(`widget:${projectKey}`, 60, 60_000)
  if (!result.allowed) {
    return rateLimitResponse(result.retryAfterSeconds, headers)
  }
  return null
}

export function enforceDashboardRateLimit(sessionToken: string): void {
  const result = dashboardLimiter.check(`session:${sessionToken}`, 300, 60_000)
  if (!result.allowed) {
    throw rateLimitResponse(result.retryAfterSeconds)
  }
}

export function magicLinkRateLimited(
  email: string,
  ip: string,
): { emailLimited: boolean; ipLimited: boolean } {
  const emailResult = magicLinkEmailLimiter.check(
    `email:${email}`,
    5,
    3_600_000,
  )
  const ipResult = magicLinkIpLimiter.check(`ip:${ip}`, 20, 3_600_000)
  return {
    emailLimited: !emailResult.allowed,
    ipLimited: !ipResult.allowed,
  }
}
