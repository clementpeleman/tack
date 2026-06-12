export type PinPlacement = 'anchored' | 'approximate' | 'lost'

export interface PinAnchorMetadata {
  tackId?: string | null
  selector?: string | null
  xpath?: string | null
}

/** Dashboard heuristic when DOM is unavailable. */
export function inferPlacementFromMetadata(
  pin: PinAnchorMetadata,
): PinPlacement {
  if (pin.tackId || pin.selector) return 'anchored'
  if (pin.xpath) return 'approximate'
  return 'approximate'
}
