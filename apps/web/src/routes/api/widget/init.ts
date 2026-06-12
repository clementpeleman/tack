import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db/index'
import { projects, pins } from '#/db/schema'
import { eq, and } from 'drizzle-orm'
import { normalizePinUrl } from '@tack/shared'
import { corsHeaders } from '#/lib/cors'
import { enrichPinsWithComments } from '#/lib/pins'
import type { ProjectNotifySettings } from '#/lib/notifications'
import {
  previewOriginMatches,
  recordWidgetConnection,
} from '#/lib/widget-connection'
import { enforceWidgetRateLimit } from '#/lib/rate-limit'

export const Route = createFileRoute('/api/widget/init')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = request.headers.get('origin')
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
        const originMatched = origin
          ? previewOriginMatches(project.previewUrl, origin)
          : null

        if (originMatched === false) {
          return Response.json(
            {
              project: {
                id: project.id,
                name: project.name,
                previewUrl: project.previewUrl,
              },
              pins: [],
              pinQueryParams,
              connection: {
                originMatched: false,
                previewUrl: project.previewUrl,
              },
            },
            { headers },
          )
        }

        const connected = await recordWidgetConnection(
          project.id,
          project.previewUrl,
          project.firstWidgetSeenAt,
          origin,
        )

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
              originMatched: originMatched ?? true,
              connected,
            },
          },
          { headers },
        )
      },
    },
  },
})
