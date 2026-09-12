import { randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '#/db/index'
import { ownerTokens } from '#/db/schema'
import { hashToken } from '#/lib/auth'

/**
 * Revocable owner tokens for non-browser clients (ADR 0002).
 *
 * These are deliberately NOT session cookies. `requireOwnerToken` only ever
 * reads the `Authorization: Bearer` header, and `requireAuth` only ever reads
 * the `tack_session` cookie, so neither credential can be replayed as the
 * other.
 */

export const OWNER_TOKEN_PREFIX = 'tk_'
const TOKEN_LIFETIME_DAYS = 90
/** Avoid a write on every request; last-used is for the revoke UI, not billing. */
const LAST_USED_REFRESH_MS = 60 * 60 * 1000

/**
 * Scopes a CLI token may hold. Deliberately excludes anything that reads pins
 * or replies — those carry reviewer-authored content, and an installer has no
 * reason to see it.
 */
export const CLI_SCOPES = [
  'projects:read',
  'projects:create',
  'origins:write',
  'shares:write',
] as const

export type OwnerScope = (typeof CLI_SCOPES)[number]

export interface OwnerTokenContext {
  userId: string
  tokenId: string
  scopes: string[]
}

export function generateOwnerToken(): string {
  return `${OWNER_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
}

export async function createOwnerToken(input: {
  userId: string
  label: string
  scopes: readonly string[]
  source?: 'cli' | 'dashboard'
}): Promise<{ token: string; expiresAt: string }> {
  const token = generateOwnerToken()
  const expiresAt = new Date(
    Date.now() + TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  await db.insert(ownerTokens).values({
    userId: input.userId,
    tokenHash: hashToken(token),
    label: input.label.slice(0, 120),
    source: input.source ?? 'cli',
    scopes: [...input.scopes],
    expiresAt,
  })

  // Returned once and never stored in plaintext.
  return { token, expiresAt }
}

export async function validateOwnerToken(
  token: string,
): Promise<OwnerTokenContext | null> {
  if (!token.startsWith(OWNER_TOKEN_PREFIX)) return null

  const now = new Date().toISOString()
  const [row] = await db
    .select()
    .from(ownerTokens)
    .where(
      and(
        eq(ownerTokens.tokenHash, hashToken(token)),
        gt(ownerTokens.expiresAt, now),
        isNull(ownerTokens.revokedAt),
      ),
    )

  if (!row) return null

  const last = row.lastUsedAt ? Date.parse(row.lastUsedAt) : 0
  if (!Number.isFinite(last) || Date.now() - last > LAST_USED_REFRESH_MS) {
    await db
      .update(ownerTokens)
      .set({ lastUsedAt: now })
      .where(eq(ownerTokens.id, row.id))
  }

  return {
    userId: row.userId,
    tokenId: row.id,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
  }
}

export async function revokeOwnerToken(token: string): Promise<boolean> {
  const now = new Date().toISOString()
  const [row] = await db
    .select()
    .from(ownerTokens)
    .where(
      and(eq(ownerTokens.tokenHash, hashToken(token)), isNull(ownerTokens.revokedAt)),
    )
  if (!row) return false

  await db
    .update(ownerTokens)
    .set({ revokedAt: now })
    .where(eq(ownerTokens.id, row.id))
  return true
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

/**
 * Bearer-only auth for `/api/cli/*`. Throws a bare 401/403 Response — no body
 * detail, so a caller probing with a bad token learns nothing beyond the status.
 */
export async function requireOwnerToken(
  request: Request,
  requiredScope?: OwnerScope,
): Promise<OwnerTokenContext> {
  const token = getBearerToken(request)
  if (!token) throw new Response('Unauthorized', { status: 401 })

  const context = await validateOwnerToken(token)
  if (!context) throw new Response('Unauthorized', { status: 401 })

  if (requiredScope && !context.scopes.includes(requiredScope)) {
    throw new Response('Forbidden', { status: 403 })
  }

  return context
}
