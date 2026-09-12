import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { projects, shares } from '#/db/schema'
import { requireOwnerToken } from '#/lib/owner-token'
import { revokeShare } from '#/lib/shares'

export const Route = createFileRoute('/api/cli/shares/$id')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const { userId } = await requireOwnerToken(request, 'shares:write')

        const [row] = await db
          .select({ id: shares.id, projectId: shares.projectId })
          .from(shares)
          .innerJoin(projects, eq(projects.id, shares.projectId))
          .where(and(eq(shares.id, params.id), eq(projects.userId, userId)))
        if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

        await revokeShare(row.projectId, row.id)
        return Response.json({ ok: true })
      },
    },
  },
})
