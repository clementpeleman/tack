import { Button, buttonClasses } from '#/components/ui/Button'
import { useEffect, useRef } from 'react'
import { Check, Copy } from 'lucide-react'
import { InstallModeTabs } from '#/components/inbox/FilterControls'

export function ConnectPanel({
  activeTab,
  bookmarklet,
  bookmarkletCopied,
  copyBookmarklet,
  copySnippet,
  label,
  onTabChange,
  scriptCopied,
  snippet,
}: {
  activeTab: 'snippet' | 'bookmarklet'
  bookmarklet: string
  bookmarkletCopied: boolean
  copyBookmarklet: () => void
  copySnippet: () => void
  label: string
  onTabChange: (tab: 'snippet' | 'bookmarklet') => void
  scriptCopied: boolean
  snippet: string
}) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">Connect preview</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-mute)]">
            Install once for the preview site, or use the bookmarklet for a quick
            client pass.
          </p>
        </div>
      </div>

      <InstallModeTabs activeTab={activeTab} onTabChange={onTabChange} />

      {activeTab === 'snippet' ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--ink-mute)]">
              Paste this into the preview HTML.
            </p>
            <button
              type="button"
              onClick={copySnippet}
              className="inline-flex min-h-11 items-center gap-1.5 border-none bg-transparent text-xs font-mono text-[var(--accent)] transition-colors hover:text-[var(--accent-2)] sm:min-h-8"
            >
              {scriptCopied ? (
                <Check size={13} strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Copy size={13} strokeWidth={1.8} aria-hidden="true" />
              )}
              {scriptCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <code className="block max-h-28 overflow-x-auto whitespace-nowrap rounded-md bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink-soft)] font-mono">
            {snippet}
          </code>
        </div>
      ) : (
        <div className="mt-3">
          <p className="mb-3 text-xs leading-relaxed text-[var(--ink-mute)]">
            Copy the bookmarklet URL or drag the button to the bookmarks bar.
            Click it on any page to activate Tack without code changes.
          </p>
          <Button variant="secondary" size="sm" onClick={copyBookmarklet} className="mb-3">
            {bookmarkletCopied ? (
              <Check size={13} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Copy size={13} strokeWidth={1.8} aria-hidden="true" />
            )}
            {bookmarkletCopied ? 'Bookmarklet copied' : 'Copy bookmarklet URL'}
          </Button>
          <BookmarkletLink href={bookmarklet} label={label} />
        </div>
      )}
    </section>
  )
}

export function BookmarkletLink({ href, label }: { href: string; label: string }) {
  // React 19 refuses `javascript:` URLs passed as props and replaces them
  // with a throwing stub, which broke dragging the link to the bookmarks bar.
  // Setting the attribute imperatively keeps the drag working; clicks are
  // still prevented so the page itself never runs it.
  const ref = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    ref.current?.setAttribute('href', href)
  }, [href])
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        ref={ref}
        draggable="true"
        onClick={(event) => event.preventDefault()}
        className={`${buttonClasses('primary', 'sm')} cursor-grab active:cursor-grabbing`}
      >
        {label}
      </a>
      <span className="text-[10px] text-[var(--ink-soft)] font-mono">
        Drag to bookmarks bar
      </span>
    </div>
  )
}
