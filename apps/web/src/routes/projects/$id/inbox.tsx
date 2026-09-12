import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ExternalLink, ListChecks } from 'lucide-react'
import { Layout } from '#/components/Layout'
import { PinRow } from '#/components/PinRow'
import { Button } from '#/components/ui/Button'
import {
  analyzeProjectPins,
  getProjectWithPins,
  type AiGroupSummary,
  type PinWithComment,
} from '#/lib/inbox'
import { buildAgentPrompt } from '#/lib/agent-prompt'
import { getCurrentUser } from '#/lib/user'
import { AiInboxPanel } from '#/components/inbox/AiInboxPanel'
import { ConnectPanel } from '#/components/inbox/ConnectPanel'
import { FilterControls } from '#/components/inbox/FilterControls'
import { Metric } from '#/components/inbox/Metric'
import { ZeroPinOnboarding } from '#/components/inbox/ZeroPinOnboarding'

export const Route = createFileRoute('/projects/$id/inbox')({
  component: InboxPage,
  loader: async ({ params }) => {
    const [data, user] = await Promise.all([
      getProjectWithPins({ data: { id: params.id } }),
      getCurrentUser(),
    ])
    return { ...data, userEmail: user.email }
  },
})

function InboxPage() {
  const { project, pins: projectPins, aiInbox, aiEntitlement, sidebarProjects, userEmail } =
    Route.useLoaderData()
  const router = useRouter()
  const [copyStatus, setCopyStatus] = useState('')
  const [activeTab, setActiveTab] = useState<'snippet' | 'bookmarklet'>('snippet')
  const [analyzing, setAnalyzing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>(
    'all',
  )

  useEffect(() => {
    const es = new EventSource(`/api/projects/${project.id}/events`)
    es.onmessage = () => {
      if (document.visibilityState === 'visible') {
        void router.invalidate()
      }
    }
    return () => es.close()
  }, [project.id, router])

  const tackOrigin = project.appOrigin
  const snippet = `<script src="${tackOrigin}/tack-widget.js" data-project="${project.projectKey}" data-api="${tackOrigin}"></script>`
  const bookmarklet = `javascript:void((function(){if(document.getElementById('tack-widget-host'))return;var s=document.createElement('script');s.src='${tackOrigin}/tack-widget.js';s.setAttribute('data-project','${project.projectKey}');s.setAttribute('data-api','${tackOrigin}');document.body.appendChild(s)})())`

  const copyText = (value: string, label: string) => {
    navigator.clipboard.writeText(value)
    setCopyStatus(`${label} copied`)
    setTimeout(() => setCopyStatus(''), 2400)
  }

  const copySnippet = () => copyText(snippet, 'Script tag')
  const copyBookmarklet = () => copyText(bookmarklet, 'Bookmarklet')

  const copyAgentPrompt = (group: AiGroupSummary) => {
    const pinById = new Map(projectPins.map((pin: PinWithComment) => [pin.id, pin]))
    const groupPins = group.pinIds
      .map((id) => pinById.get(id))
      .filter((pin): pin is PinWithComment => Boolean(pin))
      .map((pin) => ({
        id: pin.id,
        url: pin.url,
        comment: pin.comment,
        reviewerName: pin.reviewerName,
        selector: pin.selector,
        xpath: pin.xpath,
        tackId: pin.tackId,
        elementText: pin.elementText,
        elementStyles: pin.elementStyles,
        browser: pin.browser,
        os: pin.os,
        xPct: pin.xPct,
        yPct: pin.yPct,
        viewportW: pin.viewportW,
        viewportH: pin.viewportH,
        screenshotUrl: pin.screenshotPath
          ? `${tackOrigin}/api/screenshots/${project.projectKey}/${pin.id}`
          : null,
      }))
    copyText(buildAgentPrompt(group, groupPins), 'Agent prompt')
  }

  const analyzePins = async () => {
    setAnalyzing(true)
    setAiError(null)
    try {
      await analyzeProjectPins({ data: { projectId: project.id } })
      await router.invalidate()
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI analysis failed')
      await router.invalidate()
    } finally {
      setAnalyzing(false)
    }
  }

  const filteredPins = projectPins.filter((p: PinWithComment) => {
    if (statusFilter === 'all') return true
    return p.status === statusFilter
  })
  const hasPins = projectPins.length > 0
  const openCount = projectPins.filter(
    (p: PinWithComment) => p.status === 'open',
  ).length
  const resolvedCount = projectPins.filter(
    (p: PinWithComment) => p.status === 'resolved',
  ).length

  return (
    <Layout
      projectId={project.id}
      projectName={project.name}
      sidebarProjects={sidebarProjects}
      userEmail={userEmail}
    >
      <div className="max-w-[1180px]">
        <div className="sr-only" role="status" aria-live="polite">
          {copyStatus}
        </div>
        <header className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-page-title">Inbox</h1>
              <p className="mt-1 text-sm text-[var(--ink-mute)]">
                {hasPins
                  ? `${openCount} open · ${resolvedCount} resolved`
                  : 'No feedback yet.'}
              </p>
            </div>
            {hasPins && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  href={project.previewUrl}
                  variant="secondary"
                  size="sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
                  Open preview
                </Button>
                {aiEntitlement.entitled && (
                  <Button size="sm" onClick={analyzePins} disabled={analyzing}>
                    <ListChecks size={14} strokeWidth={1.8} aria-hidden="true" />
                    {analyzing ? 'Analyzing' : 'Analyze pins'}
                  </Button>
                )}
              </div>
            )}
          </div>

          {hasPins && (
            <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] md:grid-cols-4">
              <Metric label="Pins" value={projectPins.length.toString()} />
              <Metric label="Open" value={openCount.toString()} tone="pin" />
              <Metric label="Resolved" value={resolvedCount.toString()} tone="signal" />
              <Metric
                label="AI groups"
                value={aiInbox.groups.length.toString()}
                tone="accent"
              />
            </div>
          )}
        </header>

        {!hasPins ? (
          <div className="max-w-3xl">
            <ZeroPinOnboarding
              activeTab={activeTab}
              bookmarklet={bookmarklet}
              bookmarkletCopied={copyStatus === 'Bookmarklet copied'}
              copyBookmarklet={copyBookmarklet}
              copySnippet={copySnippet}
              previewUrl={project.previewUrl}
              projectName={project.name}
              scriptCopied={copyStatus === 'Script tag copied'}
              snippet={snippet}
              onTabChange={setActiveTab}
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <section className="min-w-0">
              <div className="mb-3 flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">Pins</p>
                  <p className="text-xs text-[var(--ink-mute)]">
                    Sorted by latest client activity.
                  </p>
                </div>
                <FilterControls
                  openCount={openCount}
                  resolvedCount={resolvedCount}
                  statusFilter={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>

              {filteredPins.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center">
                  <p className="text-sm text-[var(--ink-mute)]">
                    No {statusFilter} pins
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
                  {filteredPins.map((pin: PinWithComment, i: number) => (
                    <PinRow
                      key={pin.id}
                      projectId={project.id}
                      pin={pin}
                      index={filteredPins.length - i - 1}
                      projectKey={project.projectKey}
                    />
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              {aiEntitlement.entitled && (
              <AiInboxPanel
                entitled={aiEntitlement.entitled}
                entitlementReason={aiEntitlement.reason}
                aiInbox={aiInbox}
                error={aiError}
                onCopyForAgent={copyAgentPrompt}
                agentPromptCopied={copyStatus === 'Agent prompt copied'}
              />
              )}
              <ConnectPanel
                activeTab={activeTab}
                bookmarklet={bookmarklet}
                bookmarkletCopied={copyStatus === 'Bookmarklet copied'}
                copyBookmarklet={copyBookmarklet}
                copySnippet={copySnippet}
                label={`Tack: ${project.name}`}
                onTabChange={setActiveTab}
                scriptCopied={copyStatus === 'Script tag copied'}
                snippet={snippet}
              />
            </aside>
          </div>
        )}
      </div>
    </Layout>
  )
}
