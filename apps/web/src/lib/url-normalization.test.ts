import { describe, expect, it } from 'vitest'
import { normalizePinUrl, resolvePlacementForDisplay } from '@tack/shared'

describe('resolvePlacementForDisplay', () => {
  it('uses the widget-reported state when checked (verified)', () => {
    expect(
      resolvePlacementForDisplay({
        selector: '.btn',
        placementState: 'lost',
        placementCheckedAt: '2026-06-17T10:00:00Z',
      }),
    ).toEqual({ state: 'lost', verified: true })
  })

  it('falls back to an unverified inference when never checked', () => {
    expect(resolvePlacementForDisplay({ selector: '.btn' })).toEqual({
      state: 'anchored',
      verified: false,
    })
    // state present but no checkedAt is still unverified
    expect(
      resolvePlacementForDisplay({ xpath: '//div', placementState: 'lost' }),
    ).toEqual({ state: 'approximate', verified: false })
  })
})

describe('normalizePinUrl', () => {
  it('AE3: strips tracking params + hash, keeps allowlisted query keys', () => {
    expect(
      normalizePinUrl('/pricing/', '?utm_source=x&tab=plans', ['tab']),
    ).toBe('/pricing?tab=plans')
  })

  it('defaults to pathname-only when no query allowlist is configured', () => {
    expect(normalizePinUrl('/page', '?a=1&b=2')).toBe('/page')
  })

  it('drops tracking params even when allowlisting other keys', () => {
    expect(
      normalizePinUrl('/p', '?utm_campaign=x&fbclid=y&keep=1', ['keep']),
    ).toBe('/p?keep=1')
  })

  it('strips a hash fragment from the path and the query', () => {
    expect(normalizePinUrl('/about#team')).toBe('/about')
    expect(normalizePinUrl('/p', '?tab=x#frag', ['tab'])).toBe('/p?tab=x')
  })

  it('collapses duplicate slashes', () => {
    expect(normalizePinUrl('/foo//bar///baz')).toBe('/foo/bar/baz')
  })

  it('normalizes root and trailing slashes', () => {
    expect(normalizePinUrl('/')).toBe('/')
    expect(normalizePinUrl('')).toBe('/')
    expect(normalizePinUrl('/about/')).toBe('/about')
  })

  it('adds a leading slash to a bare path', () => {
    expect(normalizePinUrl('about')).toBe('/about')
  })

  it('drops an allowlisted key that is absent and returns just the path', () => {
    expect(normalizePinUrl('/p', '?other=1', ['tab'])).toBe('/p')
  })
})
