import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  getAppOrigin,
  getProject,
  getProjects,
  getShares,
  updateAllowedOrigins,
} from '#/lib/projects'
import { SharePanel } from '#/components/SharePanel'
import { getProjectConnectionStatus } from '#/lib/project-pin-actions'
import { completeOnboarding } from '#/lib/user'
import { Layout } from '#/components/Layout'
import { Button } from '#/components/ui/Button'

export const Route = createFileRoute('/projects/$id/install')({
  component: InstallPage,
  loader: async ({ params }) => {
    const [project, sidebarProjects, appOrigin, shareState] = await Promise.all([
      getProject({ data: { id: params.id } }),
      getProjects(),
      getAppOrigin(),
      getShares({ data: { projectId: params.id } }),
    ])
    return {
      project,
      appOrigin,
      shareState,
      sidebarProjects: sidebarProjects.map((p) => ({
        id: p.id,
        name: p.name,
      })),
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    onboarding: search.onboarding === '1' || search.onboarding === 1,
  }),
})

function InstallPage() {
  const { project, sidebarProjects, appOrigin, shareState } = Route.useLoaderData()
  const { onboarding } = Route.useSearch()
  const router = useRouter()
  const [connected, setConnected] = useState(Boolean(project.firstWidgetSeenAt))
  const [connectedOrigin, setConnectedOrigin] = useState<string | null>(
    project.firstWidgetOrigin ?? null,
  )
  const [rejectedOrigin, setRejectedOrigin] = useState<string | null>(
    project.lastRejectedOrigin ?? null,
  )
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>(
    project.allowedOrigins ?? [],
  )
  const [allowing, setAllowing] = useState(false)
  const [allowError, setAllowError] = useState('')
  const [waitingSeconds, setWaitingSeconds] = useState(0)
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [showTestStep, setShowTestStep] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const tackOrigin = appOrigin
  const snippet = `<script src="${tackOrigin}/tack-widget.js" data-project="${project.projectKey}" data-api="${tackOrigin}"></script>`

  useEffect(() => {
    // Keep polling while connected too: a rejected origin (a preview deploy
    // on a host that is not allowed yet) can show up after the local dev
    // origin already connected.
    const poll = async () => {
      try {
        const status = await getProjectConnectionStatus({ data: { id: project.id } })
        if (status.connected) {
          setConnected(true)
          setConnectedOrigin(status.firstWidgetOrigin ?? null)
        }
        setRejectedOrigin(status.lastRejectedOrigin ?? null)
        setAllowedOrigins(status.allowedOrigins)
      } catch {
        // ignore poll errors
      }
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [connected, project.id])

  useEffect(() => {
    if (connected || waitingSeconds >= 30) return
    const tick = setInterval(() => {
      setWaitingSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(tick)
  }, [connected, waitingSeconds])

  useEffect(() => {
    if (connected && onboarding) {
      setShowTestStep(true)
      void completeOnboarding().catch(() => {
        // Ignore, user can still continue manually.
      })
    }
  }, [connected, onboarding])

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet).catch(() => {})
    setSnippetCopied(true)
    setTimeout(() => setSnippetCopied(false), 2000)
  }

  const allowRejectedOrigin = async () => {
    if (!rejectedOrigin) return
    setAllowing(true)
    setAllowError('')
    try {
      const result = await updateAllowedOrigins({
        data: { projectId: project.id, origins: [...allowedOrigins, rejectedOrigin] },
      })
      setAllowedOrigins(result.origins)
      setRejectedOrigin(null)
    } catch (err) {
      setAllowError(err instanceof Error ? err.message : 'Could not allow origin')
    } finally {
      setAllowing(false)
    }
  }

  const finishOnboarding = async () => {
    setFinishing(true)
    try {
      if (onboarding) {
        await completeOnboarding()
      }
      await router.navigate({
        to: '/projects/$id/inbox',
        params: { id: project.id },
      })
    } finally {
      setFinishing(false)
    }
  }

  const handleContinue = async () => {
    if (onboarding) {
      await completeOnboarding()
    }
    await router.navigate({
      to: '/projects/$id/inbox',
      params: { id: project.id },
    })
  }

  const previewTestUrl = project.previewUrl.replace(/\/$/, '')

  return (
    <Layout
      projectId={project.id}
      projectName={project.name}
      sidebarProjects={sidebarProjects}
    >
      <div className="max-w-2xl">
        {onboarding && (
          <p className="text-[11px] text-[var(--ink-mute)] font-mono uppercase mb-2">
            Step 2 of 2 · Install widget
          </p>
        )}
        <h1 className="text-xl font-semibold text-[var(--ink)] mb-1">
          Install Tack
        </h1>
        <p className="text-sm text-[var(--ink-mute)] mb-6">
          Add the script to{' '}
          <span className="font-mono text-[var(--ink-soft)]">
            {project.previewUrl}
          </span>{' '}
          and load the page once.
        </p>

        <div
          className={`mb-6 rounded-lg border p-4 ${
            connected
              ? 'border-[color-mix(in_oklab,var(--signal)_35%,transparent)] bg-[color-mix(in_oklab,var(--signal)_8%,var(--surface))]'
              : 'border-[var(--line)] bg-[var(--surface)]'
          }`}
        >
          <p className="text-sm font-medium text-[var(--ink)]">
            {connected ? 'Connected ✓' : 'Waiting for first ping…'}
          </p>
          <p className="text-xs text-[var(--ink-mute)] mt-1">
            {connected ? (
              connectedOrigin ? (
                <>
                  Widget loaded from{' '}
                  <span className="font-mono text-[var(--ink-soft)]">
                    {connectedOrigin}
                  </span>
                  .
                </>
              ) : (
                'Widget loaded from your preview site.'
              )
            ) : (
              'Open your preview site in another tab after adding the snippet.'
            )}
          </p>

          <div className="mt-3 border-t border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--ink-mute)] font-mono uppercase">
                Script tag
              </p>
              <button
                type="button"
                onClick={copySnippet}
                className="text-xs text-[var(--accent)] font-mono bg-transparent border-none cursor-pointer"
              >
                {snippetCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <code className="block text-xs text-[var(--ink-soft)] bg-[var(--surface-2)] px-3 py-2 rounded font-mono overflow-x-auto whitespace-nowrap">
              {snippet}
            </code>
          </div>

          {rejectedOrigin && !allowedOrigins.includes(rejectedOrigin) && (
            <div className="mt-3 border-t border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pt-3">
              <p className="text-sm font-medium text-[var(--ink)] mb-1">
                {connected
                  ? 'The widget also tried to load from an origin that is not allowed'
                  : 'The widget loaded, but from an origin that is not allowed'}
              </p>
              <p className="text-xs text-[var(--ink-mute)] mb-3">
                It tried from{' '}
                <span className="font-mono text-[var(--ink-soft)]">{rejectedOrigin}</span>
                , which is not the preview URL. Allow it if that is your preview
                or dev site. Reload the page there afterwards.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" onClick={allowRejectedOrigin} disabled={allowing}>
                  {allowing ? 'Allowing…' : `Allow ${rejectedOrigin}`}
                </Button>
                {allowError && (
                  <span className="text-xs text-[var(--danger)]">{allowError}</span>
                )}
              </div>
            </div>
          )}

          {!connected && waitingSeconds >= 30 && (
            <div className="mt-3 border-t border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pt-3 text-xs text-[var(--ink-mute)]">
              <p className="font-medium text-[var(--ink)] mb-1.5">Troubleshooting</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Is the preview URL correct and reachable?</li>
                <li>Did you paste the snippet before <code>&lt;/body&gt;</code>?</li>
                <li>Check the browser console for CSP or network errors.</li>
                <li>
                  The page must load from an allowed origin — the preview URL, or
                  an origin added in project settings.
                </li>
              </ul>
            </div>
          )}

          {showTestStep && connected && (
            <div className="mt-3 border-t border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pt-3">
              <p className="text-sm font-medium text-[var(--ink)] mb-1">
                Optional: send a test pin
              </p>
              <p className="text-xs text-[var(--ink-mute)] mb-3">
                Open your preview, click the feedback button, and place one pin
                to verify the full loop.
              </p>
              <a
                href={previewTestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center px-3 py-2 rounded-full border border-[var(--line)] text-xs text-[var(--accent)] no-underline"
              >
                Open preview
              </a>
            </div>
          )}
        </div>

        <div className="mb-6">
          <SharePanel
            projectId={project.id}
            previewUrl={project.previewUrl}
            configured={shareState.configured}
            initialShares={shareState.shares}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {connected ? (
            <Button onClick={finishOnboarding} disabled={finishing}>
              {finishing ? 'Opening inbox…' : 'Go to inbox'}
            </Button>
          ) : (
            <>
              {onboarding && waitingSeconds >= 30 && (
                <Button variant="secondary" onClick={handleContinue}>
                  Continue anyway
                </Button>
              )}
              {!onboarding && (
                <Button variant="secondary" onClick={handleContinue}>
                  Skip to inbox
                </Button>
              )}
            </>
          )}
          <Link
            to="/projects/$id/inbox"
            params={{ id: project.id }}
            className="text-xs text-[var(--ink-soft)] no-underline hover:text-[var(--ink-mute)]"
          >
            Inbox
          </Link>
        </div>
      </div>
    </Layout>
  )
}
