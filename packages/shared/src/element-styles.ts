// A fixed, curated set of computed style properties captured from the
// clicked element. Deliberately not an open-ended style/DOM dump: this
// whitelist keeps the payload small and free of page markup or content,
// while still giving a reviewer or agent enough to see what's visually
// wrong without reproducing the page.
export const ELEMENT_STYLE_KEYS = [
  'color',
  'backgroundColor',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'padding',
  'margin',
  'borderRadius',
  'boxShadow',
  'opacity',
  'textAlign',
  'display',
] as const

export type ElementStyleKey = (typeof ELEMENT_STYLE_KEYS)[number]
export type ElementStyles = Partial<Record<ElementStyleKey, string>>

const MAX_VALUE_LENGTH = 200

export function sanitizeElementStyles(input: unknown): ElementStyles | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null

  const out: ElementStyles = {}
  for (const key of ELEMENT_STYLE_KEYS) {
    const value = (input as Record<string, unknown>)[key]
    if (typeof value === 'string' && value.length > 0) {
      out[key] = value.slice(0, MAX_VALUE_LENGTH)
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

export function parseElementStylesJson(input: unknown): string | null {
  if (typeof input !== 'string' || input.length === 0) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return null
  }
  const sanitized = sanitizeElementStyles(parsed)
  return sanitized ? JSON.stringify(sanitized) : null
}
