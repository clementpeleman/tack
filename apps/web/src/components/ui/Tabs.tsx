import { Tabs as RadixTabs } from 'radix-ui'
import type { ReactNode } from 'react'

/**
 * Segmented control with real tablist semantics (roving tabindex, arrow
 * keys, aria-selected). Two voices: `segment` is the filled pill group used
 * for filters; `line` is the underlined row used at the top of a page.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  variant = 'segment',
  ariaLabel,
}: {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: ReactNode; count?: number }[]
  variant?: 'segment' | 'line'
  ariaLabel: string
}) {
  const list =
    variant === 'segment'
      ? 'inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-2)] p-0.5'
      : 'flex gap-1 border-b border-[var(--line)]'
  const trigger =
    variant === 'segment'
      ? 'min-h-8 rounded-full px-3 font-mono text-[11px] uppercase tracking-wide text-[var(--ink-soft)] outline-none transition-colors hover:text-[var(--ink-mute)] data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]'
      : '-mb-px min-h-11 border-b-2 border-transparent px-3 font-mono text-[11px] uppercase tracking-wide text-[var(--ink-soft)] outline-none transition-colors hover:text-[var(--ink-mute)] data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]'

  return (
    <RadixTabs.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <RadixTabs.List className={list} aria-label={ariaLabel}>
        {items.map((item) => (
          <RadixTabs.Trigger key={item.value} value={item.value} className={trigger}>
            {item.label}
            {item.count != null && (
              <span className="ml-1.5 text-[var(--ink-soft)]">{item.count}</span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  )
}
