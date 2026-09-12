import { useState } from 'react'
import { Button } from '#/components/ui/Button'
import { Field } from '#/components/ui/Field'
import { createShareLink, revokeShareLink } from '#/lib/projects'

export interface ShareSummary {
  id: string
  slug: string
  url: string
  targetUrl: string
  label: string | null
  hasPasscode: boolean
  expiresAt: string
  revokedAt: string | null
  lastAccessAt: string | null
  live: boolean
}

/**
 * Share a preview without touching its code: Tack proxies the site on the
 * share domain and injects the widget. The link is what goes to the client.
 */
export function SharePanel({
  projectId,
  previewUrl,
  configured,
  initialShares,
  flat = false,
}: {
  projectId: string
  previewUrl: string
  configured: boolean
  initialShares: ShareSummary[]
  /** Render without its own border and title (inside a page section). */
  flat?: boolean
}) {
  const [shares, setShares] = useState(initialShares)
  const [targetUrl, setTargetUrl] = useState(previewUrl)
  const [passcode, setPasscode] = useState('')
  const [days, setDays] = useState('7')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const live = shares.filter((s) => s.live)

  const create = async () => {
    setCreating(true)
    setError('')
    try {
      const result = await createShareLink({
        data: {
          projectId,
          targetUrl,
          passcode: passcode || undefined,
          days: Number(days) || undefined,
        },
      })
      setShares((prev) => [result.share, ...prev])
      setPasscode('')
      copy(result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the link')
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (shareId: string) => {
    await revokeShareLink({ data: { projectId, shareId } })
    setShares((prev) =>
      prev.map((s) =>
        s.id === shareId
          ? { ...s, live: false, revokedAt: new Date().toISOString() }
          : s,
      ),
    )
  }

  const copy = (url: string) => {
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(url)
    setTimeout(() => setCopied((c) => (c === url ? null : c)), 2000)
  }

  if (!configured) {
    return (
      <section className={flat ? '' : 'rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4'}>
        {!flat && <p className="text-sm font-medium text-[var(--ink)]">Share a review link</p>}
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-mute)]">
          Not available on this instance. Set{' '}
          <span className="font-mono">TACK_SHARE_DOMAIN</span> (for example{' '}
          <span className="font-mono">share.example.com</span>) with wildcard DNS
          and TLS to serve preview sites with the widget injected, no code changes
          needed.
        </p>
      </section>
    )
  }

  return (
    <section className={flat ? '' : 'rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4'}>
      {!flat && (
        <>
          <p className="text-sm font-medium text-[var(--ink)]">Share a review link</p>
          <p className="mt-1 mb-3 text-xs leading-relaxed text-[var(--ink-mute)]">
            Tack serves the site through its own link with the widget already on it.
            Nothing to install on the site; send the link to your client.
          </p>
        </>
      )}

      <div className="space-y-3">
        <Field
          label="Site to share"
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://preview.acme.com"
          className="font-mono"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Passcode (optional)"
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="none"
            autoComplete="off"
          />
          <Field
            label="Expires in days"
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={create} disabled={creating || !targetUrl}>
            {creating ? 'Creating…' : 'Create link'}
          </Button>
          {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
        </div>
      </div>

      {live.length > 0 && (
        <ul className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {live.map((s) => (
            <li key={s.id} className="py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[var(--accent)] break-all"
                >
                  {s.url}
                </a>
                <button
                  type="button"
                  onClick={() => copy(s.url)}
                  className="font-mono text-[var(--accent)] bg-transparent border-none cursor-pointer"
                >
                  {copied === s.url ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => revoke(s.id)}
                  className="font-mono text-[var(--ink-soft)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
                >
                  Revoke
                </button>
              </div>
              <p className="mt-0.5 text-[var(--ink-soft)]">
                → <span className="font-mono">{s.targetUrl}</span>
                {s.hasPasscode ? ' · passcode' : ''} · expires{' '}
                {new Date(s.expiresAt).toLocaleDateString()}
                {s.lastAccessAt
                  ? ` · last opened ${new Date(s.lastAccessAt).toLocaleString()}`
                  : ' · not opened yet'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
