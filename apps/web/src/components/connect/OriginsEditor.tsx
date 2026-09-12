import { useState } from 'react'
import { Button } from '#/components/ui/Button'
import { updateAllowedOrigins } from '#/lib/projects'

/**
 * The allowlist, as the technical list it is. The project key is public, so
 * this list (plus the preview URL) is the only thing that decides where the
 * widget may load. A rejected origin is offered as a one-click fix above the
 * editor; that is the case owners actually hit.
 */
export function OriginsEditor({
  projectId,
  previewUrl,
  origins,
  rejectedOrigin,
  onChange,
}: {
  projectId: string
  previewUrl: string
  origins: string[]
  rejectedOrigin: string | null
  onChange: (origins: string[]) => void
}) {
  const [text, setText] = useState(origins.join('\n'))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const parse = () =>
    text
      .split(/[\n,]/)
      .map((o) => o.trim())
      .filter(Boolean)

  const save = async (list: string[]) => {
    setSaving(true)
    setMessage(null)
    try {
      const result = await updateAllowedOrigins({ data: { projectId, origins: list } })
      setText(result.origins.join('\n'))
      onChange(result.origins)
      setMessage({ tone: 'ok', text: 'Saved' })
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save' })
    } finally {
      setSaving(false)
    }
  }

  const showRejected = rejectedOrigin && !parse().includes(rejectedOrigin)

  return (
    <div>
      {showRejected && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[10px] bg-[color-mix(in_oklab,var(--warn)_14%,var(--surface))] px-3 py-2.5">
          <p className="m-0 min-w-0 flex-1 text-sm text-[var(--ink)]">
            The widget tried to load from{' '}
            <span className="font-mono text-[13px]">{rejectedOrigin}</span> and was refused.
          </p>
          <Button size="sm" disabled={saving} onClick={() => void save([...parse(), rejectedOrigin])}>
            Allow it
          </Button>
        </div>
      )}
      <label htmlFor="allowed-origins" className="sr-only">Allowed origins, one per line</label>
      <textarea
        id="allowed-origins"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        spellCheck={false}
        placeholder={'http://localhost:3000\nhttps://staging.acme.com'}
        className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--page)] px-3 py-2 font-mono text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--accent)] focus:outline-none"
      />
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-mute)]">
        One per line. The widget loads from{' '}
        <span className="font-mono">{previewUrl || 'the preview URL'}</span> and these origins;
        everything else is refused because the project key is public. Review links are allowed
        automatically while they are live.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Button size="sm" variant="secondary" disabled={saving} onClick={() => void save(parse())}>
          {saving ? 'Saving…' : 'Save origins'}
        </Button>
        {message && (
          <span
            className={`text-xs ${message.tone === 'error' ? 'text-[var(--danger)]' : 'text-[var(--ink-mute)]'}`}
            role={message.tone === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
