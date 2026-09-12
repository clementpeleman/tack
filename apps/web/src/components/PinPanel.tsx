import { useEffect, useId, useRef, useState } from 'react'
import { resolvePlacementForDisplay } from '@tack/shared'
import { ExternalLink, MoreHorizontal, X } from 'lucide-react'
import { buildPreviewLink, getTimeAgo, parseBrowser } from '#/lib/pin-display'
import type { EnrichedReply } from '#/lib/pins'
import { Button, buttonClasses } from '#/components/ui/Button'
import { ConfirmDialog } from '#/components/ui/Dialog'
import { Menu, MenuItem } from '#/components/ui/Menu'

/** What the panel needs from a pin; both the inbox loader and pin detail supply it. */
export interface PinPanelData {
  id: string
  url: string
  reviewerName: string | null
  status: string
  selector: string | null
  xpath: string | null
  tackId: string | null
  elementText: string | null
  elementStyles: string | null
  browser: string | null
  os: string | null
  screenshotPath: string | null
  xPct: number
  yPct: number
  viewportYPct: number | null
  viewportW: number
  viewportH: number
  placementState: 'anchored' | 'approximate' | 'lost' | null
  placementCheckedAt: string | null
  createdAt: string
  comment: string | null
  replies: EnrichedReply[]
  aiSummary: string | null
  aiAmbiguous: boolean
  aiGroupTitle: string | null
  aiGroupBrief: string | null
}

interface PinPanelProps {
  previewUrl: string
  projectKey: string
  pin: PinPanelData
  /** Pin number as the widget shows it on the page (1-based, oldest first). */
  number?: number
  variant?: 'pane' | 'page'
  onClose?: () => void
  onUpdateStatus: (status: 'open' | 'resolved') => Promise<void>
  onAddReply: (body: string) => Promise<void>
  onDelete: () => Promise<void>
  /** Exposed so the inbox can wire `a` (answer) to the composer. */
  composerRef?: React.RefObject<HTMLTextAreaElement | null>
}

function parseElementStyles(value: string | null): Record<string, string> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * One pin, in full: the reviewer's words as the title, the screenshot with
 * the marker as the proof, the thread, and the context the owner reads only
 * when "where do you mean?" comes up. Used as the right pane of the inbox and
 * as the body of the pin route on small screens.
 */
export function PinPanel({
  previewUrl,
  projectKey,
  pin,
  number,
  variant = 'pane',
  onClose,
  onUpdateStatus,
  onAddReply,
  onDelete,
  composerRef,
}: PinPanelProps) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState<'reply' | 'status' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const localComposer = useRef<HTMLTextAreaElement>(null)
  const composer = composerRef ?? localComposer
  const replyId = useId()

  // Reset transient state when the selected pin changes.
  useEffect(() => {
    setReply('')
    setError(null)
    setZoomed(false)
    setConfirmDelete(false)
  }, [pin.id])

  const placement = resolvePlacementForDisplay({
    selector: pin.selector,
    xpath: pin.xpath,
    tackId: pin.tackId,
    placementState: pin.placementState,
    placementCheckedAt: pin.placementCheckedAt,
  })
  const lost = placement.verified && placement.state === 'lost'
  const elementStyles = parseElementStyles(pin.elementStyles)
  const previewLink = buildPreviewLink(previewUrl, pin.url, pin.id)
  const markerTop = pin.viewportYPct ?? pin.yPct
  const screenshotUrl = pin.screenshotPath
    ? `/api/screenshots/${projectKey}/${pin.id}?projectKey=${encodeURIComponent(projectKey)}`
    : null
  const resolved = pin.status === 'resolved'
  const thread = pin.replies.slice(1)

  const run = async (kind: 'reply' | 'status' | 'delete', fn: () => Promise<void>, done: string) => {
    setBusy(kind)
    setError(null)
    try {
      await fn()
      setLive(done)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  const submitReply = () => {
    const body = reply.trim()
    if (!body) return
    void run('reply', async () => {
      await onAddReply(body)
      setReply('')
    }, 'Reply sent')
  }

  return (
    <article
      className={`flex min-h-0 flex-col ${variant === 'pane' ? 'h-full' : ''}`}
      aria-labelledby={`${replyId}-title`}
    >
      <div className="sr-only" role="status" aria-live="polite">{live}</div>

      {/* Header */}
      <header className="flex items-start gap-3 pb-3">
        <div className="min-w-0 flex-1">
          <h2
            id={`${replyId}-title`}
            className={`font-display text-[18px] font-bold leading-snug text-[var(--ink)] ${resolved ? 'text-[var(--ink-mute)] line-through decoration-[var(--ink-soft)]' : ''}`}
          >
            {pin.comment ?? <span className="italic text-[var(--ink-mute)]">No comment</span>}
          </h2>
          <p className="mt-1 text-meta">
            {number != null && <span className="text-[var(--accent)]">#{number}</span>}
            {number != null && ' · '}
            {pin.reviewerName ?? 'Anonymous'} · {getTimeAgo(pin.createdAt)}
            {pin.selector && (
              <>
                {' · '}
                <span className="text-[var(--ink-mute)]">{pin.selector}</span>
              </>
            )}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--ink-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close pin"
          >
            <X size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {/* Screenshot */}
        {screenshotUrl ? (
          <figure className="m-0">
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              className="relative block w-full overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label={zoomed ? 'Show the whole screenshot' : 'Zoom in on the pinned element'}
              aria-pressed={zoomed}
            >
              <img
                src={screenshotUrl}
                alt="Screenshot at the moment of pinning"
                className="block w-full transition-transform duration-200"
                style={
                  zoomed
                    ? { transform: `scale(2)`, transformOrigin: `${pin.xPct}% ${markerTop}%` }
                    : undefined
                }
              />
              <span
                className="pointer-events-none absolute -ml-2 -mt-2 h-4 w-4 -rotate-45 rounded-[50%_50%_50%_4px] border-2 border-[var(--page)] bg-[var(--pin)] shadow-sm"
                style={
                  zoomed
                    ? { left: `${pin.xPct}%`, top: `${markerTop}%`, transform: 'rotate(-45deg)' }
                    : { left: `${pin.xPct}%`, top: `${markerTop}%` }
                }
                aria-hidden="true"
              />
            </button>
            {lost && (
              <figcaption className="mt-1.5 text-meta">
                Not found on the live page any more · the screenshot is the source of truth
              </figcaption>
            )}
          </figure>
        ) : (
          <div className="rounded-[10px] border border-dashed border-[var(--line)] p-6 text-center text-meta">
            No screenshot for this pin
          </div>
        )}

        {/* AI summary and brief */}
        {(pin.aiSummary || pin.aiGroupBrief) && (
          <section aria-label="Analysis">
            {pin.aiSummary && (
              <p className="text-sm leading-relaxed text-[var(--ink-mute)]">
                {pin.aiAmbiguous && <span className="mr-1.5 font-mono text-[11px] uppercase text-[var(--warn)]">needs decision</span>}
                {pin.aiSummary}
              </p>
            )}
            {pin.aiGroupBrief && (
              <details className="mt-2 group">
                <summary className="cursor-pointer select-none text-meta hover:text-[var(--ink-mute)]">
                  Implementation brief{pin.aiGroupTitle ? ` · ${pin.aiGroupTitle}` : ''}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink-mute)]">
                  {pin.aiGroupBrief}
                </p>
              </details>
            )}
          </section>
        )}

        {/* Thread */}
        {thread.length > 0 && (
          <ol className="m-0 list-none space-y-4 border-t border-[var(--line)] p-0 pt-4" aria-label="Replies">
            {thread.map((r) => (
              <li key={r.id}>
                <p className="mb-0.5 flex items-baseline justify-between gap-3 text-meta">
                  <span className={r.authorType === 'owner' ? 'text-[var(--ink)]' : ''}>{r.authorName}</span>
                  <span>{getTimeAgo(r.createdAt)}</span>
                </p>
                <p className="whitespace-pre-wrap text-sm text-[var(--ink)]">{r.body}</p>
              </li>
            ))}
          </ol>
        )}

        {/* Context */}
        <details className="border-t border-[var(--line)] pt-3">
          <summary className="cursor-pointer select-none text-meta hover:text-[var(--ink-mute)]">
            Context · {pin.url} · {pin.viewportW}×{pin.viewportH}
            {pin.browser ? ` · ${parseBrowser(pin.browser)}` : ''}
          </summary>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
            <Row k="Page" v={pin.url} mono />
            {pin.selector && <Row k="Element" v={pin.selector} mono />}
            {pin.elementText && <Row k="Text" v={pin.elementText} />}
            <Row
              k="Placement"
              v={placement.verified && pin.placementCheckedAt ? `${placement.state} · checked ${getTimeAgo(pin.placementCheckedAt)}` : 'unverified'}
            />
            <Row k="Position" v={`${pin.xPct.toFixed(1)}% × ${pin.yPct.toFixed(1)}%`} mono />
            <Row k="Viewport" v={`${pin.viewportW} × ${pin.viewportH}`} mono />
            {pin.browser && <Row k="Browser" v={parseBrowser(pin.browser)} />}
            {pin.os && <Row k="OS" v={pin.os} />}
            {elementStyles &&
              Object.entries(elementStyles).map(([k, v]) => <Row key={k} k={k} v={v} mono soft />)}
          </dl>
        </details>
      </div>

      {/* Composer + actions, pinned to the bottom of the pane */}
      <footer className="mt-4 border-t border-[var(--line)] pt-3">
        <label htmlFor={replyId} className="sr-only">Reply to {pin.reviewerName ?? 'the reviewer'}</label>
        <textarea
          id={replyId}
          ref={composer}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              submitReply()
            } else if (e.key === 'Escape') {
              // Hand focus back to the list so j/k work again.
              e.currentTarget.blur()
            }
          }}
          rows={2}
          placeholder={`Reply to ${pin.reviewerName ?? 'the reviewer'}…`}
          className="w-full resize-y rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--accent)] focus:outline-none"
        />
        {error && <p className="mt-1.5 text-xs text-[var(--danger)]" role="alert">{error}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {reply.trim() ? (
            <Button size="sm" onClick={submitReply} disabled={busy !== null}>
              {busy === 'reply' ? 'Sending…' : 'Send reply'}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => void run('status', () => onUpdateStatus(resolved ? 'open' : 'resolved'), resolved ? 'Pin reopened' : 'Pin resolved')}
              disabled={busy !== null}
            >
              {busy === 'status' ? 'Saving…' : resolved ? 'Reopen' : 'Resolve'}
            </Button>
          )}
          <a
            href={previewLink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('secondary', 'sm')}
          >
            <ExternalLink size={13} strokeWidth={1.8} aria-hidden="true" />
            Open in preview
          </a>
          <span className="flex-1" />
          <Menu
            align="end"
            ariaLabel="More actions"
            triggerClassName="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            trigger={<MoreHorizontal size={16} strokeWidth={1.8} aria-hidden="true" />}
          >
            {reply.trim() && (
              <MenuItem onSelect={() => void run('status', () => onUpdateStatus(resolved ? 'open' : 'resolved'), resolved ? 'Pin reopened' : 'Pin resolved')}>
                {resolved ? 'Reopen' : 'Resolve'}
              </MenuItem>
            )}
            <MenuItem onSelect={() => { void navigator.clipboard?.writeText(previewLink); setLive('Link copied') }}>
              Copy preview link
            </MenuItem>
            <MenuItem tone="danger" onSelect={() => setConfirmDelete(true)}>
              Delete pin
            </MenuItem>
          </Menu>
        </div>
        <p className="mt-2 hidden text-[11px] font-mono text-[var(--ink-soft)] lg:block">
          ⌘↩ send · r resolve · a reply
        </p>
      </footer>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this pin?"
        description="The comment, its replies and the screenshot are removed for good. The reviewer will not be notified."
        confirmLabel={busy === 'delete' ? 'Deleting…' : 'Delete pin'}
        tone="danger"
        busy={busy === 'delete'}
        onConfirm={async () => {
          await run('delete', onDelete, 'Pin deleted')
          setConfirmDelete(false)
        }}
      />
    </article>
  )
}

function Row({ k, v, mono = false, soft = false }: { k: string; v: string; mono?: boolean; soft?: boolean }) {
  return (
    <>
      <dt className={`m-0 font-mono text-[11px] uppercase ${soft ? 'text-[var(--ink-soft)]' : 'text-[var(--ink-mute)]'}`}>{k}</dt>
      <dd className={`m-0 min-w-0 truncate ${mono ? 'font-mono' : ''} ${soft ? 'text-[var(--ink-soft)]' : 'text-[var(--ink)]'}`} title={v}>{v}</dd>
    </>
  )
}
