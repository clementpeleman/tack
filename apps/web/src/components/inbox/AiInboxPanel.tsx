import { AlertCircle, Check, Copy, ListChecks } from 'lucide-react'
import type { AiInboxSummary, AiGroupSummary } from '#/lib/inbox'

export function AiInboxPanel({
  entitled,
  entitlementReason,
  aiInbox,
  error,
  onCopyForAgent,
  agentPromptCopied,
}: {
  entitled: boolean
  entitlementReason: 'disabled' | 'missing_key' | null
  aiInbox: AiInboxSummary
  error: string | null
  onCopyForAgent: (group: AiGroupSummary) => void
  agentPromptCopied: boolean
}) {
  const latestRun = aiInbox.latestRun
  const runError = entitled
    ? formatAiError(error ?? latestRun?.error ?? null)
    : null

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink)]">
            <ListChecks size={14} strokeWidth={1.8} aria-hidden="true" />
            AI Inbox
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-mute)]">
            Labels, duplicates, priority and implementation briefs for review.
          </p>
        </div>
        {entitled && latestRun?.completedAt && (
          <span className="shrink-0 text-[10px] text-[var(--ink-soft)] font-mono">
            {formatTimeAgo(latestRun.completedAt)}
          </span>
        )}
      </div>

      <div className="mt-3 border-t border-[var(--line)] pt-3">
        {!entitled ? (
          <p className="text-xs leading-relaxed text-[var(--ink-mute)]">
            {entitlementReason === 'disabled' ? (
              <>
                AI Inbox is off. Set{' '}
                <code className="font-mono text-[var(--ink)]">TACK_AI_ENABLED=true</code>{' '}
                and{' '}
                <code className="font-mono text-[var(--ink)]">OPENAI_API_KEY</code>{' '}
                on the server to enable manual analysis. Pins can still be
                reviewed without AI.
              </>
            ) : (
              <>
                Add <code className="font-mono text-[var(--ink)]">OPENAI_API_KEY</code>{' '}
                on the server to enable manual analysis. Pins can still be
                reviewed without AI.
              </>
            )}
          </p>
        ) : latestRun ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <RunStatusBadge status={latestRun.status} />
            {latestRun.status !== 'failed' && (
              <span className="font-mono text-[var(--ink-mute)]">
                {latestRun.model} · {latestRun.pinCount} pins ·{' '}
                {latestRun.actualCostCents.toFixed(3)} cents
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-[var(--ink-mute)]">
            Run Analyze pins after feedback arrives. Analysis is manual and
            cost-capped.
          </p>
        )}

        {runError && (
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--danger)]">
            <AlertCircle
              size={13}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            {runError}
          </p>
        )}
      </div>

      {aiInbox.groups.length > 0 && entitled ? (
        <div className="mt-3 divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {aiInbox.groups.map((group) => (
            <div key={group.id} className="py-3">
              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono uppercase text-[var(--ink-soft)]">
                <span className="text-[var(--accent-2)]">
                  {formatBadgeText(group.type)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--warn)]">
                  {formatBadgeText(group.priority)}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {group.pinIds.length} pin{group.pinIds.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--ink)]">
                {group.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-mute)]">
                {group.summary}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-mono uppercase text-[var(--ink-soft)]">
                  Implementation brief
                </p>
                <button
                  type="button"
                  onClick={() => onCopyForAgent(group)}
                  className="inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-mute)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                >
                  {agentPromptCopied ? (
                    <Check size={11} strokeWidth={1.8} aria-hidden="true" />
                  ) : (
                    <Copy size={11} strokeWidth={1.8} aria-hidden="true" />
                  )}
                  {agentPromptCopied ? 'Copied' : 'Copy for agent'}
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
                {group.implementationBrief}
              </p>
            </div>
          ))}
        </div>
      ) : entitled ? (
        <p className="mt-3 border-t border-[var(--line)] pt-3 text-xs leading-relaxed text-[var(--ink-soft)]">
          No duplicate groups yet. Completed runs will show implementation
          briefs here.
        </p>
      ) : null}
    </section>
  )
}

export function formatBadgeText(value: string): string {
  return value.replaceAll('_', ' ')
}

export function formatAiError(message: string | null): string | null {
  if (!message) return null
  if (message.includes('OPENAI_API_KEY')) {
    return 'AI analysis needs an OpenAI key on the server. Add OPENAI_API_KEY, then run Analyze pins again.'
  }
  return message
}

export function RunStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed:
      'bg-[color-mix(in_oklab,var(--signal)_16%,transparent)] text-[var(--signal)]',
    failed:
      'bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-[var(--danger)]',
    running:
      'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]',
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${styles[status] ?? styles.running}`}
    >
      {formatBadgeText(status)}
    </span>
  )
}

export function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
