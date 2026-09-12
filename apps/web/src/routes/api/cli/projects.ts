import { createFileRoute } from '@tanstack/react-router'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { requireOwnerToken } from '#/lib/owner-token'
import { generateProjectKey } from '#/lib/project-key'

export const Route = createFileRoute('/api/cli/projects')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { userId } = await requireOwnerToken(request, 'projects:read')

        const rows = await db
          .select()
          .from(projects)
          .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))

        return Response.json({
          projects: rows.map((p) => ({
            id: p.id,
            name: p.name,
            previewUrl: p.previewUrl,
            projectKey: p.projectKey,
            allowedOrigins: p.allowedOrigins ?? [],
            connected: Boolean(p.firstWidgetSeenAt),
          })),
        })
      },

      POST: async ({ request }) => {
        const { userId } = await requireOwnerToken(request, 'projects:create')

        const body = await request.json().catch(() => null)
        if (!body || typeof body !== 'object') {
          return Response.json({ error: 'Invalid body' }, { status: 400 })
        }

        const { name, previewUrl } = body as Record<string, unknown>
        if (typeof name !== 'string' || name.trim().length === 0) {
          return Response.json({ error: 'name is required' }, { status: 400 })
        }
        // Optional: a project without a preview URL can still be used from
        // its allowed (dev) origins; the URL is set in settings after deploy.
        if (previewUrl != null && typeof previewUrl !== 'string') {
          return Response.json(
            { error: 'previewUrl must be a string' },
            { status: 400 },
          )
        }

        const [created] = await db
          .insert(projects)
          .values({
            userId,
            name: name.trim().slice(0, 120),
            previewUrl: (previewUrl ?? '').trim().slice(0, 500),
            projectKey: generateProjectKey(),
          })
          .returning()

        return Response.json(
          {
            project: {
              id: created.id,
              name: created.name,
              previewUrl: created.previewUrl,
              projectKey: created.projectKey,
              allowedOrigins: [],
              connected: false,
            },
          },
          { status: 201 },
        )
      },
    },
  },
})
