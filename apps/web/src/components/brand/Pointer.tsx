import { PinDrop } from './PinDrop'

/** A named collaborator pointer: a tinted name pill + a cursor blob, mirroring collaborator-cursor UI. */
export function Pointer({
  label,
  tone = 'var(--pt-green)',
  flip = false,
}: {
  label: string
  tone?: string
  flip?: boolean
}) {
  const pill = (
    <span
      key="p"
      className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none"
      style={{
        background: `color-mix(in oklab, ${tone} 15%, var(--surface))`,
        color: `color-mix(in oklab, ${tone} 68%, var(--ink))`,
      }}
    >
      {label}
    </span>
  )
  const blob = (
    <span key="b" className="shrink-0">
      <PinDrop tone={tone} size={16} />
    </span>
  )
  return <div className="inline-flex items-center gap-1.5">{flip ? [blob, pill] : [pill, blob]}</div>
}
