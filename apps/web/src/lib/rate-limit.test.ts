import { describe, expect, it } from 'vitest'
import {
  enforceWidgetRateLimit,
  magicLinkRateLimited,
} from '#/lib/rate-limit'

describe('enforceWidgetRateLimit', () => {
  it('allows requests under the limit', () => {
    for (let i = 0; i < 60; i++) {
      expect(enforceWidgetRateLimit(`pk_test_${i % 3}`)).toBeNull()
    }
  })

  it('returns 429 with Retry-After when exceeded', () => {
    const key = `pk_burst_${Date.now()}`
    for (let i = 0; i < 60; i++) {
      expect(enforceWidgetRateLimit(key)).toBeNull()
    }
    const limited = enforceWidgetRateLimit(key)
    expect(limited?.status).toBe(429)
    expect(limited?.headers.get('Retry-After')).toBeTruthy()
  })
})

describe('magicLinkRateLimited', () => {
  it('allows first requests for distinct keys', () => {
    const result = magicLinkRateLimited(
      `user-${Date.now()}@example.com`,
      `127.0.0.${Date.now() % 200}`,
    )
    expect(result.emailLimited).toBe(false)
    expect(result.ipLimited).toBe(false)
  })
})
