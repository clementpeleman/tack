import { useState } from 'preact/hooks'
import { useEscapeKey } from '../lib/useEscapeKey'

interface CommentModalProps {
  x: number
  y: number
  onSubmit: (name: string, comment: string) => void
  onCancel: () => void
}

export function CommentModal({ x, y, onSubmit, onCancel }: CommentModalProps) {
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEscapeKey(onCancel)

  const screenX = (x / 100) * window.innerWidth
  const screenY = (y / 100) * document.documentElement.scrollHeight - window.scrollY

  const left = Math.min(screenX + 36, window.innerWidth - 300)
  const top = Math.min(screenY - 20, window.innerHeight - 220)

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    onSubmit(name.trim(), comment.trim())
  }

  return (
    <div
      class="tack-modal"
      style={{ left: `${left}px`, top: `${top}px` }}
      role="dialog"
      aria-labelledby="tack-comment-title"
    >
      <p id="tack-comment-title" class="tack-popover-label" style={{ marginBottom: '10px' }}>
        Leave feedback
      </p>
      <form onSubmit={handleSubmit}>
        <div class="tack-field">
          <label class="tack-field-label" for="tack-comment-name">Your name</label>
          <input
            id="tack-comment-name"
            type="text"
            placeholder="Optional"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="tack-field">
          <label class="tack-field-label" for="tack-comment-body">Comment</label>
          <textarea
            id="tack-comment-body"
            placeholder="What's wrong here?"
            rows={3}
            value={comment}
            onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
            required
            autoFocus
          />
        </div>
        <div class="tack-modal-actions">
          <button type="button" class="tack-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" class="tack-btn-primary" disabled={!comment.trim() || submitting}>
            {submitting ? 'Posting...' : 'Drop pin'}
          </button>
        </div>
      </form>
    </div>
  )
}
