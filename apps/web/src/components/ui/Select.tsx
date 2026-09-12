import { Select as RadixSelect } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'

/**
 * Compact select for filters (page, reviewer, sort). Radix handles the
 * listbox semantics and keyboard; the trigger reads as a quiet mono label
 * rather than a form field, because these sit in a toolbar.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  ariaLabel,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  /** Shown before the value, e.g. "Page". */
  label?: string
  ariaLabel: string
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 font-mono text-[11px] uppercase tracking-wide text-[var(--ink-mute)] outline-none transition-colors hover:text-[var(--ink)] data-[state=open]:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        {label && <span className="text-[var(--ink-soft)]">{label}:</span>}
        <RadixSelect.Value />
        <RadixSelect.Icon>
          <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 min-w-[180px] rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-float)]"
        >
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className="flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-md px-2.5 text-sm text-[var(--ink)] outline-none data-[highlighted]:bg-[var(--surface-2)]"
              >
                <span className="flex w-4 items-center justify-center">
                  <RadixSelect.ItemIndicator>
                    <Check size={13} strokeWidth={2} aria-hidden="true" />
                  </RadixSelect.ItemIndicator>
                </span>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
