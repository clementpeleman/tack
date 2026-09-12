import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db/index'
import { projects, pins } from '#/db/schema'
import { eq, and } from 'drizzle-orm'
import { corsHeaders, handleCors } from '#/lib/cors'
import {
  deletePinAndRelated,
  updatePinFirstComment,
} from '#/lib/pins'
import { emitProjectEvent } from '#/lib/events'
import { parseScreenshotBase64, saveScreenshot } from '#/lib/storage'
import { enforceWidgetRateLimit } from '#/lib/rate-limit'
import { enforceWidgetOrigin, resolveRequestOrigin } from '#/lib/widget-connection'

async function authorizePin(
  pinId: string,
  projectKey: string,
  reviewerId: string,
  origin: string | null,
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.projectKey, projectKey))

  if (!project) return { error: 'Invalid project key', status: 404 as const }

  // Origin before the pin lookup: a caller outside an allowed origin must
  // not learn whether a pin id exists.
  const originError = enforceWidgetOrigin(project, origin)
  if (originError) return { response: originError }

  const [pin] = await db
    .select()
    .from(pins)
    .where(and(eq(pins.id, pinId), eq(pins.projectId, project.id)))

  if (!pin) return { error: 'Pin not found', status: 404 as const }

  if (pin.reviewerId !== reviewerId) {
    return { error: 'Not allowed to modify this pin', status: 403 as const }
  }

  return { pin, project }
}

export const Route = createFileRoute('/api/widget/pins/$pinId')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleCors(request) ?? new Response(null, { status: 204 }),

      PATCH: async ({ request, params }) => {
        const origin = resolveRequestOrigin(request)
        const headers = corsHeaders(origin)
        const cors = handleCors(request)
        if (cors) return cors

        const text = await request.text()
        let body: Record<string, unknown>
        try {
          body = JSON.parse(text)
        } catch {
          return Response.json(
            { error: 'Invalid JSON body' },
            { status: 400, headers },
          )
        }
        const { projectKey, reviewerId, comment, reviewerName, screenshot } = body as Record<string, any>

        if (!projectKey || !reviewerId) {
          return Response.json(
            { error: 'projectKey and reviewerId required' },
            { status: 400, headers },
          )
        }

        const limited = enforceWidgetRateLimit(projectKey, headers)
        if (limited) return limited

        const auth = await authorizePin(params.pinId, projectKey, reviewerId, origin)
        if ('response' in auth) return auth.response
        if ('error' in auth) {
          return Response.json({ error: auth.error }, { status: auth.status, headers })
        }

        if (typeof screenshot === 'string' && screenshot.length > 0) {
          // Screenshot follow-up: the widget posts the pin first so the
          // reviewer never waits on capture, then attaches the image here.
          // Only the first one is accepted; a pin's screenshot is immutable.
          if (auth.pin.screenshotPath) {
            return Response.json(
              { error: 'Pin already has a screenshot' },
              { status: 409, headers },
            )
          }
          const buffer = parseScreenshotBase64(screenshot)
          if (!buffer) {
            return Response.json(
              { error: 'Invalid screenshot' },
              { status: 400, headers },
            )
          }
          const screenshotPath = await saveScreenshot(
            auth.project.id,
            params.pinId,
            buffer,
          )
          await db
            .update(pins)
            .set({ screenshotPath })
            .where(eq(pins.id, params.pinId))
        } else if (typeof comment === 'string' && comment.trim()) {
          await updatePinFirstComment(
            params.pinId,
            comment.trim(),
            typeof reviewerName === 'string' ? reviewerName : undefined,
          )
        } else if (typeof reviewerName === 'string') {
          await db
            .update(pins)
            .set({ reviewerName: reviewerName || null })
            .where(eq(pins.id, params.pinId))
        } else {
          return Response.json(
            { error: 'comment or reviewerName required' },
            { status: 400, headers },
          )
        }

        const [updated] = await db
          .select()
          .from(pins)
          .where(eq(pins.id, params.pinId))

        emitProjectEvent({
          type: 'pin.updated',
          projectId: auth.project.id,
          pinId: params.pinId,
        })

        return Response.json({ pin: updated }, { headers })
      },

      DELETE: async ({ request, params }) => {
        const origin = resolveRequestOrigin(request)
        const headers = corsHeaders(origin)
        const cors = handleCors(request)
        if (cors) return cors

        const text = await request.text()
        let body: Record<string, unknown>
        try {
          body = text ? JSON.parse(text) : {}
        } catch {
          return Response.json(
            { error: 'Invalid JSON body' },
            { status: 400, headers },
          )
        }
        const { projectKey, reviewerId } = body as Record<string, any>

        if (!projectKey || !reviewerId) {
          return Response.json(
            { error: 'projectKey and reviewerId required' },
            { status: 400, headers },
          )
        }

        const limited = enforceWidgetRateLimit(projectKey, headers)
        if (limited) return limited

        const auth = await authorizePin(params.pinId, projectKey, reviewerId, origin)
        if ('response' in auth) return auth.response
        if ('error' in auth) {
          return Response.json({ error: auth.error }, { status: auth.status, headers })
        }

        await deletePinAndRelated(params.pinId)
        emitProjectEvent({
          type: 'pin.updated',
          projectId: auth.project.id,
          pinId: params.pinId,
        })
        return Response.json({ ok: true }, { headers })
      },
    },
  },
})
