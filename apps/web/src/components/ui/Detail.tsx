import type { ReactNode } from 'react'

interface DetailProps {
  label: string
  value: ReactNode
  mono?: boolean
}

/** Stacked metadata cell: mono uppercase label over a truncating soft value. */
export function Detail({ label, value, mono = false }: DetailProps) {
  return (
    <div className="min-w-0">
      <span className="mb-0.5 block font-mono text-[11px] uppercase text-[var(--ink-mute)]">
        {label}
      </span>
      <span
        className={`block truncate text-xs text-[var(--ink-soft)] ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}
