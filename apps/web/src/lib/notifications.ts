import { db } from '#/db/index'
import { notifications, projects, pins, users } from '#/db/schema'
import { eq, desc } from 'drizzle-orm'

export type NotificationEvent = 'pin' | 'reply'

export interface ProjectNotifySettings {
  notifyEmail?: string
  discordWebhook?: string
  slackWebhook?: string
  pinQueryParams?: string[]
}

const pendingEvents = new Map<
  string,
  { pinId: string; event: NotificationEvent }
>()
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

const BATCH_MS = 2_000
const MIN_INTERVAL_MS = 60_000

export async function enqueueNotification(
  projectId: string,
  pinId: string,
  event: NotificationEvent,
): Promise<void> {
  pendingEvents.set(projectId, { pinId, event })
  if (debounceTimers.has(projectId)) return

  const delay = await getNotificationDelayMs(projectId)
  debounceTimers.set(
    projectId,
    setTimeout(() => {
      debounceTimers.delete(projectId)
      void flushNotification(projectId)
    }, delay),
  )
}

async function getNotificationDelayMs(projectId: string): Promise<number> {
  const [last] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.projectId, projectId))
    .orderBy(desc(notifications.sentAt))
    .limit(1)

  if (!last?.sentAt) return BATCH_MS

  const elapsed = Date.now() - new Date(last.sentAt).getTime()
  if (elapsed >= MIN_INTERVAL_MS) return BATCH_MS
  return MIN_INTERVAL_MS - elapsed + BATCH_MS
}

async function flushNotification(projectId: string): Promise<void> {
  const pending = pendingEvents.get(projectId)
  if (!pending) return
  pendingEvents.delete(projectId)

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))

  if (!project) return

  const settings = (project.settings ?? {}) as ProjectNotifySettings
  const [pin] = await db.select().from(pins).where(eq(pins.id, pending.pinId))
  if (!pin) return

  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.id, project.userId))

  const payload = {
    event: pending.event,
    projectName: project.name,
    pinId: pin.id,
    url: pin.url,
    reviewerName: pin.reviewerName,
    previewUrl: project.previewUrl,
  }

  const channels: Array<{ channel: string; target: string }> = []

  const email = settings.notifyEmail ?? owner?.email
  if (email) channels.push({ channel: 'email', target: email })
  if (settings.discordWebhook)
    channels.push({ channel: 'discord', target: settings.discordWebhook })
  if (settings.slackWebhook)
    channels.push({ channel: 'slack', target: settings.slackWebhook })

  if (channels.length === 0) {
    channels.push({ channel: 'console', target: 'console' })
  }

  for (const { channel, target } of channels) {
    try {
      await sendNotification(channel, target, payload)
      await db.insert(notifications).values({
        projectId,
        pinId: pin.id,
        channel,
        payload,
        sentAt: new Date().toISOString(),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send failed'
      await db.insert(notifications).values({
        projectId,
        pinId: pin.id,
        channel,
        payload,
        failedAt: new Date().toISOString(),
        error: message,
      })
    }
  }
}

async function sendNotification(
  channel: string,
  target: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const title =
    payload.event === 'pin'
      ? `New pin on ${payload.projectName}`
      : `New reply on ${payload.projectName}`
  const body = `${payload.reviewerName ?? 'Someone'} left feedback on ${payload.url}`

  if (channel === 'console') {
    console.log(
      `\n[tack] ${title}\n  ${body}\n  Preview: ${payload.previewUrl}${payload.url}\n`,
    )
    return
  }

  if (channel === 'email') {
    const { sendEmail } = await import('#/lib/email')
    await sendEmail({
      to: target,
      subject: title,
      text: `${body}\n\nOpen: ${payload.previewUrl}${payload.url}`,
    })
    return
  }

  if (channel === 'discord' || channel === 'slack') {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**${title}**\n${body}\n${payload.previewUrl}${payload.url}`,
      }),
    })
    if (!res.ok) throw new Error(`${channel} webhook failed: ${res.status}`)
  }
}
