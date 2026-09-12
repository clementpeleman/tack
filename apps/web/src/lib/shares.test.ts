import { afterEach, describe, expect, it } from 'vitest'
import { isPublicIp } from '#/lib/net'
import {
  generateSlug,
  hashPasscode,
  passcodeMatches,
  shareOrigin,
  slugFromOrigin,
} from '#/lib/shares'

const env = process.env

afterEach(() => {
  delete process.env.TACK_SHARE_DOMAIN
  delete process.env.TACK_SHARE_PORT
  delete process.env.TACK_PUBLIC_URL
  Object.assign(process.env, env)
})

describe('shares: slug', () => {
  it('is lowercase, dns-safe and carries at least 14 random chars', () => {
    const slug = generateSlug('Acme Website (v2)!')
    expect(slug).toMatch(/^acme-website-v2-[a-z2-9]{14}$/)
    expect(generateSlug('')).toMatch(/^[a-z2-9]{14}$/)
  })

  it('never repeats', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateSlug('x')))
    expect(seen.size).toBe(200)
  })
})

describe('shares: origin mapping', () => {
  it('builds the share origin from the configured domain', () => {
    process.env.TACK_SHARE_DOMAIN = 'share.example.com'
    process.env.TACK_PUBLIC_URL = 'https://tack.example.com'
    expect(shareOrigin('acme-abc')).toBe('https://acme-abc.share.example.com')
    process.env.TACK_SHARE_PORT = '3000'
    delete process.env.TACK_PUBLIC_URL
    expect(shareOrigin('acme-abc')).toBe('http://acme-abc.share.example.com:3000')
  })

  it('recognises only direct children of the share domain', () => {
    process.env.TACK_SHARE_DOMAIN = 'share.example.com'
    expect(slugFromOrigin('https://acme-abc.share.example.com')).toBe('acme-abc')
    expect(slugFromOrigin('http://acme-abc.share.example.com:3000')).toBe('acme-abc')
    expect(slugFromOrigin('https://x.acme-abc.share.example.com')).toBeNull()
    expect(slugFromOrigin('https://share.example.com')).toBeNull()
    expect(slugFromOrigin('https://evil.com')).toBeNull()
    expect(slugFromOrigin('https://share.example.com.evil.com')).toBeNull()
  })

  it('returns null when sharing is not configured', () => {
    expect(slugFromOrigin('https://a.share.example.com')).toBeNull()
  })
})

describe('shares: passcode', () => {
  it('hashes per slug so a cookie cannot cross shares', () => {
    const hash = hashPasscode('one', 'secret')
    expect(passcodeMatches('one', 'secret', hash)).toBe(true)
    expect(passcodeMatches('two', 'secret', hash)).toBe(false)
    expect(passcodeMatches('one', 'wrong', hash)).toBe(false)
  })
})

describe('shares: public address check', () => {
  it('rejects private, loopback, link-local and CGNAT ranges', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.1.1', '100.64.0.1', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:10.0.0.1']) {
      expect(isPublicIp(ip), ip).toBe(false)
    }
  })
  it('accepts public addresses', () => {
    for (const ip of ['8.8.8.8', '76.76.21.21', '172.32.0.1', '2606:4700::1111', '::ffff:8.8.8.8']) {
      expect(isPublicIp(ip), ip).toBe(true)
    }
  })
})

describe('shares: target validation', () => {
  it('refuses private, loopback, credentialed, recursive and non-http targets', async () => {
    process.env.TACK_SHARE_DOMAIN = 'share.example.com'
    process.env.TACK_PUBLIC_URL = 'https://tack.example.com'
    delete process.env.TACK_SHARE_ALLOW_LOCAL
    const { validateTargetUrl } = await import('#/lib/shares')
    for (const bad of [
      'http://localhost:3005',
      'http://127.0.0.1',
      'http://10.0.0.1',
      'http://[::1]',
      'ftp://example.com',
      'https://user:pw@example.com',
      'https://abc.share.example.com',
      'https://tack.example.com/projects',
      'not a url',
      '',
    ]) {
      await expect(validateTargetUrl(bad), bad).rejects.toThrow()
    }
  })

  it('accepts a public target by IP and normalises the path', async () => {
    process.env.TACK_SHARE_DOMAIN = 'share.example.com'
    const { validateTargetUrl } = await import('#/lib/shares')
    // A literal public IP avoids DNS in the test.
    await expect(validateTargetUrl('https://8.8.8.8/preview/#x')).resolves.toBe(
      'https://8.8.8.8/preview',
    )
  })
})
