interface WidgetErrorBannerProps {
  message: string
  onDismiss?: () => void
}

export function WidgetErrorBanner({ message, onDismiss }: WidgetErrorBannerProps) {
  return (
    <div class="tack-error-banner" role="alert">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" class="tack-error-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  )
}
