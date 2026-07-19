/** Muted skeleton line for faux preview / inbox mocks. */
export function Bar({ width = '60%' }: { width?: string }) {
  return (
    <span
      aria-hidden="true"
      className="block h-2 rounded-full bg-[var(--surface-3)]"
      style={{ width }}
    />
  )
}
