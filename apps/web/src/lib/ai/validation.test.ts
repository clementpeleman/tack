import { describe, expect, it } from 'vitest'

import { parseAiInboxResult } from './validation'

describe('parseAiInboxResult', () => {
  it('parses valid structured AI output', () => {
    const result = parseAiInboxResult(
      JSON.stringify({
        pins: [
          {
            pinId: 'pin_1',
            label: 'copy',
            priority: 'quick_win',
            summary: 'Hero headline needs a shorter phrase.',
            ambiguous: false,
          },
        ],
        groups: [
          {
            title: 'Hero copy pass',
            summary: 'Client wants tighter wording in the hero.',
            type: 'copy',
            priority: 'quick_win',
            implementationBrief: 'Update the hero headline copy only.',
            pinIds: ['pin_1'],
          },
        ],
      }),
      ['pin_1'],
    )

    expect(result.pins[0]?.label).toBe('copy')
    expect(result.groups[0]?.implementationBrief).toContain('hero headline')
  })

  it('rejects unknown pin ids', () => {
    expect(() =>
      parseAiInboxResult(
        JSON.stringify({
          pins: [
            {
              pinId: 'other_pin',
              label: 'bug',
              priority: 'normal',
              summary: 'Unknown pin.',
              ambiguous: false,
            },
          ],
          groups: [],
        }),
        ['pin_1'],
      ),
    ).toThrow(/unknown pinId/)
  })

  it('rejects duplicate pin insights', () => {
    const insight = {
      pinId: 'pin_1',
      label: 'design',
      priority: 'normal',
      summary: 'Spacing issue.',
      ambiguous: false,
    }

    expect(() =>
      parseAiInboxResult(
        JSON.stringify({ pins: [insight, insight], groups: [] }),
        ['pin_1'],
      ),
    ).toThrow(/duplicate insight/)
  })
})
