import { Link } from '@tanstack/react-router'
import { type PlacementDisplay } from '@tack/shared'
import { ChevronRight } from 'lucide-react'
import { getTimeAgo } from '#/lib/pin-display'
import { placementLabel } from '#/lib/placement-display'
import { Pin } from '#/components/brand/Pin'
import { StatusPill } from '#/components/ui/StatusPill'

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
    placement: PlacementDisplay
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
        <Pin n={index + 1} />
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
          {pin.aiLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--accent-2)]">{pin.aiLabel}</span>
            </>
          )}
          {pin.aiPriority && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--warn)]">
                {pin.aiPriority.replaceAll('_', ' ')}
              </span>
            </>
          )}
          {pin.placement.verified && placementLabel(pin.placement.state) && (
            <>
              <span aria-hidden="true">·</span>
              <span
                className={
                  placementLabel(pin.placement.state) === 'lost'
                    ? 'text-[var(--danger)]'
                    : undefined
                }
              >
                {placementLabel(pin.placement.state)}
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
        <StatusPill tone={pin.status === 'resolved' ? 'resolved' : 'open'}>
          {pin.status}
        </StatusPill>
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

