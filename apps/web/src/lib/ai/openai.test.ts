import { describe, expect, it } from 'vitest'

import { AiConfigurationError, analyzePinsWithOpenAI } from './openai'
import type { AiPinInput } from './types'

const pin: AiPinInput = {
  id: 'pin_1',
  url: '/home',
  comment: 'Make the CTA shorter.',
  reviewerName: 'Client',
  selector: 'button.cta',
  elementText: 'Start your project today',
  browser: 'Chrome',
  viewport: '1440x900 at 50.0%, 20.0%',
}

describe('analyzePinsWithOpenAI', () => {
  it('returns an empty result without requiring a key when there are no pins', async () => {
    await expect(
      analyzePinsWithOpenAI({
        apiKey: undefined,
        model: 'gpt-5.4-mini',
        pins: [],
      }),
    ).resolves.toEqual({
      result: { pins: [], groups: [] },
      usage: { inputTokens: 0, outputTokens: 0 },
    })
  })

  it('fails clearly when the API key is missing', async () => {
    await expect(
      analyzePinsWithOpenAI({
        apiKey: undefined,
        model: 'gpt-5.4-mini',
        pins: [pin],
      }),
    ).rejects.toBeInstanceOf(AiConfigurationError)
  })

  it('parses a structured OpenAI response', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            pins: [
              {
                pinId: 'pin_1',
                label: 'copy',
                priority: 'quick_win',
                summary: 'CTA copy can be shortened.',
                ambiguous: false,
              },
            ],
            groups: [
              {
                title: 'CTA copy',
                summary: 'Small copy change on the main CTA.',
                type: 'copy',
                priority: 'quick_win',
                implementationBrief: 'Shorten the CTA text without changing layout.',
                pinIds: ['pin_1'],
              },
            ],
          }),
          usage: { input_tokens: 120, output_tokens: 80 },
        }),
      )

    const result = await analyzePinsWithOpenAI({
      apiKey: 'sk-test',
      model: 'gpt-5.4-mini',
      pins: [pin],
      fetcher,
    })

    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 80 })
    expect(result.result.groups[0]?.title).toBe('CTA copy')
  })
})
