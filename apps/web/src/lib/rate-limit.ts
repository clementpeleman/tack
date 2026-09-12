const SWEEP_INTERVAL_MS = 5 * 60_000

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

class SlidingWindowLimiter {
  private buckets = new Map<string, number[]>()
  private lastSweep = Date.now()

  /** Drop buckets whose every timestamp fell out of the window, so keys an attacker invents cannot grow memory forever. */
  private sweep(now: number, windowMs: number): void {
    if (now - this.lastSweep < SWEEP_INTERVAL_MS) return
    this.lastSweep = now
    const cutoff = now - windowMs
    for (const [key, timestamps] of this.buckets) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1]! <= cutoff) {
        this.buckets.delete(key)
      }
    }
  }

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now()
    this.sweep(now, windowMs)
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
const cliAuthLimiter = new SlidingWindowLimiter()

/**
 * Behind a reverse proxy the socket address is the proxy, so the client IP
 * has to come from X-Forwarded-For. The proxy appends the address it saw as
 * the LAST entry; anything before it was sent by the client and is free to
 * forge. Taking the last hop is what makes IP-keyed limits hold up.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const hops = forwarded.split(',').map((h) => h.trim()).filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1]!
  }
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

/**
 * Guards the unauthenticated CLI login handshake (start + exchange) so the
 * request table can't be flooded and codes can't be brute-forced by IP.
 */
export function cliAuthRateLimited(ip: string): boolean {
  return !cliAuthLimiter.check(`cli-auth:${ip}`, 30, 600_000).allowed
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
