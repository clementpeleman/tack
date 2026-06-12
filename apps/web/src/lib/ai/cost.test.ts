import { describe, expect, it } from 'vitest'

import {
  calculateRunCostCents,
  canStartAiRun,
  estimateTokensFromText,
  getAiBudgetConfig,
} from './cost'

describe('AI cost helpers', () => {
  it('estimates tokens from text length', () => {
    expect(estimateTokensFromText('12345678')).toBe(2)
  })

  it('calculates known default model cost', () => {
    expect(
      calculateRunCostCents({
        model: 'gpt-5.4-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(525)
  })

  it('reads caps from env-like config', () => {
    expect(
      getAiBudgetConfig({
        TACK_AI_MONTHLY_CAP_CENTS: '250',
        TACK_AI_JOB_CAP_CENTS: '25',
      }),
    ).toEqual({ monthlyCapCents: 250, jobCapCents: 25 })
  })

  it('blocks runs above job or monthly caps', () => {
    expect(
      canStartAiRun({
        currentMonthCostCents: 0,
        estimatedJobCostCents: 101,
        budget: { monthlyCapCents: 500, jobCapCents: 100 },
      }).ok,
    ).toBe(false)

    expect(
      canStartAiRun({
        currentMonthCostCents: 450,
        estimatedJobCostCents: 75,
        budget: { monthlyCapCents: 500, jobCapCents: 100 },
      }).ok,
    ).toBe(false)
  })
})
