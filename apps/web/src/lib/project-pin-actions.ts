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
import { eq, and, desc, isNull, asc } from 'drizzle-orm'
import { requireAuth } from '#/lib/auth'
import {
  deletePinAndRelated,
  updatePinFirstComment,
  addPinReply,
  getOwnerDisplayName,
  type EnrichedReply,
} from '#/lib/pins'
import type { ProjectNotifySettings } from '#/lib/notifications'
import type { AiLabel, AiPriority } from '#/lib/ai/types'
import { emitProjectEvent } from '#/lib/events'

export interface PinDetailData {
  id: string
  url: string
  reviewerName: string | null
  status: string
  selector: string | null
  xpath: string | null
  tackId: string | null
  elementText: string | null
  browser: string | null
  os: string | null
  screenshotPath: string | null
  xPct: number
  yPct: number
  viewportW: number
  viewportH: number
  placementState: 'anchored' | 'approximate' | 'lost' | null
  placementCheckedAt: string | null
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
  aiGroupBrief: string | null
}

async function loadLatestAiForPin(
  projectId: string,
  pinId: string,
): Promise<{
  aiLabel: AiLabel | null
  aiPriority: AiPriority | null
  aiSummary: string | null
  aiAmbiguous: boolean
  aiGroupTitle: string | null
  aiGroupBrief: string | null
}> {
  const [latestRun] = await db
    .select()
    .from(aiRuns)
    .where(and(eq(aiRuns.projectId, projectId), eq(aiRuns.status, 'completed')))
    .orderBy(desc(aiRuns.createdAt))
    .limit(1)

  if (!latestRun) {
    return {
      aiLabel: null,
      aiPriority: null,
      aiSummary: null,
      aiAmbiguous: false,
      aiGroupTitle: null,
      aiGroupBrief: null,
    }
  }

  const [insight] = await db
    .select()
    .from(aiPinInsights)
    .where(
      and(
        eq(aiPinInsights.runId, latestRun.id),
        eq(aiPinInsights.pinId, pinId),
      ),
    )

  const groupLink = await db
    .select({ groupId: aiGroupPins.groupId })
    .from(aiGroupPins)
    .where(
      and(eq(aiGroupPins.runId, latestRun.id), eq(aiGroupPins.pinId, pinId)),
    )
    .limit(1)

  let aiGroupTitle: string | null = null
  let aiGroupBrief: string | null = null
  if (groupLink[0]) {
    const [group] = await db
      .select()
      .from(aiGroups)
      .where(eq(aiGroups.id, groupLink[0].groupId))
    aiGroupTitle = group?.title ?? null
    aiGroupBrief = group?.implementationBrief ?? null
  }

  return {
    aiLabel: insight?.label ?? null,
    aiPriority: insight?.priority ?? null,
    aiSummary: insight?.summary ?? null,
    aiAmbiguous: insight?.ambiguous ?? false,
    aiGroupTitle,
    aiGroupBrief,
  }
}

export const getPinDetail = createServerFn({ method: 'GET' })
  .inputValidator((data: { projectId: string; pinId: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<{
      project: {
        id: string
        name: string
        previewUrl: string
        projectKey: string
      }
      pin: PinDetailData
      sidebarProjects: { id: string; name: string }[]
    }> => {
      const request = getRequest()
      const { userId } = await requireAuth(request)

      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, data.projectId), eq(projects.userId, userId)),
        )

      if (!project) throw new Response('Not found', { status: 404 })

      const [pin] = await db
        .select()
        .from(pins)
        .where(and(eq(pins.id, data.pinId), eq(pins.projectId, project.id)))

      if (!pin) throw new Response('Pin not found', { status: 404 })

      const ownerDisplayName = await getOwnerDisplayName(userId)
      const pinReplies = await db
        .select()
        .from(replies)
        .where(eq(replies.pinId, pin.id))
        .orderBy(asc(replies.createdAt))

      const enrichedReplies: EnrichedReply[] = pinReplies.map((reply) => ({
        id: reply.id,
        authorType: reply.authorType,
        authorName:
          reply.authorType === 'owner'
            ? ownerDisplayName
            : pin.reviewerName ?? 'Anonymous',
        body: reply.body,
        createdAt: reply.createdAt,
      }))

      const ai = await loadLatestAiForPin(project.id, pin.id)

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
        },
        pin: {
          id: pin.id,
          url: pin.url,
          reviewerName: pin.reviewerName,
          status: pin.status,
          selector: pin.selector,
          xpath: pin.xpath,
          tackId: pin.tackId,
          elementText: pin.elementText,
          browser: pin.browser,
          os: pin.os,
          screenshotPath: pin.screenshotPath,
          xPct: pin.xPct,
          yPct: pin.yPct,
          viewportW: pin.viewportW,
          viewportH: pin.viewportH,
          placementState: pin.placementState,
          placementCheckedAt: pin.placementCheckedAt,
          createdAt: pin.createdAt,
          resolvedAt: pin.resolvedAt,
          comment: enrichedReplies[0]?.body ?? null,
          replyCount: enrichedReplies.length,
          replies: enrichedReplies,
          ...ai,
        },
        sidebarProjects,
      }
    },
  )

export const deleteProjectPin = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string; pinId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    const [pin] = await db
      .select()
      .from(pins)
      .where(and(eq(pins.id, data.pinId), eq(pins.projectId, project.id)))

    if (!pin) throw new Response('Pin not found', { status: 404 })

    await deletePinAndRelated(data.pinId)
    emitProjectEvent({
      type: 'pin.updated',
      projectId: project.id,
      pinId: data.pinId,
    })
    return { ok: true }
  })

export const updatePinStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { projectId: string; pinId: string; status: 'open' | 'resolved' }) =>
      data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    const [pin] = await db
      .select()
      .from(pins)
      .where(and(eq(pins.id, data.pinId), eq(pins.projectId, project.id)))

    if (!pin) throw new Response('Pin not found', { status: 404 })

    await db
      .update(pins)
      .set({
        status: data.status,
        resolvedAt:
          data.status === 'resolved' ? new Date().toISOString() : null,
      })
      .where(eq(pins.id, data.pinId))

    emitProjectEvent({
      type: 'pin.updated',
      projectId: project.id,
      pinId: data.pinId,
    })

    return { ok: true }
  })

export const updateProjectPin = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { projectId: string; pinId: string; comment: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    const [pin] = await db
      .select()
      .from(pins)
      .where(and(eq(pins.id, data.pinId), eq(pins.projectId, project.id)))

    if (!pin) throw new Response('Pin not found', { status: 404 })

    await updatePinFirstComment(data.pinId, data.comment.trim())
    emitProjectEvent({
      type: 'pin.updated',
      projectId: project.id,
      pinId: data.pinId,
    })
    return { ok: true }
  })

export const addOwnerReply = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { projectId: string; pinId: string; body: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    const [pin] = await db
      .select()
      .from(pins)
      .where(and(eq(pins.id, data.pinId), eq(pins.projectId, project.id)))

    if (!pin) throw new Response('Pin not found', { status: 404 })

    if (!data.body.trim()) throw new Error('Reply body required')

    await addPinReply({
      pinId: data.pinId,
      authorType: 'owner',
      authorId: userId,
      body: data.body.trim(),
    })

    const { enqueueNotification } = await import('#/lib/notifications')
    await enqueueNotification(project.id, data.pinId, 'reply')

    emitProjectEvent({
      type: 'reply.created',
      projectId: project.id,
      pinId: data.pinId,
    })

    return { ok: true }
  })

export const getProjectConnectionStatus = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.id), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    return {
      connected: Boolean(project.firstWidgetSeenAt),
      firstWidgetSeenAt: project.firstWidgetSeenAt,
    }
  })

export type { ProjectNotifySettings }
