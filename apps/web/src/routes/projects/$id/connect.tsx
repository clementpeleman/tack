import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { Layout } from '#/components/Layout'
import { Button, buttonClasses } from '#/components/ui/Button'
import { SharePanel } from '#/components/SharePanel'
import { OriginsEditor } from '#/components/connect/OriginsEditor'
import { getAppOrigin, getProject, getProjects, getShares } from '#/lib/projects'
import { getProjectConnectionStatus } from '#/lib/project-pin-actions'
import { getTimeAgo } from '#/lib/pin-display'
import { completeOnboarding, getCurrentUser } from '#/lib/user'

/**
 * Everything about getting the widget in front of a reviewer, on one flat
 * page: status first, then the three ways in order of effort (review link,
 * script tag, bookmarklet), then the allowlist that governs all three.
 */
export const Route = createFileRoute('/projects/$id/connect')({
  component: ConnectPage,
  loader: async ({ params }) => {
    const [project, sidebarProjects, appOrigin, shareState, user] = await Promise.all([
      getProject({ data: { id: params.id } }),
      getProjects(),
      getAppOrigin(),
      getShares({ data: { projectId: params.id } }),
      getCurrentUser(),
    ])
    return {
      project,
      appOrigin,
      shareState,
      userEmail: user.email,
      sidebarProjects: sidebarProjects.map((p) => ({ id: p.id, name: p.name })),
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    onboarding: search.onboarding === '1' || search.onboarding === 1 || search.onboarding === true,
  }),
})

function ConnectPage() {
  const { project, sidebarProjects, appOrigin, shareState, userEmail } = Route.useLoaderData()
  const { onboarding } = Route.useSearch()
  const router = useRouter()

  const [connected, setConnected] = useState(Boolean(project.firstWidgetSeenAt))
  const [connectedOrigin, setConnectedOrigin] = useState<string | null>(project.firstWidgetOrigin ?? null)
  const [connectedAt, setConnectedAt] = useState<string | null>(project.firstWidgetSeenAt ?? null)
  const [rejectedOrigin, setRejectedOrigin] = useState<string | null>(project.lastRejectedOrigin ?? null)
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>(project.allowedOrigins ?? [])
  const [copied, setCopied] = useState<'snippet' | 'cli' | 'bookmarklet' | null>(null)
  const [finishing, setFinishing] = useState(false)
  const onboardingDone = useRef(false)

  const snippet = `<script src="${appOrigin}/tack-widget.js" data-project="${project.projectKey}" data-api="${appOrigin}"></script>`
  const cli = `npx @usetack/cli init --project ${project.projectKey}${appOrigin.includes('tack.peleman.io') ? '' : ` --host ${appOrigin}`}`
  const bookmarklet = `javascript:void((function(){if(document.getElementById('tack-widget-host'))return;var s=document.createElement('script');s.src='${appOrigin}/tack-widget.js';s.setAttribute('data-project','${project.projectKey}');s.setAttribute('data-api','${appOrigin}');document.body.appendChild(s)})())`

  // Poll for the first ping and for refused origins; both change without a reload.
  useEffect(() => {
    const poll = async () => {
      try {
        const status = await getProjectConnectionStatus({ data: { id: project.id } })
        if (status.connected) {
          setConnected(true)
          setConnectedOrigin(status.firstWidgetOrigin ?? null)
          setConnectedAt(status.firstWidgetSeenAt ?? null)
        }
        setRejectedOrigin(status.lastRejectedOrigin ?? null)
        setAllowedOrigins(status.allowedOrigins)
      } catch {
        /* transient */
      }
    }
    void poll()
    const id = setInterval(poll, 4000)
    return () => clearInterval(id)
  }, [project.id])

  useEffect(() => {
    if (connected && onboarding && !onboardingDone.current) {
      onboardingDone.current = true
      void completeOnboarding().catch(() => {})
    }
  }, [connected, onboarding])

  const copy = (what: 'snippet' | 'cli' | 'bookmarklet', value: string) => {
    void navigator.clipboard?.writeText(value).catch(() => {})
    setCopied(what)
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000)
  }

  const goToInbox = async () => {
    setFinishing(true)
    try {
      if (onboarding) await completeOnboarding().catch(() => {})
      await router.navigate({ to: '/projects/$id/inbox', params: { id: project.id } })
    } finally {
      setFinishing(false)
    }
  }

  return (
    <Layout
      projectId={project.id}
      projectName={project.name}
      sidebarProjects={sidebarProjects}
      activeSection="connect"
      userEmail={userEmail}
    >
      <div className="max-w-2xl">
        <div className="sr-only" role="status" aria-live="polite">{copied ? 'Copied' : ''}</div>
        <header className="mb-6">
          {onboarding && <p className="mb-1 text-meta uppercase">Step 2 of 2</p>}
          <h1 className="text-page-title">Connect</h1>
          <p className="mt-1 text-sm text-[var(--ink-mute)]">
            {connected ? (
              <>
                <span className="text-[var(--signal)]">Connected</span>
                {connectedOrigin && <> from <span className="font-mono">{connectedOrigin}</span></>}
                {connectedAt && <> · first ping {getTimeAgo(connectedAt)}</>}
              </>
            ) : (
              'Nothing received yet. Pick one of the three ways below; this line updates the moment the widget loads.'
            )}
          </p>
          {rejectedOrigin && !allowedOrigins.includes(rejectedOrigin) && (
            <p className="mt-1 text-sm text-[var(--warn)]">
              The widget was refused from <span className="font-mono">{rejectedOrigin}</span>. Allow it under Allowed origins below.
            </p>
          )}
        </header>

        <Section
          n={1}
          title="Review link"
          lede="Tack serves the site through its own link with the widget already on it. Nothing to install; send the link to your client."
        >
          <SharePanel
            projectId={project.id}
            previewUrl={project.previewUrl}
            configured={shareState.configured}
            initialShares={shareState.shares}
            flat
          />
        </Section>

        <Section
          n={2}
          title="Script tag"
          lede="For a preview that redeploys with the site. Paste it before </body>, or let the CLI patch the right file and gate it on an environment variable."
        >
          <CopyBlock label="Snippet" value={snippet} copied={copied === 'snippet'} onCopy={() => copy('snippet', snippet)} />
          <CopyBlock label="CLI" value={cli} copied={copied === 'cli'} onCopy={() => copy('cli', cli)} />
        </Section>

        <Section
          n={3}
          title="Bookmarklet"
          lede="For a quick pass on a site you cannot touch at all. Drag the button to your bookmarks bar, open the site, click it."
        >
          <div className="flex flex-wrap items-center gap-3">
            <BookmarkletLink href={bookmarklet} label={`Tack: ${project.name}`} />
            <button
              type="button"
              onClick={() => copy('bookmarklet', bookmarklet)}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--accent)] hover:underline"
            >
              {copied === 'bookmarklet' ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
              {copied === 'bookmarklet' ? 'copied' : 'copy URL instead'}
            </button>
          </div>
        </Section>

        <Section
          title="Allowed origins"
          lede="Where the widget may load. Review links and the preview URL are covered; add dev servers and staging hosts here."
        >
          <OriginsEditor
            projectId={project.id}
            previewUrl={project.previewUrl}
            origins={allowedOrigins}
            rejectedOrigin={rejectedOrigin}
            onChange={(next) => {
              setAllowedOrigins(next)
              if (rejectedOrigin && next.includes(rejectedOrigin)) setRejectedOrigin(null)
            }}
          />
        </Section>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">
          <Button onClick={goToInbox} disabled={finishing} variant={connected ? 'primary' : 'secondary'}>
            {finishing ? 'Opening inbox…' : connected ? 'Go to inbox' : 'Skip to inbox'}
          </Button>
          {connected && project.previewUrl && (
            <a
              href={project.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('secondary', 'md')}
            >
              Open preview
            </a>
          )}
        </div>
      </div>
    </Layout>
  )
}

function Section({ n, title, lede, children }: { n?: number; title: string; lede: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] py-6">
      <h2 className="text-section">
        {n != null && <span className="mr-2 font-mono text-[11px] text-[var(--ink-soft)]">{n}</span>}
        {title}
      </h2>
      <p className="mb-4 mt-1 max-w-prose text-sm leading-relaxed text-[var(--ink-mute)]">{lede}</p>
      {children}
    </section>
  )
}

function CopyBlock({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-meta uppercase">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <code className="block overflow-x-auto whitespace-nowrap rounded-[10px] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--ink-mute)]">
        {value}
      </code>
    </div>
  )
}

/** React 19 refuses javascript: URLs as props; set the attribute after mount so dragging still works. */
function BookmarkletLink({ href, label }: { href: string; label: string }) {
  const ref = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    ref.current?.setAttribute('href', href)
  }, [href])
  return (
    <a
      ref={ref}
      draggable="true"
      onClick={(e) => e.preventDefault()}
      className={`${buttonClasses('secondary', 'sm')} cursor-grab active:cursor-grabbing`}
      title="Drag me to your bookmarks bar"
    >
      {label}
    </a>
  )
}
