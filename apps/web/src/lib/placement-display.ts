import type { PinPlacement } from '@tack/shared'

export function placementLabel(placement: PinPlacement): string | null {
  if (placement === 'anchored') return null
  if (placement === 'approximate') return 'approx'
  return 'lost'
}
