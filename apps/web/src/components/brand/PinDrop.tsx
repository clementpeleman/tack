/** A bare collaborator pin head (cursor blob), pointing down-left. */
export function PinDrop({
  tone = 'var(--pin)',
  size = 20,
  className = '',
}: {
  tone?: string
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 rounded-[52%_52%_52%_3px] ${className}`}
      style={{
        width: size,
        height: size,
        background: tone,
        boxShadow: `0 0 0 2px var(--page), 0 6px 16px -4px color-mix(in oklab, ${tone} 55%, transparent)`,
      }}
    />
  )
}
