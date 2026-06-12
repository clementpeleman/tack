import { Link } from '@tanstack/react-router'
import { type PinPlacement } from '@tack/shared'
import { ChevronRight } from 'lucide-react'
import { getTimeAgo } from '#/lib/pin-display'
import { placementLabel } from '#/lib/placement-display'

interface PinRowProps {
  projectId: string
  pin: {
    id: string
    reviewerName: string | null
    status: string
    comment: string | null
    replyCount: number
    createdAt: string
    screenshotPath: string | null
    aiLabel: string | null
    aiPriority: string | null
    aiSummary: string | null
    aiGroupTitle: string | null
    placement: PinPlacement
  }
  index: number
  projectKey: string
}

export function PinRow({ projectId, pin, index, projectKey }: PinRowProps) {
  const timeAgo = getTimeAgo(pin.createdAt)
  const screenshotUrl = pin.screenshotPath
    ? `/api/screenshots/${projectKey}/${pin.id}?projectKey=${encodeURIComponent(projectKey)}`
    : null

  return (
    <Link
      to="/projects/$id/pins/$pinId"
      params={{ id: projectId, pinId: pin.id }}
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-4 py-4 min-h-16 border-b border-[color-mix(in_oklab,var(--ink)_8%,transparent)] last:border-b-0 hover:bg-[var(--surface-2)] no-underline transition-colors sm:grid-cols-[auto_44px_minmax(0,1fr)_auto]"
    >
      <div className="pt-0.5">
        <div
          className="w-5 h-5 bg-[var(--pin)] rounded-[50%_50%_50%_4px] -rotate-45 flex items-center justify-center shrink-0 shadow-[0_1px_2px_color-mix(in_oklab,var(--pin)_34%,transparent)]"
          aria-hidden="true"
        >
          <span className="rotate-45 text-[9px] font-bold text-[var(--on-accent)] font-mono">
            {index + 1}
          </span>
        </div>
      </div>

      {screenshotUrl && (
        <img
          src={screenshotUrl}
          alt=""
          className="hidden sm:block w-11 h-11 rounded-md object-cover shrink-0 border border-[var(--line)] bg-[var(--surface-2)]"
        />
      )}

      {!screenshotUrl && (
        <div className="hidden sm:flex w-11 h-11 rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] items-center justify-center text-[10px] text-[var(--ink-soft)] font-mono">
          no img
        </div>
      )}

      <div className="min-w-0 space-y-1">
        {pin.comment ? (
          <p className="text-sm text-[var(--ink)] truncate font-medium">{pin.comment}</p>
        ) : (
          <p className="text-sm text-[var(--ink-mute)] italic truncate">
            No comment
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-soft)] font-mono">
          <span>{pin.reviewerName ?? 'Anonymous'}</span>
          <span aria-hidden="true">·</span>
          <span>{timeAgo}</span>
          {pin.replyCount > 1 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--ink-mute)]">
                {pin.replyCount - 1}{' '}
                {pin.replyCount - 1 === 1 ? 'reply' : 'replies'}
              </span>
            </>
          )}
          {pin.aiGroupTitle && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate max-w-48 text-[var(--accent)]">
                {pin.aiGroupTitle}
              </span>
            </>
          )}
        </div>
        {pin.aiSummary && (
          <p className="text-xs text-[var(--ink-mute)] line-clamp-2">
            {pin.aiSummary}
          </p>
        )}
      </div>

      <div className="hidden md:flex items-center justify-end gap-1.5 shrink-0">
        <StatusBadge status={pin.status} />
        {pin.aiLabel && <AiBadge value={pin.aiLabel} />}
        {pin.aiPriority && <PriorityBadge value={pin.aiPriority} />}
        {placementLabel(pin.placement) && (
          <PlacementBadge value={placementLabel(pin.placement)!} />
        )}
        <ChevronRight
          size={15}
          strokeWidth={1.7}
          className="ml-1 text-[var(--ink-soft)] transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-[var(--accent)]',
    resolved:
      'bg-[color-mix(in_oklab,var(--signal)_18%,transparent)] text-[var(--signal)]',
  }
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-mono uppercase shrink-0 ${styles[status] ?? styles.open}`}
    >
      {status}
    </span>
  )
}

function AiBadge({ value }: { value: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase shrink-0 bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent-2)]">
      {value}
    </span>
  )
}

function PlacementBadge({ value }: { value: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase shrink-0 bg-[color-mix(in_oklab,var(--ink)_10%,transparent)] text-[var(--ink-soft)]">
      {value}
    </span>
  )
}

function PriorityBadge({ value }: { value: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase shrink-0 bg-[color-mix(in_oklab,var(--warn)_14%,transparent)] text-[var(--warn)]">
      {value.replaceAll('_', ' ')}
    </span>
  )
}
