import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db/index'
import { projects, pins, replies } from '#/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { normalizePinUrl } from '@tack/shared'
import type { ProjectNotifySettings } from '#/lib/notifications'
import { corsHeaders } from '#/lib/cors'
import { enrichPinsWithComments } from '#/lib/pins'
import { parseScreenshotBase64, saveScreenshot } from '#/lib/storage'
import { enqueueNotification } from '#/lib/notifications'
import { emitProjectEvent } from '#/lib/events'
import { enforceWidgetRateLimit } from '#/lib/rate-limit'

export const Route = createFileRoute('/api/widget/pins')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = request.headers.get('origin')
        const headers = corsHeaders(origin)
        const url = new URL(request.url)
        const projectKey = url.searchParams.get('projectKey')
        const pageUrl = url.searchParams.get('url')

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

        const conditions = [eq(pins.projectId, project.id)]
        if (pageUrl) conditions.push(eq(pins.url, normalizePinUrl(pageUrl, '', (project.settings as ProjectNotifySettings | null)?.pinQueryParams)))

        const result = await db
          .select()
          .from(pins)
          .where(and(...conditions))
          .orderBy(desc(pins.createdAt))

        const pinsWithComments = await enrichPinsWithComments(result)

        return Response.json({ pins: pinsWithComments }, { headers })
      },

      POST: async ({ request }) => {
        const origin = request.headers.get('origin')
        const headers = corsHeaders(origin)
        const text = await request.text()
        const body = JSON.parse(text)

        const { projectKey, url, reviewerId, reviewerName, xPct, yPct, scrollY, viewportW, viewportH, selector, xpath, tackId, elementText, body: commentBody, browser, os, screenshot } = body

        if (!projectKey || !url || !reviewerId || xPct == null || yPct == null || !commentBody) {
          return Response.json(
            { error: 'Missing required fields' },
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
        const normalizedUrl = normalizePinUrl(url, '', settings.pinQueryParams)

        const [pin] = await db
          .insert(pins)
          .values({
            projectId: project.id,
            url: normalizedUrl,
            reviewerId,
            reviewerName: reviewerName ?? null,
            xPct,
            yPct,
            scrollY: scrollY ?? 0,
            viewportW: viewportW ?? 0,
            viewportH: viewportH ?? 0,
            selector: selector ?? null,
            xpath: xpath ?? null,
            tackId: tackId ?? null,
            elementText: elementText ?? null,
            browser: browser ?? null,
            os: os ?? null,
          })
          .returning()

        await db.insert(replies).values({
          pinId: pin.id,
          authorType: 'reviewer',
          authorId: reviewerId,
          body: commentBody,
        })

        if (typeof screenshot === 'string' && screenshot.length > 0) {
          const buffer = parseScreenshotBase64(screenshot)
          if (buffer) {
            const screenshotPath = await saveScreenshot(project.id, pin.id, buffer)
            await db
              .update(pins)
              .set({ screenshotPath })
              .where(eq(pins.id, pin.id))
            pin.screenshotPath = screenshotPath
          }
        }

        await enqueueNotification(project.id, pin.id, 'pin')

        emitProjectEvent({
          type: 'pin.created',
          projectId: project.id,
          pinId: pin.id,
        })

        return Response.json({ pin }, { status: 201, headers })
      },
    },
  },
})
