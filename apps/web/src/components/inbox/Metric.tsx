

export function Metric({
  label,
  value,
  tone = 'ink',
}: {
  label: string
  value: string
  tone?: 'ink' | 'accent' | 'pin' | 'signal' | 'danger'
}) {
  const toneClass = {
    ink: 'text-[var(--ink)]',
    accent: 'text-[var(--accent)]',
    pin: 'text-[var(--pin)]',
    signal: 'text-[var(--signal)]',
    danger: 'text-[var(--danger)]',
  }[tone]

  return (
    <div className="border-b border-[var(--line)] p-3 md:border-r md:border-b-0 md:last:border-r-0">
      <p className="text-[11px] font-mono uppercase text-[var(--ink-soft)]">
        {label}
      </p>
      <p className={`mt-1 truncate text-sm font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  )
}
