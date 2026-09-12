import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import { db } from '#/db/index'
import { projects, shares } from '#/db/schema'
import { assertPublicHost } from '#/lib/net'
import { configuredPublicOrigin } from '#/lib/public-url'

export const DEFAULT_SHARE_DAYS = 7
export const MAX_SHARE_DAYS = 90
export const MAX_ACTIVE_SHARES = 20

/** Lowercase, no ambiguous glyphs: this ends up in a hostname and in chat. */
const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const SLUG_RANDOM_LENGTH = 14 // 32^14 ≈ 2^70

export function shareDomain(): string | null {
  const raw = process.env.TACK_SHARE_DOMAIN?.trim().toLowerCase()
  if (!raw) return null
  return raw.replace(/^\*\./, '').replace(/\.$/, '')
}

export function isShareConfigured(): boolean {
  return shareDomain() !== null
}

/** Scheme follows the instance: https when TACK_PUBLIC_URL is https. */
function shareScheme(): 'http' | 'https' {
  return configuredPublicOrigin()?.startsWith('https://') ? 'https' : 'http'
}

/** Port only matters in development, where the share host is `*.share.localhost:3000`. */
function sharePort(): string {
  const raw = process.env.TACK_SHARE_PORT?.trim()
  return raw ? `:${raw}` : ''
}

export function shareOrigin(slug: string): string {
  return `${shareScheme()}://${slug}.${shareDomain()}${sharePort()}`
}

/** The slug if `origin` is a share origin on the configured domain, else null. */
export function slugFromOrigin(origin: string): string | null {
  const domain = shareDomain()
  if (!domain) return null
  try {
    const host = new URL(origin).hostname.toLowerCase()
    const suffix = `.${domain}`
    if (!host.endsWith(suffix)) return null
    const slug = host.slice(0, -suffix.length)
    return slug && !slug.includes('.') ? slug : null
  } catch {
    return null
  }
}

export function generateSlug(projectName: string): string {
  const prefix = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
  const bytes = randomBytes(SLUG_RANDOM_LENGTH)
  let random = ''
  for (let i = 0; i < SLUG_RANDOM_LENGTH; i++) {
    random += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length]
  }
  return prefix ? `${prefix}-${random}` : random
}

export function hashPasscode(slug: string, passcode: string): string {
  return createHash('sha256').update(`${slug}:${passcode}`).digest('hex')
}

export function passcodeMatches(
  slug: string,
  passcode: string,
  hash: string,
): boolean {
  const a = Buffer.from(hashPasscode(slug, passcode))
  const b = Buffer.from(hash)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Shape check plus DNS/public-IP check; throws with a user-facing message. */
export async function validateTargetUrl(input: unknown): Promise<string> {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('A target URL is required.')
  }
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Error('Target must be a full URL, e.g. https://preview.acme.com.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Target must be http(s).')
  }
  if (url.username || url.password) {
    throw new Error('Target must not contain credentials.')
  }
  const domain = shareDomain()
  if (domain && url.hostname.toLowerCase().endsWith(domain)) {
    throw new Error('A share cannot point at another share.')
  }
  const own = configuredPublicOrigin()
  if (own && url.origin === own) {
    throw new Error('A share cannot point at this Tack instance.')
  }
  await assertPublicHost(url.hostname)
  // Keep the path: a share may point at a sub-page. Drop hash and trailing
  // slash noise so the proxy can concatenate cleanly.
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

export type ShareRow = typeof shares.$inferSelect

export function isShareLive(share: ShareRow, now = Date.now()): boolean {
  return !share.revokedAt && Date.parse(share.expiresAt) > now
}

export async function findLiveShareBySlug(slug: string): Promise<ShareRow | null> {
  const [row] = await db.select().from(shares).where(eq(shares.slug, slug))
  if (!row || !isShareLive(row)) return null
  return row
}

/** Used by the widget origin gate: does this project own a live share with this slug? */
export async function projectHasLiveShare(
  projectId: string,
  slug: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: shares.id })
    .from(shares)
    .where(
      and(
        eq(shares.slug, slug),
        eq(shares.projectId, projectId),
        isNull(shares.revokedAt),
        gt(shares.expiresAt, new Date().toISOString()),
      ),
    )
  return Boolean(row)
}

export interface CreateShareInput {
  projectId: string
  userId: string
  targetUrl: unknown
  passcode?: unknown
  days?: unknown
  label?: unknown
}

export async function createShare(input: CreateShareInput): Promise<{
  share: ShareRow
  url: string
}> {
  if (!isShareConfigured()) {
    throw new Error(
      'Sharing is not configured on this instance. Set TACK_SHARE_DOMAIN (e.g. share.example.com) with wildcard DNS and TLS.',
    )
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
  if (!project) throw new Error('Project not found.')

  const targetUrl = await validateTargetUrl(input.targetUrl)

  const days =
    input.days == null || input.days === ''
      ? DEFAULT_SHARE_DAYS
      : Number(input.days)
  if (!Number.isInteger(days) || days < 1 || days > MAX_SHARE_DAYS) {
    throw new Error(`Expiry must be between 1 and ${MAX_SHARE_DAYS} days.`)
  }

  const passcode =
    typeof input.passcode === 'string' ? input.passcode.trim() : ''
  if (passcode && (passcode.length < 4 || passcode.length > 64)) {
    throw new Error('Passcode must be 4 to 64 characters.')
  }

  const active = await listShares(input.projectId)
  if (active.filter((s) => isShareLive(s)).length >= MAX_ACTIVE_SHARES) {
    throw new Error(`At most ${MAX_ACTIVE_SHARES} active shares per project.`)
  }

  const slug = generateSlug(project.name)
  const [share] = await db
    .insert(shares)
    .values({
      projectId: project.id,
      slug,
      targetUrl,
      passcodeHash: passcode ? hashPasscode(slug, passcode) : null,
      label: typeof input.label === 'string' ? input.label.trim().slice(0, 120) || null : null,
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: input.userId,
    })
    .returning()

  return { share: share!, url: shareOrigin(slug) }
}

export async function listShares(projectId: string): Promise<ShareRow[]> {
  return db
    .select()
    .from(shares)
    .where(eq(shares.projectId, projectId))
    .orderBy(desc(shares.createdAt))
}

export async function revokeShare(
  projectId: string,
  shareId: string,
): Promise<boolean> {
  const updated = await db
    .update(shares)
    .set({ revokedAt: new Date().toISOString() })
    .where(
      and(
        eq(shares.id, shareId),
        eq(shares.projectId, projectId),
        isNull(shares.revokedAt),
      ),
    )
    .returning({ id: shares.id })
  return updated.length > 0
}

/** What the API and dashboard hand out; never the passcode hash. */
export function publicShare(share: ShareRow) {
  return {
    id: share.id,
    slug: share.slug,
    url: shareOrigin(share.slug),
    targetUrl: share.targetUrl,
    label: share.label,
    hasPasscode: Boolean(share.passcodeHash),
    expiresAt: share.expiresAt,
    revokedAt: share.revokedAt,
    lastAccessAt: share.lastAccessAt,
    createdAt: share.createdAt,
    live: isShareLive(share),
  }
}
