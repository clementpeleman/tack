import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { requireOwnerToken } from '#/lib/owner-token'
import { createShare, listShares, publicShare } from '#/lib/shares'

/**
 * Share links for `tack share`. A share proxies a preview through the share
 * domain with the widget injected; it does not widen the project's stored
 * allowlist, so this is safe to expose to a CLI token.
 */
export const Route = createFileRoute('/api/cli/shares')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { userId } = await requireOwnerToken(request, 'projects:read')
        const projectId = new URL(request.url).searchParams.get('projectId')
        if (!projectId) {
          return Response.json({ error: 'projectId required' }, { status: 400 })
        }
        const [project] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

        const rows = await listShares(project.id)
        return Response.json({ shares: rows.map(publicShare) })
      },

      POST: async ({ request }) => {
        const { userId } = await requireOwnerToken(request, 'shares:write')

        const body = await request.json().catch(() => null)
        if (!body || typeof body !== 'object') {
          return Response.json({ error: 'Invalid body' }, { status: 400 })
        }
        const { projectId, targetUrl, passcode, days, label } = body as Record<
          string,
          unknown
        >
        if (typeof projectId !== 'string') {
          return Response.json({ error: 'projectId required' }, { status: 400 })
        }
        const [project] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

        try {
          const { share, url } = await createShare({
            projectId: project.id,
            userId,
            targetUrl,
            passcode,
            days,
            label,
          })
          return Response.json(
            { share: publicShare(share), url },
            { status: 201 },
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not create share'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})
