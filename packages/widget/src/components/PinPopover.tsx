import { useState, useEffect } from 'preact/hooks'
import { useEscapeKey } from '../lib/useEscapeKey'
import { fetchReplies, type WidgetReply } from '../lib/api'

export interface PinPopoverData {
  id: string
  xPct: number
  yPct: number
  status: string
  reviewerId: string
  reviewerName: string | null
  comment: string | null
}

interface PinPopoverProps {
  pin: PinPopoverData
  index: number
  isOwn: boolean
  projectKey: string
  threadVersion?: number
  onClose: () => void
  onSave: (comment: string, name: string) => Promise<void>
  onDelete: () => Promise<void>
  onReply: (comment: string, name: string) => Promise<void>
}

export function PinPopover({
  pin,
  index,
  isOwn,
  projectKey,
  threadVersion = 0,
  onClose,
  onSave,
  onDelete,
  onReply,
}: PinPopoverProps) {
  const [name, setName] = useState(pin.reviewerName ?? '')
  const [comment, setComment] = useState(pin.comment ?? '')
  const [replyText, setReplyText] = useState('')
  const [replies, setReplies] = useState<WidgetReply[]>([])
  const [loadingReplies, setLoadingReplies] = useState(true)
  const [saving, setSaving] = useState(false)
  const [replying, setReplying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  useEscapeKey(onClose)

  useEffect(() => {
    let cancelled = false
    setLoadingReplies(true)
    fetchReplies(projectKey, pin.id)
      .then((data) => {
        if (!cancelled) setReplies(data.replies ?? [])
      })
      .catch(() => {
        if (!cancelled) setReplies([])
      })
      .finally(() => {
        if (!cancelled) setLoadingReplies(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectKey, pin.id, threadVersion])

  const screenX = (pin.xPct / 100) * window.innerWidth
  const screenY =
    (pin.yPct / 100) * document.documentElement.scrollHeight - window.scrollY

  const left = Math.min(screenX + 36, window.innerWidth - 300)
  const top = Math.min(screenY - 20, window.innerHeight - 420)

  const handleSave = async (e: Event) => {
    e.preventDefault()
    if (!isOwn || !comment.trim()) return
    setSaving(true)
    setStatusMsg('')
    try {
      await onSave(comment.trim(), name.trim())
      setStatusMsg('Pin saved')
      onClose()
    } catch {
      setStatusMsg('Could not save pin')
    } finally {
      setSaving(false)
    }
  }

  const handleReply = async (e: Event) => {
    e.preventDefault()
    if (!replyText.trim()) return
    setReplying(true)
    setStatusMsg('')
    try {
      await onReply(replyText.trim(), name.trim())
      const data = await fetchReplies(projectKey, pin.id)
      setReplies(data.replies ?? [])
      setReplyText('')
      setStatusMsg('Reply sent')
    } catch {
      setStatusMsg('Could not send reply')
    } finally {
      setReplying(false)
    }
  }

  const handleDelete = async () => {
    if (!isOwn) return
    setDeleting(true)
    setStatusMsg('')
    try {
      await onDelete()
      setStatusMsg('Pin deleted')
      onClose()
    } catch {
      setStatusMsg('Could not delete pin')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <div class="tack-popover-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        class="tack-modal tack-popover"
        style={{ left: `${left}px`, top: `${top}px` }}
        role="dialog"
        aria-labelledby="tack-popover-title"
      >
        <div class="tack-popover-header">
          <span id="tack-popover-title" class="tack-popover-label">Pin {index + 1}</span>
          <button type="button" class="tack-popover-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div class="tack-live-region" role="status" aria-live="polite">
          {statusMsg}
        </div>

        {!loadingReplies && replies.length > 0 && (
          <div class="tack-thread">
            {replies.map((reply) => (
              <div key={reply.id} class="tack-thread-item">
                <p class="tack-thread-meta">
                  {reply.authorName}
                  <span class="tack-thread-role"> · {reply.authorType}</span>
                </p>
                <p class="tack-thread-body">{reply.body}</p>
              </div>
            ))}
          </div>
        )}

        {isOwn ? (
          <form onSubmit={handleSave}>
            <div class="tack-field">
              <label class="tack-field-label" for="tack-popover-name">Your name</label>
              <input
                id="tack-popover-name"
                type="text"
                placeholder="Optional"
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="tack-field">
              <label class="tack-field-label" for="tack-popover-comment">Comment</label>
              <textarea
                id="tack-popover-comment"
                rows={3}
                value={comment}
                onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
                required
                autoFocus
              />
            </div>

            {confirmDelete ? (
              <div class="tack-delete-confirm">
                <p>Delete this pin permanently?</p>
                <div class="tack-modal-actions">
                  <button
                    type="button"
                    class="tack-btn-cancel"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    class="tack-btn-danger"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                  >
                    {deleting ? 'Deleting...' : 'Delete pin'}
                  </button>
                </div>
              </div>
            ) : (
              <div class="tack-modal-actions">
                <button
                  type="button"
                  class="tack-btn-danger"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting || saving}
                >
                  Delete
                </button>
                <button
                  type="submit"
                  class="tack-btn-primary"
                  disabled={!comment.trim() || saving || deleting}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </form>
        ) : (
          <div class="tack-popover-readonly">
            {pin.reviewerName && <p class="tack-popover-author">{pin.reviewerName}</p>}
            <p class="tack-popover-comment">{pin.comment ?? 'No comment'}</p>
            <p class="tack-popover-hint">Only the author can edit this pin.</p>
          </div>
        )}

        <form onSubmit={handleReply} class="tack-reply-form">
          <div class="tack-field">
            <label class="tack-field-label" for="tack-reply-body">Reply</label>
            <textarea
              id="tack-reply-body"
              rows={2}
              placeholder="Add to the thread..."
              value={replyText}
              onInput={(e) => setReplyText((e.target as HTMLTextAreaElement).value)}
            />
          </div>
          {!isOwn && (
            <div class="tack-field">
              <label class="tack-field-label" for="tack-reply-name">Your name</label>
              <input
                id="tack-reply-name"
                type="text"
                placeholder="Optional"
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
              />
            </div>
          )}
          <div class="tack-modal-actions">
            <button
              type="submit"
              class="tack-btn-primary"
              disabled={!replyText.trim() || replying || saving || deleting}
            >
              {replying ? 'Sending...' : 'Send reply'}
            </button>
          </div>
        </form>

        {pin.status === 'resolved' && (
          <span class="tack-popover-status">Resolved</span>
        )}
      </div>
    </>
  )
}
