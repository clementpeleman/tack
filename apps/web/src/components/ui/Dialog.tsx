import { AlertDialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { buttonClasses } from '#/components/ui/Button'

/**
 * Confirmation dialog on Radix AlertDialog: focus is trapped, Escape and the
 * overlay do not dismiss a destructive question by accident, and the title
 * and description are wired to aria for screen readers.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  busy?: boolean
  onConfirm: () => void | Promise<void>
  /** Optional extra content between description and actions (e.g. a confirm field). */
  children?: ReactNode
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--ink)_40%,transparent)]" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-[var(--line)] bg-[var(--page)] p-5 shadow-[var(--shadow-modal)] outline-none">
          <AlertDialog.Title className="font-display text-[18px] font-bold leading-tight text-[var(--ink)]">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-[var(--ink-mute)]">
              {description}
            </AlertDialog.Description>
          )}
          {children && <div className="mt-3">{children}</div>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button type="button" className={buttonClasses('secondary', 'sm')} disabled={busy}>
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                className={buttonClasses(tone === 'danger' ? 'danger' : 'primary', 'sm')}
                disabled={busy}
                onClick={(event) => {
                  // Keep the dialog open while the action runs; the caller
                  // closes it (or shows an error) when done.
                  event.preventDefault()
                  void onConfirm()
                }}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
