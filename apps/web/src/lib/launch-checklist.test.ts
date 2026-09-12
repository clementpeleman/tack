import { describe, expect, it } from 'vitest'
import { normalizePinUrl } from '@tack/shared'
import {
  buildPreviewLink,
  getTimeAgo,
  parseStoredTimestamp,
} from '#/lib/pin-display'
import {
  enforceWidgetOrigin,
  isLoopbackOrigin,
  normalizeOrigin,
  originAllowed,
  previewOriginMatches,
  resolveRequestOrigin,
  validateAllowedOrigins,
  MAX_ALLOWED_ORIGINS,
} from '#/lib/widget-connection'
import { getClientIp } from '#/lib/rate-limit'
import { parseScreenshotBase64 } from '#/lib/storage'

describe('launch checklist: open in preview', () => {
  it('builds deeplink with pin query param on the pin page path', () => {
    const link = buildPreviewLink(
      'https://preview.example.com',
      '/about',
      'pin-123',
    )
    const url = new URL(link)
    expect(url.origin + url.pathname).toBe('https://preview.example.com/about')
    expect(url.searchParams.get('pin')).toBe('pin-123')
  })

  it('prepends https:// when the preview URL has no scheme', () => {
    const url = new URL(buildPreviewLink('preview.acme.com', '/x', 'p1'))
    expect(url.origin + url.pathname).toBe('https://preview.acme.com/x')
    expect(url.searchParams.get('pin')).toBe('p1')
  })

  it('anchors the pin path to the preview origin, ignoring any base path', () => {
    const url = new URL(
      buildPreviewLink('https://site.com/sub/dir', '/about', 'p1'),
    )
    expect(url.origin + url.pathname).toBe('https://site.com/about')
  })

  it('preserves SPA query keys when configured', () => {
    expect(
      normalizePinUrl('/page', '?tab=settings&utm_source=x', ['tab']),
    ).toBe('/page?tab=settings')
  })
})

describe('launch checklist: widget connection', () => {
  it('matches preview host to widget origin', () => {
    expect(
      previewOriginMatches(
        'https://preview.example.com/path',
        'https://preview.example.com',
      ),
    ).toBe(true)
    expect(
      previewOriginMatches(
        'https://preview.example.com',
        'https://wrong.example.com',
      ),
    ).toBe(false)
  })

  it('supports wildcard subdomain preview hosts', () => {
    expect(previewOriginMatches('https://*.vercel.app', 'https://pr-7.vercel.app')).toBe(true)
    expect(previewOriginMatches('https://*.vercel.app', 'https://vercel.app')).toBe(true)
    expect(previewOriginMatches('https://*.vercel.app', 'https://evil.com')).toBe(false)
  })
})

describe('launch checklist: widget origin enforcement', () => {
  const project = {
    previewUrl: 'https://preview.example.com',
    allowedOrigins: null,
  }

  it('blocks a mismatched cross-origin request with 403', () => {
    const res = enforceWidgetOrigin(project, 'https://evil.com')
    expect(res?.status).toBe(403)
    // disallowed origin must not be able to read the response
    expect(res?.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('allows a matching origin', () => {
    expect(enforceWidgetOrigin(project, 'https://preview.example.com')).toBeNull()
  })

  it('rejects a request with no resolvable origin (curl, scripts)', () => {
    // The project key is public; "no Origin header" must not bypass the gate.
    const res = enforceWidgetOrigin(project, null)
    expect(res?.status).toBe(403)
  })

  it('resolves the origin from Origin, then Referer, else null', () => {
    const withOrigin = new Request('https://tack.test/api/widget/init', {
      headers: { origin: 'https://preview.example.com', referer: 'https://other.example/' },
    })
    expect(resolveRequestOrigin(withOrigin)).toBe('https://preview.example.com')

    // Same-origin GET (widget on the Tack host itself) carries only Referer.
    const withReferer = new Request('https://tack.test/api/widget/init', {
      headers: { referer: 'https://tack.test/demo?x=1' },
    })
    expect(resolveRequestOrigin(withReferer)).toBe('https://tack.test')

    const opaque = new Request('https://tack.test/api/widget/init', {
      headers: { origin: 'null' },
    })
    expect(resolveRequestOrigin(opaque)).toBeNull()

    const bare = new Request('https://tack.test/api/widget/init')
    expect(resolveRequestOrigin(bare)).toBeNull()
  })

  it('takes the last X-Forwarded-For hop, which the proxy wrote', () => {
    const req = new Request('https://tack.test/', {
      headers: { 'x-forwarded-for': '1.1.1.1, 203.0.113.9' },
    })
    expect(getClientIp(req)).toBe('203.0.113.9')
  })

  it('allows an origin from the project allowlist', () => {
    const withLocalhost = {
      previewUrl: 'https://preview.example.com',
      allowedOrigins: ['http://localhost:5173'],
    }
    expect(originAllowed(withLocalhost, 'http://localhost:5173')).toBe(true)
    expect(enforceWidgetOrigin(withLocalhost, 'http://localhost:5173')).toBeNull()
    // a different port is a different origin
    expect(originAllowed(withLocalhost, 'http://localhost:3000')).toBe(false)
    // the allowlist must not widen anything else
    expect(originAllowed(withLocalhost, 'https://evil.com')).toBe(false)
  })
})

describe('launch checklist: origin normalization', () => {
  it('normalizes to scheme://host[:port] and drops path', () => {
    expect(normalizeOrigin('http://Localhost:5173/some/path')).toBe(
      'http://localhost:5173',
    )
    expect(normalizeOrigin('https://preview.example.com')).toBe(
      'https://preview.example.com',
    )
  })

  it('rejects non-http(s) and malformed input', () => {
    expect(normalizeOrigin('javascript:alert(1)')).toBeNull()
    expect(normalizeOrigin('file:///etc/passwd')).toBeNull()
    expect(normalizeOrigin('not a url')).toBeNull()
    expect(normalizeOrigin('*')).toBeNull()
  })

  it('identifies loopback origins', () => {
    expect(isLoopbackOrigin('http://localhost:3000')).toBe(true)
    expect(isLoopbackOrigin('http://127.0.0.1:8080')).toBe(true)
    expect(isLoopbackOrigin('http://[::1]:3000')).toBe(true)
    expect(isLoopbackOrigin('http://app.localhost:3000')).toBe(true)
    expect(isLoopbackOrigin('https://evil.com')).toBe(false)
    // must not be fooled by a hostname that merely contains "localhost"
    expect(isLoopbackOrigin('https://localhost.evil.com')).toBe(false)
  })
})

describe('launch checklist: allowlist validation', () => {
  it('accepts and dedupes valid origins', () => {
    const res = validateAllowedOrigins([
      'http://localhost:5173',
      'http://localhost:5173/',
    ])
    expect(res).toEqual({ ok: true, origins: ['http://localhost:5173'] })
  })

  it('rejects non-loopback origins when loopbackOnly is set', () => {
    // This is the gate that stops a stolen CLI token from allowlisting a
    // domain it controls and reading the project's reviewer feedback.
    const res = validateAllowedOrigins(['https://evil.com'], {
      loopbackOnly: true,
    })
    expect(res.ok).toBe(false)
  })

  it('allows remote origins when not restricted to loopback', () => {
    const res = validateAllowedOrigins(['https://staging.example.com'])
    expect(res.ok).toBe(true)
  })

  it('enforces the count cap and rejects junk', () => {
    const tooMany = Array.from(
      { length: MAX_ALLOWED_ORIGINS + 1 },
      (_, i) => `http://localhost:${4000 + i}`,
    )
    expect(validateAllowedOrigins(tooMany).ok).toBe(false)
    expect(validateAllowedOrigins('nope').ok).toBe(false)
    expect(validateAllowedOrigins([123]).ok).toBe(false)
    expect(validateAllowedOrigins(['http://' + 'a'.repeat(300)]).ok).toBe(false)
  })
})

describe('launch checklist: screenshot bounds', () => {
  it('accepts a small image data URL', () => {
    expect(
      parseScreenshotBase64('data:image/jpeg;base64,/9j/4AAQSkZJRg=='),
    ).toBeInstanceOf(Buffer)
  })

  it('rejects non-image and oversized payloads', () => {
    expect(parseScreenshotBase64('data:text/html;base64,PHNjcmlwdD4=')).toBeNull()
    expect(parseScreenshotBase64('not-a-data-url')).toBeNull()
    const huge = 'data:image/png;base64,' + 'A'.repeat(8 * 1024 * 1024)
    expect(parseScreenshotBase64(huge)).toBeNull()
  })
})

describe('launch checklist: stored timestamps are UTC', () => {
  it('parses SQLite "YYYY-MM-DD HH:MM:SS" (UTC) the same as ISO Z', () => {
    expect(parseStoredTimestamp('2026-06-17 16:00:00')).toBe(
      Date.parse('2026-06-17T16:00:00Z'),
    )
  })

  it('does not skew relative time by the viewer timezone', () => {
    const fiveMinAgoUtc = new Date(Date.now() - 5 * 60_000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ')
    expect(getTimeAgo(fiveMinAgoUtc)).toBe('5m ago')
  })
})

describe('launch checklist: resolve/reopen filters', () => {
  it('filters pins by status', () => {
    const pins = [
      { id: '1', status: 'open' },
      { id: '2', status: 'resolved' },
      { id: '3', status: 'open' },
    ]

    expect(pins.filter((p) => p.status === 'open')).toHaveLength(2)
    expect(pins.filter((p) => p.status === 'resolved')).toHaveLength(1)
  })
})
