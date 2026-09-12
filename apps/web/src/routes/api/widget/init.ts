import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db/index'
import { projects, pins } from '#/db/schema'
import { eq, and } from 'drizzle-orm'
import { normalizePinUrl } from '@tack/shared'
import { corsHeaders } from '#/lib/cors'
import { enrichPinsWithComments } from '#/lib/pins'
import type { ProjectNotifySettings } from '#/lib/notifications'
import {
  isOriginAllowed,
  recordRejectedOrigin,
  recordWidgetConnection,
  resolveRequestOrigin,
} from '#/lib/widget-connection'
import { enforceWidgetRateLimit } from '#/lib/rate-limit'

export const Route = createFileRoute('/api/widget/init')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = resolveRequestOrigin(request)
        const headers = corsHeaders(origin)
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

        const settings = (project.settings ?? {}) as ProjectNotifySettings
        const pinQueryParams = settings.pinQueryParams
        // No resolvable origin means this is not a browser running the
        // widget; treat it exactly like a disallowed one.
        const allowed = origin ? await isOriginAllowed(project, origin) : false

        if (!allowed) {
          if (origin) await recordRejectedOrigin(project.id, origin)
          // Deliberately returns no project data. This branch previously
          // echoed `project.name` and `previewUrl` back with the requesting
          // origin in `Access-Control-Allow-Origin`, which let any site read
          // them using only the public project key. The rejection stays
          // readable (so the widget can log a precise reason) but carries
          // nothing about the project. `originMatched` is kept alongside the
          // new field so cached older widget builds still detect this.
          return Response.json(
            {
              pins: [],
              connection: { originAllowed: false, originMatched: false },
            },
            { headers },
          )
        }

        const connected = await recordWidgetConnection(project, origin)

        const pageUrlRaw = url.searchParams.get('url')
        const pageUrl = pageUrlRaw
          ? normalizePinUrl(pageUrlRaw, '', pinQueryParams)
          : null
        const existingPins = pageUrl
          ? await db
              .select()
              .from(pins)
              .where(and(eq(pins.projectId, project.id), eq(pins.url, pageUrl)))
          : []

        const pinsWithComments = await enrichPinsWithComments(existingPins)

        return Response.json(
          {
            project: {
              id: project.id,
              name: project.name,
              previewUrl: project.previewUrl,
            },
            pins: pinsWithComments,
            pinQueryParams,
            connection: {
              originAllowed: true,
              originMatched: true,
              connected,
            },
          },
          { headers },
        )
      },
    },
  },
})
