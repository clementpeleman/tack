export type PinPlacement = 'anchored' | 'approximate' | 'lost'

export interface PinAnchorMetadata {
  tackId?: string | null
  selector?: string | null
  xpath?: string | null
}

/** Dashboard heuristic when no widget has resolved the pin on the live page. */
export function inferPlacementFromMetadata(
  pin: PinAnchorMetadata,
): PinPlacement {
  if (pin.tackId || pin.selector) return 'anchored'
  if (pin.xpath) return 'approximate'
  return 'approximate'
}

export interface PlacementDisplay {
  state: PinPlacement
  /** True when a widget actually resolved this pin on the live preview page. */
  verified: boolean
}

/**
 * What the dashboard should show: the widget-reported state when available
 * (the truth, per KTD5), otherwise an unverified inference from stored anchors.
 */
export function resolvePlacementForDisplay(
  pin: PinAnchorMetadata & {
    placementState?: PinPlacement | null
    placementCheckedAt?: string | null
  },
): PlacementDisplay {
  if (pin.placementCheckedAt && pin.placementState) {
    return { state: pin.placementState, verified: true }
  }
  return { state: inferPlacementFromMetadata(pin), verified: false }
}
