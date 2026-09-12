import { DropdownMenu } from 'radix-ui'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

/**
 * Tokened wrapper over Radix DropdownMenu. Radix supplies focus handling,
 * arrow-key navigation, typeahead, Escape and aria roles; this file supplies
 * Tack's voice: flat surface, hairline border, no shadow at rest except the
 * floating panel itself.
 */

const CONTENT =
  'z-50 min-w-[200px] rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-float)] outline-none data-[side=bottom]:animate-in data-[side=top]:animate-in'

const ITEM =
  'flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-md px-2.5 text-sm text-[var(--ink)] outline-none data-[highlighted]:bg-[var(--surface-2)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45'

export function Menu({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  triggerClassName = '',
  ariaLabel,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  triggerClassName?: string
  ariaLabel?: string
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={triggerClassName} aria-label={ariaLabel}>
          {trigger}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={CONTENT} align={align} side={side} sideOffset={6} collisionPadding={8}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function MenuItem({
  children,
  onSelect,
  disabled,
  tone = 'default',
  hint,
}: {
  children: ReactNode
  onSelect?: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
  hint?: string
}) {
  return (
    <DropdownMenu.Item
      className={`${ITEM} ${tone === 'danger' ? 'text-[var(--danger)]' : ''}`}
      onSelect={onSelect}
      disabled={disabled}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="font-mono text-[11px] text-[var(--ink-soft)]">{hint}</span>}
    </DropdownMenu.Item>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 font-mono text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
      {children}
    </DropdownMenu.Label>
  )
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-[var(--line)]" />
}

/** Exclusive choice inside a menu (e.g. theme). Radix keeps the radio semantics. */
export function MenuRadioGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <DropdownMenu.RadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
      {options.map((option) => (
        <DropdownMenu.RadioItem key={option.value} value={option.value} className={ITEM}>
          <span className="flex w-4 items-center justify-center">
            <DropdownMenu.ItemIndicator>
              <Check size={13} strokeWidth={2} aria-hidden="true" />
            </DropdownMenu.ItemIndicator>
          </span>
          {option.label}
        </DropdownMenu.RadioItem>
      ))}
    </DropdownMenu.RadioGroup>
  )
}
