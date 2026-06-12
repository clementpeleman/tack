import {
  aiLabels,
  aiPriorities,
  type AiGroupResult,
  type AiInboxResult,
  type AiLabel,
  type AiPinInsight,
  type AiPriority,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid AI output: ${field} must be a non-empty string`)
  }
  return value.trim()
}

function asLabel(value: unknown): AiLabel {
  if (typeof value === 'string' && aiLabels.includes(value as AiLabel)) {
    return value as AiLabel
  }
  throw new Error(`Invalid AI output: unsupported label "${String(value)}"`)
}

function asPriority(value: unknown): AiPriority {
  if (
    typeof value === 'string' &&
    aiPriorities.includes(value as AiPriority)
  ) {
    return value as AiPriority
  }
  throw new Error(`Invalid AI output: unsupported priority "${String(value)}"`)
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid AI output: ${field} must be a boolean`)
  }
  return value
}

export function parseAiInboxResult(
  raw: string,
  allowedPinIds: string[],
): AiInboxResult {
  const allowed = new Set(allowedPinIds)
  const parsed: unknown = JSON.parse(raw)

  if (!isRecord(parsed)) {
    throw new Error('Invalid AI output: root must be an object')
  }
  if (!Array.isArray(parsed.pins) || !Array.isArray(parsed.groups)) {
    throw new Error('Invalid AI output: pins and groups must be arrays')
  }

  const pins: AiPinInsight[] = parsed.pins.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Invalid AI output: pins[${index}] must be an object`)
    }

    const pinId = asNonEmptyString(item.pinId, `pins[${index}].pinId`)
    if (!allowed.has(pinId)) {
      throw new Error(`Invalid AI output: unknown pinId "${pinId}"`)
    }

    return {
      pinId,
      label: asLabel(item.label),
      priority: asPriority(item.priority),
      summary: asNonEmptyString(item.summary, `pins[${index}].summary`),
      ambiguous: asBoolean(item.ambiguous, `pins[${index}].ambiguous`),
    }
  })

  const seenPins = new Set<string>()
  for (const pin of pins) {
    if (seenPins.has(pin.pinId)) {
      throw new Error(`Invalid AI output: duplicate insight for ${pin.pinId}`)
    }
    seenPins.add(pin.pinId)
  }

  const groups: AiGroupResult[] = parsed.groups.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Invalid AI output: groups[${index}] must be an object`)
    }
    if (!Array.isArray(item.pinIds)) {
      throw new Error(`Invalid AI output: groups[${index}].pinIds must be an array`)
    }

    const pinIds = item.pinIds.map((value, pinIndex) => {
      const pinId = asNonEmptyString(
        value,
        `groups[${index}].pinIds[${pinIndex}]`,
      )
      if (!allowed.has(pinId)) {
        throw new Error(`Invalid AI output: unknown pinId "${pinId}"`)
      }
      return pinId
    })

    return {
      title: asNonEmptyString(item.title, `groups[${index}].title`),
      summary: asNonEmptyString(item.summary, `groups[${index}].summary`),
      type: asLabel(item.type),
      priority: asPriority(item.priority),
      implementationBrief: asNonEmptyString(
        item.implementationBrief,
        `groups[${index}].implementationBrief`,
      ),
      pinIds: [...new Set(pinIds)],
    }
  })

  return { pins, groups }
}
