import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '#/lib/auth'
import { createProjectEventStream } from '#/lib/events'

export const Route = createFileRoute('/api/projects/$id/events')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { userId } = await requireAuth(request)

        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, params.id), eq(projects.userId, userId)))

        if (!project) {
          return new Response('Not found', { status: 404 })
        }

        const signal = request.signal
        const stream = createProjectEventStream(project.id, signal)

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      },
    },
  },
})
