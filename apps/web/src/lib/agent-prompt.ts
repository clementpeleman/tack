export interface AgentPromptGroup {
  title: string
  summary: string
  type: string
  priority: string
  implementationBrief: string
}

export interface AgentPromptPin {
  id: string
  url: string
  comment: string | null
  reviewerName: string | null
  selector: string | null
  xpath: string | null
  tackId: string | null
  elementText: string | null
  browser: string | null
  os: string | null
  xPct: number
  yPct: number
  viewportW: number
  viewportH: number
  screenshotUrl: string | null
}

const ELEMENT_TEXT_MAX = 120

function pinDeeplink(pin: AgentPromptPin): string {
  return `${pin.url}${pin.url.includes('?') ? '&' : '?'}pin=${pin.id}`
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

// One self-contained markdown block per Group: the implementation brief
// plus every pin's anchoring context, pasteable into any coding agent.
export function buildAgentPrompt(
  group: AgentPromptGroup,
  groupPins: AgentPromptPin[],
): string {
  const lines: string[] = [
    `# ${group.title}`,
    '',
    group.summary,
    '',
    `Type: ${group.type} · Priority: ${group.priority.replaceAll('_', ' ')}`,
    '',
    '## Implementation brief',
    '',
    group.implementationBrief,
    '',
    `## Feedback pins (${groupPins.length})`,
  ]

  groupPins.forEach((pin, index) => {
    lines.push('', `### Pin ${index + 1} — ${pin.reviewerName ?? 'Anonymous'}`, '')
    if (pin.comment) {
      lines.push(`> ${pin.comment.replaceAll('\n', '\n> ')}`, '')
    }
    lines.push(`- Page: ${pin.url}`)
    lines.push(`- Open in context: ${pinDeeplink(pin)}`)
    if (pin.tackId) lines.push(`- data-tack-id: \`${pin.tackId}\``)
    if (pin.selector) lines.push(`- Selector: \`${pin.selector}\``)
    if (pin.xpath) lines.push(`- XPath: \`${pin.xpath}\``)
    if (pin.elementText) {
      lines.push(`- Element text: "${truncate(pin.elementText, ELEMENT_TEXT_MAX)}"`)
    }
    lines.push(
      `- Position: ${pin.xPct.toFixed(1)}%, ${pin.yPct.toFixed(1)}% in a ${pin.viewportW}×${pin.viewportH} viewport`,
    )
    if (pin.browser || pin.os) {
      lines.push(`- Environment: ${[pin.browser, pin.os].filter(Boolean).join(' on ')}`)
    }
    if (pin.screenshotUrl) lines.push(`- Screenshot: ${pin.screenshotUrl}`)
  })

  lines.push(
    '',
    '## Scope',
    '',
    'Make the smallest change that addresses the implementation brief. Leave unrelated UI untouched, and do not deploy — open the work for review instead.',
  )

  return lines.join('\n')
}
