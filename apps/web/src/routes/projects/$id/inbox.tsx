import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { db } from '#/db/index'
import {
  aiGroupPins,
  aiGroups,
  aiPinInsights,
  aiRuns,
  projects,
  pins,
  replies,
} from '#/db/schema'
import { eq, and, desc, inArray, isNull, gte } from 'drizzle-orm'
import { requireAuth } from '#/lib/auth'
import {
  getOwnerDisplayName,
  type EnrichedReply,
} from '#/lib/pins'
import type { ProjectNotifySettings } from '#/lib/notifications'
import {
  calculateRunCostCents,
  canStartAiRun,
  estimateTokensFromText,
  getAiBudgetConfig,
} from '#/lib/ai/cost'
import { analyzePinsWithOpenAI, createAiInboxPrompt } from '#/lib/ai/openai'
import {
  aiEntitlementMessage,
  getAiEntitlement,
  type AiEntitlement,
} from '#/lib/ai/entitlement'
import { buildAgentPrompt } from '#/lib/agent-prompt'
import type { AiLabel, AiPinInput, AiPriority } from '#/lib/ai/types'
import { Layout } from '#/components/Layout'
import { PinRow } from '#/components/PinRow'
import { resolvePlacementForDisplay, type PlacementDisplay } from '@tack/shared'
import { useState, useEffect } from 'react'
import {
  AlertCircle,
  Bookmark,
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  Inbox,
  ListChecks,
} from 'lucide-react'

interface PinWithComment {
  id: string
  url: string
  reviewerName: string | null
  status: string
  selector: string | null
  elementText: string | null
  browser: string | null
  os: string | null
  screenshotPath: string | null
  xPct: number
  yPct: number
  viewportW: number
  viewportH: number
  createdAt: string
  resolvedAt: string | null
  comment: string | null
  replyCount: number
  replies: EnrichedReply[]
  aiLabel: AiLabel | null
  aiPriority: AiPriority | null
  aiSummary: string | null
  aiAmbiguous: boolean
  aiGroupTitle: string | null
  tackId: string | null
  xpath: string | null
  placement: PlacementDisplay
}

interface AiRunSummary {
  id: string
  status: string
  model: string
  pinCount: number
  inputTokens: number
  outputTokens: number
  estimatedCostCents: number
  actualCostCents: number
  error: string | null
  createdAt: string
  completedAt: string | null
}

interface AiGroupSummary {
  id: string
  title: string
  summary: string
  type: AiLabel
  priority: AiPriority
  implementationBrief: string
  pinIds: string[]
}

interface AiInboxSummary {
  latestRun: AiRunSummary | null
  groups: AiGroupSummary[]
}

type DbPin = typeof pins.$inferSelect
type DbReply = typeof replies.$inferSelect

function monthStartForSql(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
}

function getFirstReplyBody(pinId: string, repliesByPin: Map<string, DbReply[]>) {
  return repliesByPin.get(pinId)?.[0]?.body ?? ''
}

function toAiPinInput(pin: DbPin, repliesByPin: Map<string, DbReply[]>): AiPinInput {
  return {
    id: pin.id,
    url: pin.url,
    comment: getFirstReplyBody(pin.id, repliesByPin),
    reviewerName: pin.reviewerName,
    selector: pin.selector,
    elementText: pin.elementText,
    browser: pin.browser,
    viewport: `${pin.viewportW}x${pin.viewportH} at ${pin.xPct.toFixed(1)}%, ${pin.yPct.toFixed(1)}%`,
  }
}

async function loadAiInbox(projectId: string): Promise<AiInboxSummary> {
  const [latestRun] = await db
    .select()
    .from(aiRuns)
    .where(eq(aiRuns.projectId, projectId))
    .orderBy(desc(aiRuns.createdAt))
    .limit(1)

  if (!latestRun) {
    return { latestRun: null, groups: [] }
  }

  const runGroups = await db
    .select()
    .from(aiGroups)
    .where(eq(aiGroups.runId, latestRun.id))
    .orderBy(desc(aiGroups.createdAt))

  const groupIds = runGroups.map((group) => group.id)
  const linkedPins =
    groupIds.length > 0
      ? await db
          .select()
          .from(aiGroupPins)
          .where(inArray(aiGroupPins.groupId, groupIds))
      : []

  const pinIdsByGroup = new Map<string, string[]>()
  for (const link of linkedPins) {
    const arr = pinIdsByGroup.get(link.groupId) ?? []
    arr.push(link.pinId)
    pinIdsByGroup.set(link.groupId, arr)
  }

  return {
    latestRun: {
      id: latestRun.id,
      status: latestRun.status,
      model: latestRun.model,
      pinCount: latestRun.pinCount,
      inputTokens: latestRun.inputTokens,
      outputTokens: latestRun.outputTokens,
      estimatedCostCents: latestRun.estimatedCostCents,
      actualCostCents: latestRun.actualCostCents,
      error: latestRun.error,
      createdAt: latestRun.createdAt,
      completedAt: latestRun.completedAt,
    },
    groups: runGroups.map((group) => ({
      id: group.id,
      title: group.title,
      summary: group.summary,
      type: group.type,
      priority: group.priority,
      implementationBrief: group.implementationBrief,
      pinIds: pinIdsByGroup.get(group.id) ?? [],
    })),
  }
}

const getProjectWithPins = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<{
    project: {
      id: string
      name: string
      previewUrl: string
      projectKey: string
      appOrigin: string
      settings: ProjectNotifySettings
    }
    pins: PinWithComment[]
    aiInbox: AiInboxSummary
    aiEntitlement: AiEntitlement
    sidebarProjects: { id: string; name: string }[]
  }> => {
    const request = getRequest()
    const { userId } = await requireAuth(request)
    const appOrigin = new URL(request.url).origin

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.id), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    const projectPins = await db
      .select()
      .from(pins)
      .where(eq(pins.projectId, project.id))
      .orderBy(desc(pins.createdAt))

    const pinIds = projectPins.map((p) => p.id)
    const allReplies =
      pinIds.length > 0
        ? await db.select().from(replies).where(inArray(replies.pinId, pinIds))
        : []

    const repliesByPin = new Map<string, typeof allReplies>()
    for (const reply of allReplies) {
      const arr = repliesByPin.get(reply.pinId) ?? []
      arr.push(reply)
      repliesByPin.set(reply.pinId, arr)
    }

    const aiInbox = await loadAiInbox(project.id)
    const latestInsights =
      aiInbox.latestRun !== null
        ? await db
            .select()
            .from(aiPinInsights)
            .where(eq(aiPinInsights.runId, aiInbox.latestRun.id))
        : []
    const insightsByPin = new Map(latestInsights.map((insight) => [insight.pinId, insight]))
    const groupTitleByPin = new Map<string, string>()
    for (const group of aiInbox.groups) {
      for (const pinId of group.pinIds) {
        groupTitleByPin.set(pinId, group.title)
      }
    }

    const ownerDisplayName = await getOwnerDisplayName(userId)

    const pinsWithComments: PinWithComment[] = await Promise.all(
      projectPins.map(async (pin) => {
        const pinReplies = (repliesByPin.get(pin.id) ?? [])
          .slice()
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          .map((reply) => ({
            id: reply.id,
            authorType: reply.authorType,
            authorName:
              reply.authorType === 'owner'
                ? ownerDisplayName
                : pin.reviewerName ?? 'Anonymous',
            body: reply.body,
            createdAt: reply.createdAt,
          }))

        return {
          id: pin.id,
          url: pin.url,
          reviewerName: pin.reviewerName,
          status: pin.status,
          selector: pin.selector,
          elementText: pin.elementText,
          tackId: pin.tackId,
          xpath: pin.xpath,
          placement: resolvePlacementForDisplay({
            tackId: pin.tackId,
            selector: pin.selector,
            xpath: pin.xpath,
            placementState: pin.placementState,
            placementCheckedAt: pin.placementCheckedAt,
          }),
          browser: pin.browser,
          os: pin.os,
          screenshotPath: pin.screenshotPath,
          xPct: pin.xPct,
          yPct: pin.yPct,
          viewportW: pin.viewportW,
          viewportH: pin.viewportH,
          createdAt: pin.createdAt,
          resolvedAt: pin.resolvedAt,
          comment: pinReplies[0]?.body ?? null,
          replyCount: pinReplies.length,
          replies: pinReplies,
          aiLabel: insightsByPin.get(pin.id)?.label ?? null,
          aiPriority: insightsByPin.get(pin.id)?.priority ?? null,
          aiSummary: insightsByPin.get(pin.id)?.summary ?? null,
          aiAmbiguous: insightsByPin.get(pin.id)?.ambiguous ?? false,
          aiGroupTitle: groupTitleByPin.get(pin.id) ?? null,
        }
      }),
    )

    const sidebarProjects = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))

    return {
      project: {
        id: project.id,
        name: project.name,
        previewUrl: project.previewUrl,
        projectKey: project.projectKey,
        appOrigin,
        settings: (project.settings ?? {}) as ProjectNotifySettings,
      },
      pins: pinsWithComments,
      aiInbox,
      aiEntitlement: getAiEntitlement(),
      sidebarProjects,
    }
  })

const analyzeProjectPins = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string; pinIds?: string[] }) => data)
  .handler(async ({ data }): Promise<{ runId: string; status: string }> => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    const entitlement = getAiEntitlement()
    if (!entitlement.entitled && entitlement.reason) {
      throw new Error(aiEntitlementMessage(entitlement.reason))
    }

    const conditions = [eq(pins.projectId, project.id)]
    if (data.pinIds && data.pinIds.length > 0) {
      conditions.push(inArray(pins.id, data.pinIds))
    }

    const projectPins = await db
      .select()
      .from(pins)
      .where(and(...conditions))
      .orderBy(desc(pins.createdAt))

    const pinIds = projectPins.map((pin) => pin.id)
    const allReplies =
      pinIds.length > 0
        ? await db.select().from(replies).where(inArray(replies.pinId, pinIds))
        : []

    const repliesByPin = new Map<string, DbReply[]>()
    for (const reply of allReplies) {
      const arr = repliesByPin.get(reply.pinId) ?? []
      arr.push(reply)
      repliesByPin.set(reply.pinId, arr)
    }

    const model = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini'
    const aiPins = projectPins.map((pin) => toAiPinInput(pin, repliesByPin))

    if (aiPins.length === 0) {
      const [run] = await db
        .insert(aiRuns)
        .values({
          projectId: project.id,
          status: 'completed',
          triggerType: 'manual',
          model,
          pinCount: 0,
          completedAt: new Date().toISOString(),
        })
        .returning()
      return { runId: run.id, status: run.status }
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        'AI analysis needs an OpenAI key on the server. Add OPENAI_API_KEY, then run Analyze pins again.',
      )
    }

    const monthRuns = await db
      .select()
      .from(aiRuns)
      .where(and(eq(aiRuns.projectId, project.id), gte(aiRuns.createdAt, monthStartForSql())))
    const currentMonthCostCents = monthRuns.reduce(
      (total, run) => total + run.actualCostCents,
      0,
    )
    const estimatedInputTokens = estimateTokensFromText(createAiInboxPrompt(aiPins))
    const estimatedCostCents = calculateRunCostCents({
      model,
      inputTokens: estimatedInputTokens,
      outputTokens: 1200,
    })
    const budgetCheck = canStartAiRun({
      currentMonthCostCents,
      estimatedJobCostCents: estimatedCostCents,
      budget: getAiBudgetConfig(),
    })

    if (!budgetCheck.ok) {
      const [run] = await db
        .insert(aiRuns)
        .values({
          projectId: project.id,
          status: 'failed',
          triggerType: 'manual',
          model,
          pinCount: aiPins.length,
          estimatedCostCents,
          error: budgetCheck.reason,
          completedAt: new Date().toISOString(),
        })
        .returning()
      throw new Error(`${budgetCheck.reason} Run ${run.id} was not started.`)
    }

    const [run] = await db
      .insert(aiRuns)
      .values({
        projectId: project.id,
        status: 'running',
        triggerType: 'manual',
        model,
        pinCount: aiPins.length,
        estimatedCostCents,
      })
      .returning()

    try {
      const { result, usage } = await analyzePinsWithOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model,
        pins: aiPins,
        maxOutputTokens: 1200,
      })
      const actualCostCents = calculateRunCostCents({
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      })

      for (const insight of result.pins) {
        await db.insert(aiPinInsights).values({
          runId: run.id,
          pinId: insight.pinId,
          label: insight.label,
          priority: insight.priority,
          summary: insight.summary,
          ambiguous: insight.ambiguous,
        })
      }

      for (const group of result.groups) {
        const [insertedGroup] = await db
          .insert(aiGroups)
          .values({
            runId: run.id,
            projectId: project.id,
            title: group.title,
            summary: group.summary,
            type: group.type,
            priority: group.priority,
            implementationBrief: group.implementationBrief,
          })
          .returning()

        if (group.pinIds.length > 0) {
          await db.insert(aiGroupPins).values(
            group.pinIds.map((pinId) => ({
              groupId: insertedGroup.id,
              pinId,
              runId: run.id,
            })),
          )
        }
      }

      await db
        .update(aiRuns)
        .set({
          status: 'completed',
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          actualCostCents,
          completedAt: new Date().toISOString(),
        })
        .where(eq(aiRuns.id, run.id))

      return { runId: run.id, status: 'completed' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI analysis failed'
      await db
        .update(aiRuns)
        .set({
          status: 'failed',
          error: message,
          completedAt: new Date().toISOString(),
        })
        .where(eq(aiRuns.id, run.id))
      throw new Error(message)
    }
  })

export const Route = createFileRoute('/projects/$id/inbox')({
  component: InboxPage,
  loader: ({ params }) => getProjectWithPins({ data: { id: params.id } }),
})

function InboxPage() {
  const { project, pins: projectPins, aiInbox, aiEntitlement, sidebarProjects } =
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
    >
      <div className="max-w-[1180px]">
        <div className="sr-only" role="status" aria-live="polite">
          {copyStatus}
        </div>
        <header className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-mono uppercase text-[var(--ink-soft)]">
                <Inbox size={12} strokeWidth={1.8} aria-hidden="true" />
                Feedback inbox
              </p>
              <h1 className="text-2xl font-semibold text-[var(--ink)]">
                {project.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--ink-mute)]">
                Collect pinned feedback from the preview site, then turn useful
                comments into reviewable work.
              </p>
            </div>
            {hasPins && (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={project.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--ink)] no-underline transition-colors hover:bg-[var(--surface-2)] sm:min-h-10"
                >
                  <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
                  Open preview
                </a>
                {aiEntitlement.entitled && (
                  <button
                    type="button"
                    onClick={analyzePins}
                    disabled={analyzing}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[color-mix(in_oklab,var(--accent)_18%,var(--accent))] bg-[var(--accent)] px-3 text-xs font-medium text-[var(--on-accent)] shadow-[0_1px_1px_color-mix(in_oklab,var(--accent)_24%,transparent)] transition-colors hover:bg-[var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10"
                  >
                    <ListChecks size={14} strokeWidth={1.8} aria-hidden="true" />
                    {analyzing ? 'Analyzing' : 'Analyze pins'}
                  </button>
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
              <AiInboxPanel
                entitled={aiEntitlement.entitled}
                entitlementReason={aiEntitlement.reason}
                aiInbox={aiInbox}
                error={aiError}
                onCopyForAgent={copyAgentPrompt}
                agentPromptCopied={copyStatus === 'Agent prompt copied'}
              />
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

function ZeroPinOnboarding({
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
          <button
            type="button"
            onClick={copySnippet}
            className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-xs font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-2)]"
          >
            {scriptCopied ? (
              <Check size={14} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Copy size={14} strokeWidth={1.8} aria-hidden="true" />
            )}
            {scriptCopied ? 'Script copied' : 'Copy script tag'}
          </button>
          <code className="block overflow-x-auto whitespace-nowrap rounded-md bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink-soft)] font-mono">
            {snippet}
          </code>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <button
            type="button"
            onClick={copyBookmarklet}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-xs font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-2)]"
          >
            {bookmarkletCopied ? (
              <Check size={14} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Copy size={14} strokeWidth={1.8} aria-hidden="true" />
            )}
            {bookmarkletCopied ? 'Bookmarklet copied' : 'Copy bookmarklet URL'}
          </button>
          <BookmarkletLink href={bookmarklet} label={`Tack: ${projectName}`} />
        </div>
      )}

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--ink)] no-underline transition-colors hover:bg-[var(--surface-2)]"
        >
          <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
          Open preview after installing
        </a>
      </div>
    </section>
  )
}

function FilterControls({
  openCount,
  resolvedCount,
  statusFilter,
  onChange,
}: {
  openCount: number
  resolvedCount: number
  statusFilter: 'all' | 'open' | 'resolved'
  onChange: (filter: 'all' | 'open' | 'resolved') => void
}) {
  return (
    <div
      className="inline-flex rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-0.5"
      role="group"
      aria-label="Filter pins"
    >
      {(['all', 'open', 'resolved'] as const).map((filter) => (
        <button
          key={filter}
          type="button"
          aria-pressed={statusFilter === filter}
          onClick={() => onChange(filter)}
          className={`min-h-11 rounded px-3 text-xs font-mono uppercase transition-colors sm:min-h-9 ${
            statusFilter === filter
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_1px_color-mix(in_oklab,var(--ink)_7%,transparent)]'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink-mute)]'
          }`}
        >
          {filter}
          {filter !== 'all' && (
            <span className="ml-1 text-[var(--ink-mute)]">
              {filter === 'open' ? openCount : resolvedCount}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function InstallModeTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: 'snippet' | 'bookmarklet'
  onTabChange: (tab: 'snippet' | 'bookmarklet') => void
}) {
  return (
    <div
      className="inline-flex rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-0.5"
      role="group"
      aria-label="Choose install method"
    >
      <button
        type="button"
        aria-pressed={activeTab === 'snippet'}
        onClick={() => onTabChange('snippet')}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded px-2.5 text-xs font-mono uppercase transition-colors sm:min-h-9 ${
          activeTab === 'snippet'
            ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_1px_color-mix(in_oklab,var(--ink)_7%,transparent)]'
            : 'text-[var(--ink-soft)] hover:text-[var(--ink-mute)]'
        }`}
      >
        <Code2 size={13} strokeWidth={1.8} aria-hidden="true" />
        Script
      </button>
      <button
        type="button"
        aria-pressed={activeTab === 'bookmarklet'}
        onClick={() => onTabChange('bookmarklet')}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded px-2.5 text-xs font-mono uppercase transition-colors sm:min-h-9 ${
          activeTab === 'bookmarklet'
            ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_1px_color-mix(in_oklab,var(--ink)_7%,transparent)]'
            : 'text-[var(--ink-soft)] hover:text-[var(--ink-mute)]'
        }`}
      >
        <Bookmark size={13} strokeWidth={1.8} aria-hidden="true" />
        Quick pass
      </button>
    </div>
  )
}

function Metric({
  label,
  value,
  tone = 'ink',
}: {
  label: string
  value: string
  tone?: 'ink' | 'accent' | 'pin' | 'signal' | 'danger'
}) {
  const toneClass = {
    ink: 'text-[var(--ink)]',
    accent: 'text-[var(--accent)]',
    pin: 'text-[var(--pin)]',
    signal: 'text-[var(--signal)]',
    danger: 'text-[var(--danger)]',
  }[tone]

  return (
    <div className="border-b border-[var(--line)] p-3 md:border-r md:border-b-0 md:last:border-r-0">
      <p className="text-[11px] font-mono uppercase text-[var(--ink-soft)]">
        {label}
      </p>
      <p className={`mt-1 truncate text-sm font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  )
}

function ConnectPanel({
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
          <button
            type="button"
            onClick={copyBookmarklet}
            className="mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-2)]"
          >
            {bookmarkletCopied ? (
              <Check size={13} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Copy size={13} strokeWidth={1.8} aria-hidden="true" />
            )}
            {bookmarkletCopied ? 'Bookmarklet copied' : 'Copy bookmarklet URL'}
          </button>
          <BookmarkletLink href={bookmarklet} label={label} />
        </div>
      )}
    </section>
  )
}

function AiInboxPanel({
  entitled,
  entitlementReason,
  aiInbox,
  error,
  onCopyForAgent,
  agentPromptCopied,
}: {
  entitled: boolean
  entitlementReason: 'disabled' | 'missing_key' | null
  aiInbox: AiInboxSummary
  error: string | null
  onCopyForAgent: (group: AiGroupSummary) => void
  agentPromptCopied: boolean
}) {
  const latestRun = aiInbox.latestRun
  const runError = entitled
    ? formatAiError(error ?? latestRun?.error ?? null)
    : null

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink)]">
            <ListChecks size={14} strokeWidth={1.8} aria-hidden="true" />
            AI Inbox
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-mute)]">
            Labels, duplicates, priority and implementation briefs for review.
          </p>
        </div>
        {entitled && latestRun?.completedAt && (
          <span className="shrink-0 text-[10px] text-[var(--ink-soft)] font-mono">
            {formatTimeAgo(latestRun.completedAt)}
          </span>
        )}
      </div>

      {!entitled ? (
        <div className="mb-3 flex gap-2 rounded-md border border-[color-mix(in_oklab,var(--accent)_18%,var(--line))] bg-[color-mix(in_oklab,var(--accent)_6%,var(--surface))] p-3">
          <FileCode2
            size={14}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-[var(--ink-mute)]">
            {entitlementReason === 'disabled' ? (
              <>
                AI Inbox is off. Set{' '}
                <code className="font-mono text-[var(--ink)]">TACK_AI_ENABLED=true</code>{' '}
                and{' '}
                <code className="font-mono text-[var(--ink)]">OPENAI_API_KEY</code>{' '}
                on the server to enable manual analysis. Pins can still be
                reviewed without AI.
              </>
            ) : (
              <>
                Add <code className="font-mono text-[var(--ink)]">OPENAI_API_KEY</code>{' '}
                on the server to enable manual analysis. Pins can still be
                reviewed without AI.
              </>
            )}
          </p>
        </div>
      ) : latestRun ? (
        <div className="mb-3 rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <RunStatusBadge status={latestRun.status} />
            {latestRun.status !== 'failed' && (
              <span className="text-[10px] text-[var(--ink-soft)] font-mono">
                {latestRun.actualCostCents.toFixed(3)} cents
              </span>
            )}
          </div>
          {latestRun.status !== 'failed' && (
            <p className="truncate text-xs text-[var(--ink-mute)] font-mono">
              {latestRun.model} · {latestRun.pinCount} pins
            </p>
          )}
        </div>
      ) : (
        <div className="mb-3 rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] p-3">
          <p className="text-xs text-[var(--ink-mute)]">
            Run Analyze pins after feedback arrives. Analysis is manual and
            cost-capped.
          </p>
        </div>
      )}

      {runError && (
        <div className="mb-3 flex gap-2 rounded-md border border-[color-mix(in_oklab,var(--danger)_24%,var(--line))] bg-[color-mix(in_oklab,var(--danger)_7%,var(--surface))] p-3">
          <AlertCircle
            size={14}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0 text-[var(--danger)]"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-[var(--danger)]">
            {runError}
          </p>
        </div>
      )}

      {aiInbox.groups.length > 0 && entitled ? (
        <div className="space-y-3">
          {aiInbox.groups.map((group) => (
            <div
              key={group.id}
              className="rounded-md border border-[color-mix(in_oklab,var(--ink)_8%,transparent)] bg-[var(--surface-2)] p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <AiBadge value={group.type} />
                <PriorityBadge value={group.priority} />
                <span className="text-[10px] text-[var(--ink-soft)] font-mono">
                  {group.pinIds.length} pin{group.pinIds.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--ink)]">
                {group.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-mute)]">
                {group.summary}
              </p>
              <div className="mt-3 border-t border-[color-mix(in_oklab,var(--ink)_8%,transparent)] pt-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-mono uppercase text-[var(--ink-soft)]">
                    Implementation brief
                  </p>
                  <button
                    type="button"
                    onClick={() => onCopyForAgent(group)}
                    className="inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-mute)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                  >
                    {agentPromptCopied ? (
                      <Check size={11} strokeWidth={1.8} aria-hidden="true" />
                    ) : (
                      <Copy size={11} strokeWidth={1.8} aria-hidden="true" />
                    )}
                    {agentPromptCopied ? 'Copied' : 'Copy for agent'}
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
                  {group.implementationBrief}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : entitled ? (
        <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
          No duplicate groups yet. Completed runs will show implementation
          briefs here.
        </p>
      ) : null}
    </section>
  )
}

function AiBadge({ value }: { value: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent-2)]">
      {value}
    </span>
  )
}

function PriorityBadge({ value }: { value: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[color-mix(in_oklab,var(--warn)_14%,transparent)] text-[var(--warn)]">
      {formatBadgeText(value)}
    </span>
  )
}

function formatBadgeText(value: string): string {
  return value.replaceAll('_', ' ')
}

function formatAiError(message: string | null): string | null {
  if (!message) return null
  if (message.includes('OPENAI_API_KEY')) {
    return 'AI analysis needs an OpenAI key on the server. Add OPENAI_API_KEY, then run Analyze pins again.'
  }
  return message
}

function RunStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed:
      'bg-[color-mix(in_oklab,var(--signal)_16%,transparent)] text-[var(--signal)]',
    failed:
      'bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-[var(--danger)]',
    running:
      'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]',
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${styles[status] ?? styles.running}`}
    >
      {formatBadgeText(status)}
    </span>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function BookmarkletLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={href}
        draggable="true"
        onClick={(event) => event.preventDefault()}
        className="inline-flex min-h-11 cursor-grab items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-xs font-medium text-[var(--on-accent)] no-underline transition-colors hover:bg-[var(--accent-2)] active:cursor-grabbing sm:min-h-10"
      >
        {label}
      </a>
      <span className="text-[10px] text-[var(--ink-soft)] font-mono">
        Drag to bookmarks bar
      </span>
    </div>
  )
}
