import { useEscapeKey } from '../lib/useEscapeKey'

interface PinModeProps {
  onPlace: (x: number, y: number, el: HTMLElement | null) => void
  onCancel: () => void
}

export function PinMode({ onPlace, onCancel }: PinModeProps) {
  useEscapeKey(onCancel)

  const handleClick = (e: MouseEvent) => {
    const overlay = e.currentTarget as HTMLElement
    overlay.style.pointerEvents = 'none'

    const widgetHost = document.getElementById('tack-widget-host')
    if (widgetHost) widgetHost.style.pointerEvents = 'none'

    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null

    overlay.style.pointerEvents = ''
    if (widgetHost) widgetHost.style.pointerEvents = ''

    const xPct = (e.clientX / window.innerWidth) * 100
    const yPct = ((e.clientY + window.scrollY) / document.documentElement.scrollHeight) * 100

    onPlace(xPct, yPct, target)
  }

  return (
    <>
      <div class="tack-pin-hint" aria-hidden="true">
        Click an element to comment · Esc to cancel
      </div>
      <div
        class="tack-crosshair-overlay"
        onClick={handleClick}
        role="presentation"
      />
    </>
  )
}
