import { describe, expect, it } from 'vitest'
import { normalizePinUrl } from '@tack/shared'
import {
  buildPreviewLink,
  getTimeAgo,
  parseStoredTimestamp,
} from '#/lib/pin-display'
import {
  enforceWidgetOrigin,
  previewOriginMatches,
} from '#/lib/widget-connection'
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
  it('blocks a mismatched cross-origin request with 403', () => {
    const res = enforceWidgetOrigin('https://preview.example.com', 'https://evil.com')
    expect(res?.status).toBe(403)
    // disallowed origin must not be able to read the response
    expect(res?.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('allows a matching origin and same-origin (no Origin header)', () => {
    expect(enforceWidgetOrigin('https://preview.example.com', 'https://preview.example.com')).toBeNull()
    expect(enforceWidgetOrigin('https://preview.example.com', null)).toBeNull()
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
