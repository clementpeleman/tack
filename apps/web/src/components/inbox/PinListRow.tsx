import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { Checkbox } from 'radix-ui'
import type { PlacementDisplay } from '@tack/shared'
import { getTimeAgo } from '#/lib/pin-display'

export interface PinListRowData {
  id: string
  url: string
  reviewerName: string | null
  status: string
  comment: string | null
  replyCount: number
  createdAt: string
  screenshotPath: string | null
  xPct: number
  yPct: number
  viewportYPct: number | null
  placement: PlacementDisplay
  aiGroupTitle: string | null
}

interface PinListRowProps {
  projectId: string
  projectKey: string
  pin: PinListRowData
  number: number
  selected: boolean
  checked: boolean
  selecting: boolean
  onSelect: (id: string) => void
  onToggleChecked: (id: string, checked: boolean) => void
}

/**
 * One pin in the list. The comment is the row; reviewer, page and time sit
 * under it in one muted line. Status is typographic: a dot for open, a
 * strike-through and a check for resolved, `lost` in mono when the element
 * is gone. No pill.
 */
export function PinListRow({
  projectId,
  projectKey,
  pin,
  number,
  selected,
  checked,
  selecting,
  onSelect,
  onToggleChecked,
}: PinListRowProps) {
  const resolved = pin.status === 'resolved'
  const lost = pin.placement.verified && pin.placement.state === 'lost'
  const thumb = pin.screenshotPath
    ? `/api/screenshots/${projectKey}/${pin.id}?projectKey=${encodeURIComponent(projectKey)}`
    : null
  const markerTop = pin.viewportYPct ?? pin.yPct

  return (
    <li
      data-pin-id={pin.id}
      className={`group relative flex items-stretch border-b border-[var(--line)] last:border-b-0 ${
        selected ? 'bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]' : 'hover:bg-[var(--surface-2)]'
      }`}
    >
      {/* Selection checkbox: visible on hover, when checked, or while selecting. */}
      <div
        className={`flex w-9 shrink-0 items-center justify-center ${
          checked || selecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        }`}
      >
        <Checkbox.Root
          checked={checked}
          onCheckedChange={(v) => onToggleChecked(pin.id, v === true)}
          aria-label={`Select pin ${number}`}
          className="flex h-4 w-4 items-center justify-center rounded border border-[var(--ink-soft)] bg-[var(--page)] data-[state=checked]:border-[var(--accent)] data-[state=checked]:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Checkbox.Indicator>
            <Check size={11} strokeWidth={3} className="text-[var(--on-accent)]" aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Root>
      </div>

      <Link
        to="/projects/$id/pins/$pinId"
        params={{ id: projectId, pinId: pin.id }}
        onClick={(event) => {
          // Wide screens: select into the side pane instead of navigating.
          if (window.matchMedia('(min-width: 1024px)').matches && !event.metaKey && !event.ctrlKey) {
            event.preventDefault()
            onSelect(pin.id)
          }
        }}
        aria-current={selected ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 no-underline outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      >
        <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface-2)]">
          {thumb ? (
            <>
              <img src={thumb} alt="" className="block h-full w-full object-cover" loading="lazy" />
              <span
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--page)] bg-[var(--pin)]"
                style={{ left: `${pin.xPct}%`, top: `${markerTop}%` }}
                aria-hidden="true"
              />
            </>
          ) : (
            <span className="flex h-full w-full items-center justify-center font-mono text-[11px] text-[var(--ink-soft)]">
              {number}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm ${
              resolved
                ? 'text-[var(--ink-mute)] line-through decoration-[var(--ink-soft)]'
                : 'font-medium text-[var(--ink)]'
            }`}
          >
            {pin.comment ?? <span className="italic font-normal text-[var(--ink-mute)]">No comment</span>}
          </span>
          <span className="mt-0.5 block truncate text-meta">
            {pin.reviewerName ?? 'Anonymous'} · <span className="text-[var(--ink-mute)]">{pin.url}</span> · {getTimeAgo(pin.createdAt)}
            {pin.replyCount > 1 && ` · ${pin.replyCount - 1} ${pin.replyCount - 1 === 1 ? 'reply' : 'replies'}`}
            {lost && <span className="text-[var(--danger)]"> · lost</span>}
            {pin.aiGroupTitle && <span className="text-[var(--accent)]"> · {pin.aiGroupTitle}</span>}
          </span>
        </span>

        <span className="flex w-5 shrink-0 items-center justify-center" aria-hidden="true">
          {resolved ? (
            <Check size={14} strokeWidth={2.2} className="text-[var(--signal)]" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          )}
        </span>
        <span className="sr-only">{resolved ? 'Resolved' : 'Open'}</span>
      </Link>
    </li>
  )
}
