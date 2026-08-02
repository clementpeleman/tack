import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { requireOwnerToken } from '#/lib/owner-token'
import {
  MAX_ALLOWED_ORIGINS,
  validateAllowedOrigins,
} from '#/lib/widget-connection'

/**
 * Registers a local dev origin for a project.
 *
 * Loopback only. The project key is public by design, so the origin allowlist
 * is the real authorization gate for reading and writing pins — if a CLI token
 * could add an arbitrary origin, a token leaked from a developer's machine
 * (say via a malicious postinstall in an unrelated dependency) would let an
 * attacker's domain read every reviewer comment on the project. Remote origins
 * are added from project settings, where a human is authenticated by session.
 */
export const Route = createFileRoute('/api/cli/projects/$id/origins')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { userId } = await requireOwnerToken(request, 'origins:write')

        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, params.id), eq(projects.userId, userId)))

        // 404 rather than 403 so project ids can't be enumerated with a token
        // that belongs to a different account.
        if (!project) {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }

        const body = await request.json().catch(() => null)
        if (!body || typeof body !== 'object') {
          return Response.json({ error: 'Invalid body' }, { status: 400 })
        }

        const { origin } = body as Record<string, unknown>
        if (typeof origin !== 'string') {
          return Response.json({ error: 'origin is required' }, { status: 400 })
        }

        const existing = project.allowedOrigins ?? []
        const validated = validateAllowedOrigins([...existing, origin], {
          loopbackOnly: true,
        })

        if (!validated.ok) {
          return Response.json({ error: validated.error }, { status: 400 })
        }
        if (validated.origins.length > MAX_ALLOWED_ORIGINS) {
          return Response.json(
            { error: `At most ${MAX_ALLOWED_ORIGINS} origins are allowed.` },
            { status: 400 },
          )
        }

        await db
          .update(projects)
          .set({ allowedOrigins: validated.origins })
          .where(eq(projects.id, project.id))

        return Response.json({ allowedOrigins: validated.origins })
      },
    },
  },
})
