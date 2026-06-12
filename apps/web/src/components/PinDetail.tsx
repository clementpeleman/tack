import { Link } from '@tanstack/react-router'
import { useState, useId } from 'react'
import {
  buildPreviewLink,
  getTimeAgo,
  parseBrowser,
} from '#/lib/pin-display'
import type { PinDetailData } from '#/lib/project-pin-actions'

interface PinDetailProps {
  projectId: string
  previewUrl: string
  projectKey: string
  pin: PinDetailData
  onUpdate: (comment: string) => Promise<void>
  onDelete: () => Promise<void>
  onUpdateStatus: (status: 'open' | 'resolved') => Promise<void>
  onAddReply: (body: string) => Promise<void>
}

export function PinDetail({
  projectId,
  previewUrl,
  projectKey,
  pin,
  onUpdate,
  onDelete,
  onUpdateStatus,
  onAddReply,
}: PinDetailProps) {
  const [comment, setComment] = useState(pin.comment ?? '')
  const [replyBody, setReplyBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [replying, setReplying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const commentId = useId()
  const replyId = useId()

  const previewLink = buildPreviewLink(previewUrl, pin.url, pin.id)
  const screenshotUrl = pin.screenshotPath
    ? `/api/screenshots/${projectKey}/${pin.id}?projectKey=${encodeURIComponent(projectKey)}`
    : null

  const handleSave = async () => {
    if (!comment.trim()) return
    setSaving(true)
    setError(null)
    setStatusMsg('')
    try {
      await onUpdate(comment.trim())
      setStatusMsg('Pin saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAddReply = async () => {
    if (!replyBody.trim()) return
    setReplying(true)
    setError(null)
    setStatusMsg('')
    try {
      await onAddReply(replyBody.trim())
      setReplyBody('')
      setStatusMsg('Reply sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reply failed')
    } finally {
      setReplying(false)
    }
  }

  const handleToggleStatus = async () => {
    const next = pin.status === 'resolved' ? 'open' : 'resolved'
    setTogglingStatus(true)
    setError(null)
    setStatusMsg('')
    try {
      await onUpdateStatus(next)
      setStatusMsg(next === 'resolved' ? 'Pin resolved' : 'Pin reopened')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed')
    } finally {
      setTogglingStatus(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <Link
          to="/projects/$id/inbox"
          params={{ id: projectId }}
          className="inline-flex items-center gap-1 text-xs text-[var(--ink-soft)] hover:text-[var(--ink-mute)] no-underline font-mono mb-3 transition-colors"
        >
          ← Back to inbox
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--ink)]">
              Pin detail
            </h1>
            <p className="text-xs text-[var(--ink-soft)] font-mono mt-0.5">
              {pin.reviewerName ?? 'Anonymous'} · {getTimeAgo(pin.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={pin.status} />
            {pin.aiLabel && <AiBadge value={pin.aiLabel} />}
            {pin.aiPriority && <PriorityBadge value={pin.aiPriority} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
          {screenshotUrl ? (
            <div className="relative bg-[var(--surface-2)]">
              <img
                src={screenshotUrl}
                alt="Pin screenshot"
                className="w-full block"
              />
              <div
                className="absolute w-4 h-4 -ml-2 -mt-2 bg-[var(--pin)] rounded-[50%_50%_50%_4px] -rotate-45 border-2 border-[var(--page)] shadow-sm"
                style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
                aria-hidden="true"
              />
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-[var(--ink-mute)]">
              No screenshot captured
            </div>
          )}
        </div>

        <div className="space-y-4">
          {pin.replies.length > 0 && (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 space-y-2">
              <p className="text-[11px] text-[var(--ink-mute)] uppercase font-mono">
                Thread
              </p>
              {pin.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="rounded-lg border border-[color-mix(in_oklab,var(--ink)_8%,transparent)] bg-[var(--surface-2)] p-3"
                >
                  <p className="text-[11px] text-[var(--ink-soft)] font-mono mb-1">
                    {reply.authorName}
                    <span className="text-[var(--ink-mute)]">
                      {' '}
                      · {reply.authorType} · {getTimeAgo(reply.createdAt)}
                    </span>
                  </p>
                  <p className="text-sm text-[var(--ink)] whitespace-pre-wrap">
                    {reply.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <label
              htmlFor={commentId}
              className="block text-[11px] text-[var(--ink-mute)] uppercase font-mono mb-1.5"
            >
              Edit first comment
            </label>
            <textarea
              id={commentId}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] text-sm resize-y"
            />
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <label
              htmlFor={replyId}
              className="block text-[11px] text-[var(--ink-mute)] uppercase font-mono mb-1.5"
            >
              Add reply
            </label>
            <textarea
              id={replyId}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] text-sm resize-y"
              placeholder="Reply to reviewer..."
            />
          </div>

          {pin.aiSummary && (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] text-[var(--ink-soft)] uppercase font-mono">
                  AI summary
                </span>
                {pin.aiAmbiguous && (
                  <PriorityBadge value="needs decision" />
                )}
              </div>
              <p className="text-xs text-[var(--ink-mute)] leading-relaxed">
                {pin.aiSummary}
              </p>
              {pin.aiGroupBrief && (
                <div className="mt-3 pt-3 border-t border-[color-mix(in_oklab,var(--ink)_8%,transparent)]">
                  <p className="text-[10px] text-[var(--ink-soft)] uppercase font-mono mb-1">
                    Group brief
                    {pin.aiGroupTitle ? `: ${pin.aiGroupTitle}` : ''}
                  </p>
                  <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                    {pin.aiGroupBrief}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <Detail label="Page" value={pin.url} mono />
            {pin.selector && <Detail label="Element" value={pin.selector} mono />}
            {pin.elementText && <Detail label="Text" value={pin.elementText} />}
            <Detail
              label="Position"
              value={`${pin.xPct.toFixed(1)}% × ${pin.yPct.toFixed(1)}%`}
              mono
            />
            <Detail
              label="Viewport"
              value={`${pin.viewportW} × ${pin.viewportH}`}
              mono
            />
            {pin.browser && (
              <Detail label="Browser" value={parseBrowser(pin.browser)} />
            )}
            {pin.os && <Detail label="OS" value={pin.os} />}
          </div>

          <div className="sr-only" role="status" aria-live="polite">
            {statusMsg}
          </div>
          {error && (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}

          {confirmDelete ? (
            <div className="rounded-lg border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_8%,var(--surface))] p-3">
              <p className="text-sm text-[var(--ink)] mb-3">
                Delete this pin permanently?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="min-h-11 px-3 py-2 rounded-lg text-xs border border-[var(--line)]"
                >
                  Keep pin
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="min-h-11 px-3 py-2 rounded-lg text-xs text-[var(--danger)] border border-[color-mix(in_oklab,var(--danger)_35%,transparent)]"
                >
                  {deleting ? 'Deleting...' : 'Delete pin'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!comment.trim() || saving || deleting || togglingStatus || replying}
                className="min-h-11 px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--on-accent)] text-xs font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save comment'}
              </button>
              <button
                type="button"
                onClick={handleAddReply}
                disabled={!replyBody.trim() || saving || deleting || togglingStatus || replying}
                className="min-h-11 px-3 py-2 rounded-lg border border-[var(--line)] text-xs disabled:opacity-50"
              >
                {replying ? 'Sending...' : 'Send reply'}
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={saving || deleting || togglingStatus || replying}
                className="min-h-11 px-3 py-2 rounded-lg border border-[var(--line)] text-xs disabled:opacity-50"
              >
                {togglingStatus
                  ? 'Updating...'
                  : pin.status === 'resolved'
                    ? 'Reopen'
                    : 'Mark resolved'}
              </button>
              <a
                href={previewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 inline-flex items-center px-3 py-2 rounded-lg border border-[var(--line)] text-xs text-[var(--accent)] no-underline"
              >
                Open in preview
              </a>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting || togglingStatus || replying}
                className="min-h-11 px-3 py-2 rounded-lg text-xs text-[var(--danger)] border border-[color-mix(in_oklab,var(--danger)_35%,transparent)]"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <span className="block text-[var(--ink-mute)] text-[11px] uppercase font-mono mb-0.5">
        {label}
      </span>
      <span
        className={`block text-[var(--ink-soft)] truncate ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

function AiBadge({ value }: { value: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent-2)]">
      {value}
    </span>
  )
}

function PriorityBadge({ value }: { value: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase bg-[color-mix(in_oklab,var(--warn)_14%,transparent)] text-[var(--warn)]">
      {value.replaceAll('_', ' ')}
    </span>
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
      className={`px-2 py-0.5 rounded-full text-[11px] font-mono uppercase ${styles[status] ?? styles.open}`}
    >
      {status}
    </span>
  )
}
