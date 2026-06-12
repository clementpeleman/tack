import { describe, expect, it } from 'vitest'

import { buildAgentPrompt, type AgentPromptPin } from './agent-prompt'

const group = {
  title: 'Tighten hero copy',
  summary: 'Two reviewers flagged the hero headline as too long.',
  type: 'copy',
  priority: 'quick_win',
  implementationBrief: 'Shorten the hero headline without changing layout.',
}

function makePin(overrides: Partial<AgentPromptPin> = {}): AgentPromptPin {
  return {
    id: 'pin_1',
    url: 'https://preview.example.com/',
    comment: 'This headline is way too long',
    reviewerName: 'Sofie',
    selector: 'main > section.hero h1',
    xpath: '/html/body/main/section[1]/h1',
    tackId: null,
    elementText: 'Build websites faster than ever before',
    browser: 'Chrome 137',
    os: 'macOS',
    xPct: 48.2,
    yPct: 12.5,
    viewportW: 1440,
    viewportH: 900,
    screenshotUrl: 'https://tack.example.com/api/screenshots/pk_abc/pin_1',
    ...overrides,
  }
}

describe('buildAgentPrompt', () => {
  it('renders the brief, pin context, and scope guardrail', () => {
    const prompt = buildAgentPrompt(group, [makePin()])

    expect(prompt).toContain('# Tighten hero copy')
    expect(prompt).toContain('## Implementation brief')
    expect(prompt).toContain('Shorten the hero headline')
    expect(prompt).toContain('Priority: quick win')
    expect(prompt).toContain('### Pin 1 — Sofie')
    expect(prompt).toContain('> This headline is way too long')
    expect(prompt).toContain('- Selector: `main > section.hero h1`')
    expect(prompt).toContain('- Open in context: https://preview.example.com/?pin=pin_1')
    expect(prompt).toContain('- Position: 48.2%, 12.5% in a 1440×900 viewport')
    expect(prompt).toContain('- Environment: Chrome 137 on macOS')
    expect(prompt).toContain('- Screenshot: https://tack.example.com/api/screenshots/pk_abc/pin_1')
    expect(prompt).toContain('do not deploy')
  })

  it('omits absent metadata and anonymizes missing reviewer names', () => {
    const prompt = buildAgentPrompt(group, [
      makePin({
        reviewerName: null,
        comment: null,
        selector: null,
        xpath: null,
        elementText: null,
        browser: null,
        os: null,
        screenshotUrl: null,
      }),
    ])

    expect(prompt).toContain('### Pin 1 — Anonymous')
    expect(prompt).not.toContain('- Selector:')
    expect(prompt).not.toContain('- XPath:')
    expect(prompt).not.toContain('- Element text:')
    expect(prompt).not.toContain('- Environment:')
    expect(prompt).not.toContain('- Screenshot:')
  })

  it('appends the pin deeplink with & when the url has a query', () => {
    const prompt = buildAgentPrompt(group, [
      makePin({ url: 'https://preview.example.com/pricing?plan=solo' }),
    ])

    expect(prompt).toContain(
      'https://preview.example.com/pricing?plan=solo&pin=pin_1',
    )
  })
})
