import { describe, expect, it } from 'vitest'

import { getAiEntitlement } from './entitlement'

describe('AI entitlement', () => {
  it('is disabled by default on self-host', () => {
    expect(getAiEntitlement({})).toEqual({ entitled: false, reason: 'disabled' })
  })

  it('stays disabled with a key but no opt-in flag', () => {
    expect(getAiEntitlement({ OPENAI_API_KEY: 'sk-test' })).toEqual({
      entitled: false,
      reason: 'disabled',
    })
  })

  it('requires a key once the flag is set', () => {
    expect(getAiEntitlement({ TACK_AI_ENABLED: 'true' })).toEqual({
      entitled: false,
      reason: 'missing_key',
    })
  })

  it('entitles self-host with flag and key', () => {
    expect(
      getAiEntitlement({ TACK_AI_ENABLED: 'true', OPENAI_API_KEY: 'sk-test' }),
    ).toEqual({ entitled: true, reason: null })
  })

  it('does not require the flag on hosted', () => {
    expect(
      getAiEntitlement({ TACK_DEPLOYMENT: 'hosted', OPENAI_API_KEY: 'sk-test' }),
    ).toEqual({ entitled: true, reason: null })
  })

  it('still requires a key on hosted', () => {
    expect(getAiEntitlement({ TACK_DEPLOYMENT: 'hosted' })).toEqual({
      entitled: false,
      reason: 'missing_key',
    })
  })
})
