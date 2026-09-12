import { Button } from '#/components/ui/Button'
import { Check, Copy, ExternalLink, Inbox } from 'lucide-react'
import { InstallModeTabs } from '#/components/inbox/FilterControls'
import { BookmarkletLink } from '#/components/inbox/ConnectPanel'

export function ZeroPinOnboarding({
  activeTab,
  bookmarklet,
  bookmarkletCopied,
  copyBookmarklet,
  copySnippet,
  onTabChange,
  previewUrl,
  projectName,
  scriptCopied,
  snippet,
}: {
  activeTab: 'snippet' | 'bookmarklet'
  bookmarklet: string
  bookmarkletCopied: boolean
  copyBookmarklet: () => void
  copySnippet: () => void
  onTabChange: (tab: 'snippet' | 'bookmarklet') => void
  previewUrl: string
  projectName: string
  scriptCopied: boolean
  snippet: string
}) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--pin)_12%,transparent)] text-[var(--pin)]">
          <Inbox size={19} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            Install Tack to collect the first pin
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--ink-mute)]">
            Start with one script tag. After it is on the preview site, open the
            preview and place a test pin to confirm the client path works.
          </p>
        </div>
      </div>

      <ol className="mb-5 grid gap-2 text-xs text-[var(--ink-mute)] sm:grid-cols-3">
        {[
          'Copy the script tag',
          'Add it to the preview site',
          'Open preview and place a test pin',
        ].map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-2 rounded-md bg-[var(--surface-2)] px-3 py-2"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[10px] font-mono text-[var(--ink-soft)]">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <InstallModeTabs activeTab={activeTab} onTabChange={onTabChange} />

      {activeTab === 'snippet' ? (
        <div className="mt-3">
          <Button size="sm" onClick={copySnippet} className="mb-3">
            {scriptCopied ? (
              <Check size={14} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Copy size={14} strokeWidth={1.8} aria-hidden="true" />
            )}
            {scriptCopied ? 'Script copied' : 'Copy script tag'}
          </Button>
          <code className="block overflow-x-auto whitespace-nowrap rounded-md bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink-soft)] font-mono">
            {snippet}
          </code>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <Button size="sm" onClick={copyBookmarklet}>
            {bookmarkletCopied ? (
              <Check size={14} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Copy size={14} strokeWidth={1.8} aria-hidden="true" />
            )}
            {bookmarkletCopied ? 'Bookmarklet copied' : 'Copy bookmarklet URL'}
          </Button>
          <BookmarkletLink href={bookmarklet} label={`Tack: ${projectName}`} />
        </div>
      )}

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <Button href={previewUrl} variant="secondary" size="sm" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
          Open preview after installing
        </Button>
      </div>
    </section>
  )
}
