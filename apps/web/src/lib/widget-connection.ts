import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { eq } from 'drizzle-orm'

export function previewOriginMatches(
  previewUrl: string,
  origin: string,
): boolean {
  try {
    const preview = new URL(previewUrl)
    const requestOrigin = new URL(origin)
    return preview.host === requestOrigin.host
  } catch {
    return false
  }
}

export async function recordWidgetConnection(
  projectId: string,
  previewUrl: string,
  firstWidgetSeenAt: string | null,
  origin: string | null,
): Promise<boolean> {
  if (!origin || firstWidgetSeenAt) return false
  if (!previewOriginMatches(previewUrl, origin)) return false

  const now = new Date().toISOString()
  await db
    .update(projects)
    .set({ firstWidgetSeenAt: now })
    .where(eq(projects.id, projectId))

  return true
}
