import { describe, expect, it } from 'vitest'
import { normalizePinUrl } from '@tack/shared'
import { buildPreviewLink } from '#/lib/pin-display'
import { previewOriginMatches } from '#/lib/widget-connection'

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
