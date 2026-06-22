import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { corsHeaders } from '#/lib/cors'
import { createProjectEventStream } from '#/lib/events'
import { enforceWidgetRateLimit } from '#/lib/rate-limit'
import { enforceWidgetOrigin } from '#/lib/widget-connection'

export const Route = createFileRoute('/api/widget/events')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = request.headers.get('origin')
        const headers = {
          ...corsHeaders(origin),
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        }

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

        const stream = createProjectEventStream(project.id, request.signal)
        return new Response(stream, { headers })
      },
    },
  },
})
