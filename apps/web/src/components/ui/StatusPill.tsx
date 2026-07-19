import type { ReactNode } from 'react'

type StatusTone = 'open' | 'resolved' | 'ai' | 'priority' | 'neutral'

const TONE_CLASSES: Record<StatusTone, string> = {
  open: 'bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-[var(--accent)]',
  resolved:
    'bg-[color-mix(in_oklab,var(--signal)_18%,transparent)] text-[var(--signal)]',
  ai: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent-2)]',
  priority:
    'bg-[color-mix(in_oklab,var(--warn)_14%,transparent)] text-[var(--warn)]',
  neutral: 'bg-[color-mix(in_oklab,var(--ink)_10%,transparent)] text-[var(--ink-soft)]',
}

interface StatusPillProps {
  tone?: StatusTone
  children: ReactNode
  className?: string
}

/** Mono-uppercase status pill: tinted same-hue background + text. Max one per row. */
export function StatusPill({ tone = 'open', children, className = '' }: StatusPillProps) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-mono font-medium uppercase ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
