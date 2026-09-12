import { useState } from 'react'
import { ChevronRight, Copy } from 'lucide-react'
import type { AiGroupSummary, AiInboxSummary } from '#/lib/inbox'

/**
 * Groups from the latest analysis, above the list. Clicking a group filters
 * the list to its pins; the brief itself is read per pin in the panel.
 * Nothing about models, tokens or keys is shown here.
 */
export function AiGroups({
  aiInbox,
  activeGroupId,
  onFilterGroup,
  onCopyForAgent,
  copiedGroupId,
  error,
}: {
  aiInbox: AiInboxSummary
  activeGroupId: string | null
  onFilterGroup: (groupId: string | null) => void
  onCopyForAgent: (group: AiGroupSummary) => void
  copiedGroupId: string | null
  error: string | null
}) {
  const [open, setOpen] = useState(true)
  const run = aiInbox.latestRun
  if (!run && !error) return null

  const groups = aiInbox.groups
  const pinTotal = groups.reduce((n, g) => n + g.pinIds.length, 0)

  return (
    <section className="mb-3" aria-label="Analysis groups">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 py-1.5 text-left text-section focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <ChevronRight
          size={14}
          strokeWidth={2}
          className={`text-[var(--ink-soft)] transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        />
        {groups.length === 0 ? 'Analysis' : `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`}
        <span className="text-meta">
          {run?.status === 'running'
            ? 'running…'
            : run?.status === 'failed'
              ? 'failed'
              : groups.length > 0
                ? `${pinTotal} pins · ${run ? getRunAge(run.completedAt ?? run.createdAt) : ''}`
                : run
                  ? 'no related pins found'
                  : ''}
        </span>
      </button>

      {open && (
        <div className="mt-1 border-t border-[var(--line)]">
          {error && (
            <p className="py-2 text-xs text-[var(--danger)]" role="alert">{error}</p>
          )}
          {run?.status === 'failed' && !error && (
            <p className="py-2 text-xs text-[var(--danger)]" role="alert">
              The last analysis failed. Run it again; nothing was changed.
            </p>
          )}
          <ul className="m-0 list-none p-0">
            {groups.map((group) => {
              const active = group.id === activeGroupId
              return (
                <li key={group.id} className="flex items-center gap-2 border-b border-[var(--line)] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onFilterGroup(active ? null : group.id)}
                    aria-pressed={active}
                    className={`flex min-w-0 flex-1 items-baseline gap-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
                      active ? 'text-[var(--accent)]' : 'text-[var(--ink)] hover:text-[var(--accent)]'
                    }`}
                  >
                    <span className="truncate text-sm">{group.title}</span>
                    <span className="shrink-0 text-meta">{group.pinIds.length} {group.pinIds.length === 1 ? 'pin' : 'pins'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopyForAgent(group)}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 font-mono text-[11px] text-[var(--ink-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    aria-label={`Copy the brief for "${group.title}" for a coding agent`}
                  >
                    <Copy size={12} strokeWidth={1.8} aria-hidden="true" />
                    {copiedGroupId === group.id ? 'copied' : 'for agent'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

function getRunAge(dateStr: string): string {
  const then = new Date(dateStr.includes('T') ? dateStr : `${dateStr.replace(' ', 'T')}Z`).getTime()
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
