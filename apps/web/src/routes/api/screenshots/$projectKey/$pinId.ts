import { createFileRoute } from '@tanstack/react-router'
import { readFile } from 'node:fs/promises'
import { db } from '#/db/index'
import { projects, pins } from '#/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSessionTokenFromRequest, validateSession } from '#/lib/auth'
import { screenshotAbsolutePath } from '#/lib/storage'

export const Route = createFileRoute('/api/screenshots/$projectKey/$pinId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.projectKey, params.projectKey))

        if (!project) {
          return new Response('Not found', { status: 404 })
        }

        const url = new URL(request.url)
        const queryKey = url.searchParams.get('projectKey')
        const sessionToken = getSessionTokenFromRequest(request)
        const session = sessionToken ? await validateSession(sessionToken) : null

        const authorizedByKey = queryKey === params.projectKey
        const authorizedBySession =
          session !== null && session.userId === project.userId

        if (!authorizedByKey && !authorizedBySession) {
          return new Response('Unauthorized', { status: 401 })
        }

        const [pin] = await db
          .select()
          .from(pins)
          .where(and(eq(pins.id, params.pinId), eq(pins.projectId, project.id)))

        if (!pin?.screenshotPath) {
          return new Response('Not found', { status: 404 })
        }

        try {
          const file = await readFile(
            screenshotAbsolutePath(project.id, pin.id),
          )
          return new Response(file, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'private, max-age=3600',
            },
          })
        } catch {
          return new Response('Not found', { status: 404 })
        }
      },
    },
  },
})
