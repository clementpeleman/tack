interface LauncherProps {
  active: boolean
  pinCount: number
  onClick: () => void
}

export function Launcher({ active, pinCount, onClick }: LauncherProps) {
  return (
    <>
      <button
        class={`tack-launcher ${active ? 'active' : ''}`}
        onClick={onClick}
        aria-label={active ? 'Exit pin mode' : 'Enter pin mode'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {active ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <>
              <circle cx="12" cy="8" r="3" fill="currentColor" stroke="none" />
              <path d="M12 2L17 8C17 11 14 13.5 12 13.5V22" />
            </>
          )}
        </svg>
      </button>
      {pinCount > 0 && !active && (
        <div class="tack-pin-count">{pinCount}</div>
      )}
    </>
  )
}
