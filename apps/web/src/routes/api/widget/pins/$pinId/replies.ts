import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db/index'
import { projects, pins } from '#/db/schema'
import { eq, and } from 'drizzle-orm'
import { corsHeaders, handleCors } from '#/lib/cors'
import { addPinReply, enrichRepliesForPin } from '#/lib/pins'
import { enqueueNotification } from '#/lib/notifications'
import { emitProjectEvent } from '#/lib/events'
import { enforceWidgetRateLimit } from '#/lib/rate-limit'

async function authorizePinAccess(pinId: string, projectKey: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.projectKey, projectKey))

  if (!project) return { error: 'Invalid project key', status: 404 as const }

  const [pin] = await db
    .select()
    .from(pins)
    .where(and(eq(pins.id, pinId), eq(pins.projectId, project.id)))

  if (!pin) return { error: 'Pin not found', status: 404 as const }

  return { pin, project }
}

export const Route = createFileRoute('/api/widget/pins/$pinId/replies')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        handleCors(request) ?? new Response(null, { status: 204 }),

      GET: async ({ request, params }) => {
        const origin = request.headers.get('origin')
        const headers = corsHeaders(origin)
        const cors = handleCors(request)
        if (cors) return cors

        const url = new URL(request.url)
        const projectKey = url.searchParams.get('projectKey')

        if (!projectKey) {
          return Response.json(
            { error: 'projectKey required' },
            { status: 400, headers },
          )
        }

        const limited = enforceWidgetRateLimit(projectKey, headers)
        if (limited) return limited

        const auth = await authorizePinAccess(params.pinId, projectKey)
        if ('error' in auth) {
          return Response.json({ error: auth.error }, { status: auth.status, headers })
        }

        const repliesList = await enrichRepliesForPin(auth.pin)
        return Response.json({ replies: repliesList }, { headers })
      },

      POST: async ({ request, params }) => {
        const origin = request.headers.get('origin')
        const headers = corsHeaders(origin)
        const cors = handleCors(request)
        if (cors) return cors

        const text = await request.text()
        const body = JSON.parse(text)
        const { projectKey, reviewerId, comment, reviewerName } = body

        if (!projectKey || !reviewerId || !comment?.trim()) {
          return Response.json(
            { error: 'projectKey, reviewerId, and comment required' },
            { status: 400, headers },
          )
        }

        const limited = enforceWidgetRateLimit(projectKey, headers)
        if (limited) return limited

        const auth = await authorizePinAccess(params.pinId, projectKey)
        if ('error' in auth) {
          return Response.json({ error: auth.error }, { status: auth.status, headers })
        }

        if (typeof reviewerName === 'string' && reviewerName.trim()) {
          await db
            .update(pins)
            .set({ reviewerName: reviewerName.trim() })
            .where(eq(pins.id, params.pinId))
        }

        const reply = await addPinReply({
          pinId: params.pinId,
          authorType: 'reviewer',
          authorId: reviewerId,
          body: comment.trim(),
        })

        await enqueueNotification(auth.project.id, params.pinId, 'reply')

        emitProjectEvent({
          type: 'reply.created',
          projectId: auth.project.id,
          pinId: params.pinId,
        })

        const [updatedPin] = await db
          .select()
          .from(pins)
          .where(eq(pins.id, params.pinId))

        const enriched = await enrichRepliesForPin(updatedPin)
        const created = enriched.find((r) => r.id === reply.id)

        return Response.json({ reply: created ?? enriched.at(-1) }, { status: 201, headers })
      },
    },
  },
})
