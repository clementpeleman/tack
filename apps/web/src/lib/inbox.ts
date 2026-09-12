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
import { requireDashboardAuth } from '#/lib/auth'
import { getOwnerDisplayName, type EnrichedReply } from '#/lib/pins'
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
import type { AiLabel, AiPinInput, AiPriority } from '#/lib/ai/types'
import { resolvePlacementForDisplay, type PlacementDisplay } from '@tack/shared'

// Server side of the inbox: loader and the manual AI run. Moved out of the
// route file so the page and its panels can be small, and so nothing here can
// leak into the client bundle by accident.

export interface PinWithComment {
  id: string
  url: string
  reviewerName: string | null
  status: string
  selector: string | null
  elementText: string | null
  elementStyles: string | null
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

export interface AiRunSummary {
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

export interface AiGroupSummary {
  id: string
  title: string
  summary: string
  type: AiLabel
  priority: AiPriority
  implementationBrief: string
  pinIds: string[]
}

export interface AiInboxSummary {
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
    elementStyles: pin.elementStyles,
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

export const getProjectWithPins = createServerFn({ method: 'GET' })
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
    const { userId } = await requireDashboardAuth(request)
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
          elementStyles: pin.elementStyles,
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

export const analyzeProjectPins = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string; pinIds?: string[] }) => data)
  .handler(async ({ data }): Promise<{ runId: string; status: string }> => {
    const request = getRequest()
    const { userId } = await requireDashboardAuth(request)

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

export type { AiEntitlement }
