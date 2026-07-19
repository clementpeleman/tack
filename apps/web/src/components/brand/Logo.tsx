interface LogoProps {
  size?: number
  wordmark?: boolean
  fontSize?: number
  className?: string
}

/** Tack's logomark (the --pin cursor-blob) with the lowercase wordmark. */
export function Logo({ size = 18, wordmark = true, fontSize, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 text-[var(--ink)] ${className}`}>
      <span
        aria-hidden="true"
        className="block shrink-0 rounded-[52%_52%_52%_3px]"
        style={{
          width: size,
          height: size,
          background: 'var(--pin)',
          boxShadow:
            '0 0 0 2px var(--page), 0 4px 10px -3px color-mix(in oklab, var(--pin) 55%, transparent)',
        }}
      />
      {wordmark && (
        <span
          className="font-semibold tracking-[-0.01em]"
          style={fontSize ? { fontSize } : undefined}
        >
          tack
        </span>
      )}
    </span>
  )
}
