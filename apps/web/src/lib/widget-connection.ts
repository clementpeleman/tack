import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { corsHeaders } from '#/lib/cors'

export function previewOriginMatches(
  previewUrl: string,
  origin: string,
): boolean {
  try {
    const requestHost = new URL(origin).host.toLowerCase()
    // Parse the preview host tolerantly so a wildcard like `*.vercel.app`
    // (for dynamic preview deployments) survives `new URL` rejection.
    const previewHost = previewUrl
      .trim()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .replace(/[/?#].*$/, '')
      .toLowerCase()
    if (!previewHost) return false
    if (previewHost.startsWith('*.')) {
      const base = previewHost.slice(2)
      return requestHost === base || requestHost.endsWith(`.${base}`)
    }
    return requestHost === previewHost
  } catch {
    return false
  }
}

/**
 * Gate a widget request by origin. Same-origin requests omit the `Origin`
 * header and are allowed; cross-origin requests must match the project's
 * preview origin. Returns a 403 Response (with no ACAO, so the disallowed
 * origin cannot read it) when the origin is present and does not match.
 */
export function enforceWidgetOrigin(
  previewUrl: string,
  origin: string | null,
): Response | null {
  if (origin && !previewOriginMatches(previewUrl, origin)) {
    return Response.json(
      { error: "This origin does not match the project's preview URL." },
      { status: 403, headers: corsHeaders(null) },
    )
  }
  return null
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
