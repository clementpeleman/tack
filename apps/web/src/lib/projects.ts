import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { db } from '#/db/index'
import { pins, projects } from '#/db/schema'
import { eq, and, isNull, desc, inArray } from 'drizzle-orm'
import { requireDashboardAuth } from '#/lib/auth'
import { generateProjectKey } from '#/lib/project-key'
import { validateAllowedOrigins } from '#/lib/widget-connection'
import { configuredPublicOrigin } from '#/lib/public-url'
import { getAiEntitlement } from '#/lib/ai/entitlement'
import { getAiBudgetConfig } from '#/lib/ai/cost'
import {
  createShare,
  isShareConfigured,
  listShares,
  publicShare,
  revokeShare,
} from '#/lib/shares'
import type { ProjectNotifySettings } from '#/lib/notifications'

const MAX_NAME = 120
const MAX_URL = 500
const MAX_QUERY_PARAMS = 20

/**
 * Webhook targets are fetched server-side, so an unrestricted URL is a
 * server-side request forgery primitive on a shared instance. Only the two
 * providers' own webhook hosts are accepted.
 */
const WEBHOOK_PREFIXES: Record<'discordWebhook' | 'slackWebhook', string[]> = {
  discordWebhook: [
    'https://discord.com/api/webhooks/',
    'https://discordapp.com/api/webhooks/',
  ],
  slackWebhook: ['https://hooks.slack.com/'],
}

export function validateNotifySettings(
  input: unknown,
): { ok: true; settings: ProjectNotifySettings } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Settings must be an object.' }
  }
  const raw = input as Record<string, unknown>
  const settings: ProjectNotifySettings = {}

  if (raw.notifyEmail != null && raw.notifyEmail !== '') {
    const email = String(raw.notifyEmail).trim()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: 'Notification email is not a valid address.' }
    }
    settings.notifyEmail = email
  }

  for (const key of ['discordWebhook', 'slackWebhook'] as const) {
    const value = raw[key]
    if (value == null || value === '') continue
    const url = String(value).trim()
    if (
      url.length > MAX_URL ||
      !WEBHOOK_PREFIXES[key].some((prefix) => url.startsWith(prefix))
    ) {
      const label = key === 'discordWebhook' ? 'Discord' : 'Slack'
      return {
        ok: false,
        error: `${label} webhook must be a ${WEBHOOK_PREFIXES[key][0]}… URL.`,
      }
    }
    settings[key] = url
  }

  if (raw.pinQueryParams != null) {
    if (!Array.isArray(raw.pinQueryParams)) {
      return { ok: false, error: 'pinQueryParams must be a list.' }
    }
    const params = raw.pinQueryParams
      .filter((p): p is string => typeof p === 'string')
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && p.length <= 64)
    if (params.length > MAX_QUERY_PARAMS) {
      return { ok: false, error: `At most ${MAX_QUERY_PARAMS} query params.` }
    }
    settings.pinQueryParams = params
  }

  return { ok: true, settings }
}

function validateDetails(
  name: unknown,
  previewUrl: unknown,
): { ok: true; name: string; previewUrl: string } | { ok: false; error: string } {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) return { ok: false, error: 'Name is required.' }
  if (trimmedName.length > MAX_NAME) {
    return { ok: false, error: `Name must be under ${MAX_NAME} characters.` }
  }
  const trimmedUrl = typeof previewUrl === 'string' ? previewUrl.trim() : ''
  if (trimmedUrl.length > MAX_URL) {
    return { ok: false, error: `Preview URL must be under ${MAX_URL} characters.` }
  }
  return { ok: true, name: trimmedName, previewUrl: trimmedUrl }
}

/**
 * The origin the dashboard is served from, resolved on the server. Reading
 * `window.location.origin` in a component renders an empty string during
 * SSR and the real origin on the client, which is a hydration mismatch.
 */
export const getAppOrigin = createServerFn({ method: 'GET' }).handler(
  async () => configuredPublicOrigin() ?? new URL(getRequest().url).origin,
)

export const getProjects = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const { userId } = await requireDashboardAuth(request)

    return db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))
  },
)

export const getProject = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { userId } = await requireDashboardAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.id), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })
    return project
  })

export const createProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; previewUrl: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { userId } = await requireDashboardAuth(request)

    const valid = validateDetails(data.name, data.previewUrl)
    if (!valid.ok) throw new Error(valid.error)

    const [project] = await db
      .insert(projects)
      .values({
        userId,
        name: valid.name,
        previewUrl: valid.previewUrl,
        projectKey: generateProjectKey(),
      })
      .returning()

    return project
  })

export const updateProjectSettings = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { projectId: string; settings: ProjectNotifySettings }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireDashboardAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    const valid = validateNotifySettings(data.settings)
    if (!valid.ok) throw new Error(valid.error)

    await db
      .update(projects)
      .set({ settings: valid.settings as Record<string, string | string[]> })
      .where(eq(projects.id, project.id))

    return { ok: true }
  })

export const updateProjectDetails = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { projectId: string; name: string; previewUrl: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireDashboardAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    const valid = validateDetails(data.name, data.previewUrl)
    if (!valid.ok) throw new Error(valid.error)

    await db
      .update(projects)
      .set({ name: valid.name, previewUrl: valid.previewUrl })
      .where(eq(projects.id, project.id))

    return { ok: true }
  })

/**
 * Dashboard path for the allowlist. Unlike the CLI route this accepts remote
 * origins: the caller is a session-authenticated owner, not a token that may
 * have leaked from a developer machine.
 */
export const updateAllowedOrigins = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string; origins: string[] }) => data)
  .handler(async ({ data }): Promise<{ ok: true; origins: string[] }> => {
    const request = getRequest()
    const { userId } = await requireDashboardAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })

    const valid = validateAllowedOrigins(data.origins)
    if (!valid.ok) throw new Error(valid.error)

    await db
      .update(projects)
      .set({
        allowedOrigins: valid.origins,
        // The origin that was just allowed is no longer a rejection worth
        // showing; clear it so the hint disappears with the fix.
        lastRejectedOrigin:
          project.lastRejectedOrigin && valid.origins.includes(project.lastRejectedOrigin)
            ? null
            : project.lastRejectedOrigin,
      })
      .where(eq(projects.id, project.id))

    return { ok: true, origins: valid.origins }
  })

export const archiveProject = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { projectId: string; confirmName: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const request = getRequest()
    const { userId } = await requireDashboardAuth(request)

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))

    if (!project) throw new Response('Not found', { status: 404 })
    if (project.name !== data.confirmName.trim()) {
      throw new Error('Project name does not match')
    }

    await db
      .update(projects)
      .set({ archivedAt: new Date().toISOString() })
      .where(eq(projects.id, project.id))

    return { ok: true }
  })

// ---------------------------------------------------------------------------
// Share links (dashboard side). Same rules as the CLI routes; the session is
// the credential here.

async function requireOwnedProject(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
  if (!project) throw new Response('Not found', { status: 404 })
  return project
}

export const getShares = createServerFn({ method: 'GET' })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireDashboardAuth(getRequest())
    const project = await requireOwnedProject(data.projectId, userId)
    const rows = await listShares(project.id)
    return { configured: isShareConfigured(), shares: rows.map(publicShare) }
  })

export const createShareLink = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      projectId: string
      targetUrl: string
      passcode?: string
      days?: number
      label?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireDashboardAuth(getRequest())
    const project = await requireOwnedProject(data.projectId, userId)
    const { share, url } = await createShare({
      projectId: project.id,
      userId,
      targetUrl: data.targetUrl,
      passcode: data.passcode,
      days: data.days,
      label: data.label,
    })
    return { share: publicShare(share), url }
  })

export const revokeShareLink = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string; shareId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { userId } = await requireDashboardAuth(getRequest())
    const project = await requireOwnedProject(data.projectId, userId)
    await revokeShare(project.id, data.shareId)
    return { ok: true }
  })

/**
 * The projects overview: what an owner wants to know at a glance — how much
 * is open, when the last pin came in, whether the widget has ever phoned home.
 * One query per table, aggregated in memory; project counts are small.
 */
export const getProjectsOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await requireDashboardAuth(getRequest())

  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))
    .orderBy(desc(projects.createdAt))

  const ids = rows.map((p) => p.id)
  const pinRows =
    ids.length > 0
      ? await db
          .select({ projectId: pins.projectId, status: pins.status, createdAt: pins.createdAt })
          .from(pins)
          .where(inArray(pins.projectId, ids))
      : []

  const stats = new Map<string, { open: number; total: number; last: string | null }>()
  for (const pin of pinRows) {
    const s = stats.get(pin.projectId) ?? { open: 0, total: 0, last: null }
    s.total += 1
    if (pin.status === 'open') s.open += 1
    if (!s.last || pin.createdAt > s.last) s.last = pin.createdAt
    stats.set(pin.projectId, s)
  }

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    previewUrl: p.previewUrl,
    connected: Boolean(p.firstWidgetSeenAt),
    open: stats.get(p.id)?.open ?? 0,
    total: stats.get(p.id)?.total ?? 0,
    lastPinAt: stats.get(p.id)?.last ?? null,
  }))
})

/** AI availability for the settings page; the only place env names may appear in the UI. */
export const getAiStatus = createServerFn({ method: 'GET' }).handler(async () => {
  await requireDashboardAuth(getRequest())
  const entitlement = getAiEntitlement()
  const budget = getAiBudgetConfig()
  return {
    hosted: process.env.TACK_DEPLOYMENT === 'hosted',
    entitled: entitlement.entitled,
    reason: entitlement.reason,
    monthlyCapCents: budget.monthlyCapCents,
    jobCapCents: budget.jobCapCents,
  }
})
