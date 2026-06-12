import type { PinPlacement } from '@tack/shared'

export interface PinAnchorData {
  id: string
  xPct: number
  yPct: number
  tackId?: string | null
  selector?: string | null
  xpath?: string | null
}

export interface ResolvedPinPosition {
  placement: PinPlacement
  xPct: number
  yPct: number
}

export function resolvePinPlacement(pin: PinAnchorData): ResolvedPinPosition {
  const fallback = {
    placement: 'approximate' as PinPlacement,
    xPct: pin.xPct,
    yPct: pin.yPct,
  }

  if (pin.tackId) {
    const el = document.querySelector(
      `[data-tack-id="${CSS.escape(pin.tackId)}"]`,
    )
    if (el instanceof HTMLElement) {
      return { placement: 'anchored', ...positionFromElement(el) }
    }
  }

  if (pin.selector) {
    try {
      const el = document.querySelector(pin.selector)
      if (el instanceof HTMLElement) {
        return { placement: 'anchored', ...positionFromElement(el) }
      }
    } catch {
      // invalid selector
    }
  }

  if (pin.xpath) {
    try {
      const result = document.evaluate(
        pin.xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      )
      if (result.singleNodeValue instanceof HTMLElement) {
        return {
          placement: 'approximate',
          ...positionFromElement(result.singleNodeValue),
        }
      }
    } catch {
      // invalid xpath
    }
  }

  const hadAnchor = Boolean(pin.tackId || pin.selector || pin.xpath)
  return {
    placement: hadAnchor ? 'lost' : fallback.placement,
    xPct: pin.xPct,
    yPct: pin.yPct,
  }
}

function positionFromElement(el: HTMLElement): { xPct: number; yPct: number } {
  const rect = el.getBoundingClientRect()
  const docH = document.documentElement.scrollHeight || 1
  const docW = document.documentElement.scrollWidth || 1
  const centerY = rect.top + window.scrollY + rect.height / 2
  const centerX = rect.left + window.scrollX + rect.width / 2
  return {
    xPct: (centerX / docW) * 100,
    yPct: (centerY / docH) * 100,
  }
}
