import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db/index'
import { projects, pins } from '#/db/schema'
import { eq, and } from 'drizzle-orm'
import { corsHeaders, handleCors } from '#/lib/cors'
import { enforceWidgetRateLimit } from '#/lib/rate-limit'
import { enforceWidgetOrigin } from '#/lib/widget-connection'

const VALID_STATES = new Set(['anchored', 'approximate', 'lost'])
const MAX_BATCH = 200

// The widget reports the placement it actually resolved on the live preview
// page so the dashboard can show verified anchored/approximate/lost instead of
// guessing from stored metadata (KTD5). Does not emit a project event — it's a
// placement-freshness update, not new feedback.
export const Route = createFileRoute('/api/widget/placement')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        handleCors(request) ?? new Response(null, { status: 204 }),

      POST: async ({ request }) => {
        const origin = request.headers.get('origin')
        const headers = corsHeaders(origin)

        let body: { projectKey?: unknown; placements?: unknown }
        try {
          body = JSON.parse(await request.text())
        } catch {
          return Response.json(
            { error: 'Invalid JSON body' },
            { status: 400, headers },
          )
        }

        const projectKey = body.projectKey
        const placements = body.placements
        if (typeof projectKey !== 'string' || !Array.isArray(placements)) {
          return Response.json(
            { error: 'projectKey and placements required' },
            { status: 400, headers },
          )
        }

        const limited = enforceWidgetRateLimit(projectKey, headers)
        if (limited) return limited

        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.projectKey, projectKey))

        if (!project) {
          return Response.json(
            { error: 'Invalid project key' },
            { status: 404, headers },
          )
        }

        const originError = enforceWidgetOrigin(project.previewUrl, origin)
        if (originError) return originError

        const checkedAt = new Date().toISOString()
        let updated = 0
        for (const entry of placements.slice(0, MAX_BATCH)) {
          const pinId = (entry as { pinId?: unknown })?.pinId
          const placement = (entry as { placement?: unknown })?.placement
          if (typeof pinId !== 'string' || typeof placement !== 'string') continue
          if (!VALID_STATES.has(placement)) continue
          const res = await db
            .update(pins)
            .set({
              placementState: placement as 'anchored' | 'approximate' | 'lost',
              placementCheckedAt: checkedAt,
            })
            .where(and(eq(pins.id, pinId), eq(pins.projectId, project.id)))
          updated += res.changes ?? 0
        }

        return Response.json({ updated }, { headers })
      },
    },
  },
})
