import { describe, expect, it } from 'vitest'
import {
  buildLoopbackRedirect,
  generateUserCode,
  isValidRedirectPort,
  sha256Base64Url,
  verifyCodeChallenge,
} from '#/lib/cli-auth'

describe('cli auth: redirect port validation', () => {
  it('accepts ephemeral ports only', () => {
    expect(isValidRedirectPort(57321)).toBe(true)
    expect(isValidRedirectPort(1024)).toBe(true)
    expect(isValidRedirectPort(65535)).toBe(true)
  })

  it('rejects anything that could redirect somewhere else', () => {
    // A caller-supplied host would make the approve endpoint an open redirect
    // that hands an auth code to an arbitrary origin, so only the port is
    // caller-supplied and it has to be a plain integer in range.
    expect(isValidRedirectPort('evil.com')).toBe(false)
    expect(isValidRedirectPort('57321')).toBe(false)
    expect(isValidRedirectPort(80)).toBe(false)
    expect(isValidRedirectPort(0)).toBe(false)
    expect(isValidRedirectPort(-1)).toBe(false)
    expect(isValidRedirectPort(99999)).toBe(false)
    expect(isValidRedirectPort(1024.5)).toBe(false)
    expect(isValidRedirectPort(null)).toBe(false)
    expect(isValidRedirectPort(undefined)).toBe(false)
  })
})

describe('cli auth: loopback redirect', () => {
  it('always targets 127.0.0.1 regardless of port', () => {
    const url = new URL(buildLoopbackRedirect(57321, 'the-code', 'the-state'))
    expect(url.hostname).toBe('127.0.0.1')
    expect(url.protocol).toBe('http:')
    expect(url.port).toBe('57321')
    expect(url.pathname).toBe('/callback')
    expect(url.searchParams.get('code')).toBe('the-code')
    expect(url.searchParams.get('state')).toBe('the-state')
  })
})

describe('cli auth: PKCE', () => {
  it('accepts the verifier that produced the challenge', () => {
    const verifier = 'a'.repeat(64)
    expect(verifyCodeChallenge(verifier, sha256Base64Url(verifier))).toBe(true)
  })

  it('rejects a mismatched verifier', () => {
    const challenge = sha256Base64Url('a'.repeat(64))
    expect(verifyCodeChallenge('b'.repeat(64), challenge)).toBe(false)
    expect(verifyCodeChallenge('', challenge)).toBe(false)
  })

  it('rejects a truncated challenge rather than comparing a prefix', () => {
    const verifier = 'a'.repeat(64)
    const challenge = sha256Base64Url(verifier)
    expect(verifyCodeChallenge(verifier, challenge.slice(0, 10))).toBe(false)
  })
})

describe('cli auth: user code', () => {
  it('is a readable fixed-format code', () => {
    const code = generateUserCode()
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  })

  it('omits characters that are ambiguous when read aloud', () => {
    const codes = Array.from({ length: 200 }, () => generateUserCode()).join('')
    expect(codes).not.toMatch(/[O0I1]/)
  })

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateUserCode()))
    expect(seen.size).toBe(200)
  })
})
