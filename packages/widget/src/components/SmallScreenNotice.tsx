interface SmallScreenNoticeProps {
  onDismiss: () => void
}

/**
 * Shown instead of the pin UI on viewports narrower than the minimum. The
 * widget used to mount nothing at all here, which reads as "broken" to a
 * reviewer on a tablet; one sentence and a close button is enough.
 */
export function SmallScreenNotice({ onDismiss }: SmallScreenNoticeProps) {
  return (
    <div class="tack-small-screen" role="status">
      <span>Feedback pins need a wider screen. Open this page on a laptop to comment.</span>
      <button type="button" aria-label="Dismiss" onClick={onDismiss}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
