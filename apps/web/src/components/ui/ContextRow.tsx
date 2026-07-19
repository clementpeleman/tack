import type { ReactNode } from 'react'

interface ContextRowProps {
  label: string
  value: ReactNode
  last?: boolean
}

/** Key/value row in a context panel — hairline-divided, label left, value right. Wrap a list of these in a <dl>. */
export function ContextRow({ label, value, last = false }: ContextRowProps) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 ${last ? '' : 'border-b border-[var(--line)]'}`}
    >
      <dt className="m-0 text-xs text-[var(--ink-mute)]">{label}</dt>
      <dd className="m-0 text-right text-sm text-[var(--ink)]">{value}</dd>
    </div>
  )
}
