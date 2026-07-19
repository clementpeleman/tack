import type { ReactNode } from 'react'

type PinState = 'open' | 'resolved' | 'lost'

/** Tack's pin marker: the --pin teardrop rotated -45deg, optional mono number inside. */
export function Pin({
  n,
  size = 20,
  state = 'open',
  className = '',
}: {
  n?: ReactNode
  size?: number
  state?: PinState
  className?: string
}) {
  const bgClass = state === 'lost' ? 'bg-[var(--ink-soft)]' : 'bg-[var(--pin)]'
  const opacityClass = state === 'resolved' ? 'opacity-45' : state === 'lost' ? 'opacity-70' : ''
  const shadowClass =
    state === 'lost'
      ? 'shadow-none'
      : 'shadow-[0_1px_2px_color-mix(in_oklab,var(--pin)_34%,transparent)]'

  return (
    <div
      aria-hidden="true"
      className={`-rotate-45 flex shrink-0 items-center justify-center rounded-[50%_50%_50%_4px] ${bgClass} ${opacityClass} ${shadowClass} ${className}`}
      style={{ width: size, height: size }}
    >
      {n != null && (
        <span
          className="rotate-45 font-mono font-bold text-[var(--on-accent)]"
          style={{ fontSize: Math.round(size * 0.45) }}
        >
          {n}
        </span>
      )}
    </div>
  )
}
