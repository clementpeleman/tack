import { useEffect, useRef, useState } from 'preact/hooks'
import { resolvePinPlacement } from '../lib/placement'

interface Pin {
  id: string
  xPct: number
  yPct: number
  status: string
  reviewerId: string
  tackId?: string | null
  selector?: string | null
  xpath?: string | null
}

interface PinOverlayProps {
  pins: Pin[]
  reviewerId: string
  selectedPinId: string | null
  onSelectPin: (pinId: string | null) => void
}

export function PinOverlay({
  pins,
  reviewerId,
  selectedPinId,
  onSelectPin,
}: PinOverlayProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const [, bump] = useState(0)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    let raf = 0
    const sync = () => {
      layer.style.transform = `translateY(${-window.scrollY}px)`
      layer.style.height = `${document.documentElement.scrollHeight}px`
      bump((n) => n + 1)
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(sync)
    }

    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', sync)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', sync)
    }
  }, [pins])

  return (
    <div ref={layerRef} class="tack-pin-layer">
      {pins.map((pin, i) => {
        const resolved = resolvePinPlacement(pin)
        const isOwn = pin.reviewerId === reviewerId
        const isSelected = selectedPinId === pin.id
        const placementClass =
          resolved.placement === 'approximate'
            ? 'tack-pin--approx'
            : resolved.placement === 'lost'
              ? 'tack-pin--lost'
              : ''

        const title =
          resolved.placement === 'approximate'
            ? 'Approximate location'
            : resolved.placement === 'lost'
              ? 'Could not find element'
              : undefined

        return (
          <button
            key={pin.id}
            type="button"
            class={`tack-pin-hit ${isOwn ? 'tack-pin--own' : ''} ${isSelected ? 'tack-pin--selected' : ''} ${pin.status === 'resolved' ? 'tack-pin--resolved' : ''} ${placementClass}`}
            style={{
              left: `${resolved.xPct}%`,
              top: `${resolved.yPct}%`,
            }}
            title={title}
            onClick={(e) => {
              e.stopPropagation()
              onSelectPin(isSelected ? null : pin.id)
            }}
            aria-label={`Pin ${i + 1}${isOwn ? ', yours' : ''}${pin.status === 'resolved' ? ', resolved' : ''}${resolved.placement === 'lost' ? ', lost' : ''}`}
            aria-pressed={isSelected}
          >
            <span class="tack-pin" aria-hidden="true">
              <span>{i + 1}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
