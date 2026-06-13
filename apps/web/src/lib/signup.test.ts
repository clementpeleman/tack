import { describe, expect, it } from 'vitest'

import { isSignupAllowed } from './signup'

describe('signup policy', () => {
  it('is closed by default on self-host', () => {
    expect(isSignupAllowed({})).toBe(false)
    expect(isSignupAllowed({ TACK_DEPLOYMENT: 'selfhost' })).toBe(false)
  })

  it('opens on self-host only with the explicit flag', () => {
    expect(isSignupAllowed({ TACK_ALLOW_SIGNUP: 'true' })).toBe(true)
    expect(isSignupAllowed({ TACK_ALLOW_SIGNUP: 'false' })).toBe(false)
    expect(isSignupAllowed({ TACK_ALLOW_SIGNUP: '1' })).toBe(false)
  })

  it('always allows signup on hosted, flag or not', () => {
    expect(isSignupAllowed({ TACK_DEPLOYMENT: 'hosted' })).toBe(true)
    expect(
      isSignupAllowed({ TACK_DEPLOYMENT: 'hosted', TACK_ALLOW_SIGNUP: 'false' }),
    ).toBe(true)
  })
})
