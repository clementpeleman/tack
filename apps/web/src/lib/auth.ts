import { createHash, randomBytes } from 'node:crypto'
import { db } from '../db/index.ts'
import { sessions, users } from '../db/schema.ts'
import { eq, and, gt } from 'drizzle-orm'
import { enforceDashboardRateLimit } from './rate-limit.ts'
import { isSignupAllowed } from './signup.ts'

export { isSignupAllowed }

const SESSION_DURATION_DAYS = 30
const MAGIC_LINK_EXPIRY_MINUTES = 15

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateProjectKey(): string {
  return `pk_${randomBytes(16).toString('hex')}`
}

export async function hasAnyUser(): Promise<boolean> {
  const [row] = await db.select({ id: users.id }).from(users).limit(1)
  return Boolean(row)
}

async function createSession(userId: string): Promise<string> {
  const sessionToken = generateToken()
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(sessionToken),
    expiresAt,
  })
  return sessionToken
}

// First-run instance claim: creates the owner account and an active session
// in one step, but only while the instance has no users. Lets a self-hoster
// sign in immediately after `docker compose up` without any email provider.
export async function claimFirstOwner(
  email: string,
): Promise<{ sessionId: string } | null> {
  if (await hasAnyUser()) return null
  const [user] = await db.insert(users).values({ email }).returning()
  // Re-check: if a concurrent claim slipped a different owner in first, bail.
  const owners = await db.select({ id: users.id }).from(users).limit(2)
  if (owners.length !== 1) {
    await db.delete(users).where(eq(users.id, user.id))
    return null
  }
  return { sessionId: await createSession(user.id) }
}

// Returns a magic-link token, or null when the email has no account and
// signup is closed (the caller still responds ok for enumeration safety).
export async function createMagicLinkToken(
  email: string,
): Promise<string | null> {
  let [user] = await db.select().from(users).where(eq(users.email, email))
  if (!user) {
    if (!isSignupAllowed()) return null
    ;[user] = await db.insert(users).values({ email }).returning()
  }

  const token = generateToken()
  const expiresAt = new Date(
    Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000,
  ).toISOString()

  await db.insert(sessions).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  })

  return token
}

export async function verifyMagicLinkToken(
  token: string,
): Promise<{ userId: string; sessionId: string } | null> {
  const tokenHash = hashToken(token)
  const now = new Date().toISOString()

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))

  if (!session) return null

  await db.delete(sessions).where(eq(sessions.id, session.id))

  const sessionToken = await createSession(session.userId)
  return { userId: session.userId, sessionId: sessionToken }
}

export async function validateSession(
  sessionToken: string,
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(sessionToken)
  const now = new Date().toISOString()

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))

  if (!session) return null
  return { userId: session.userId }
}

export async function invalidateSession(sessionToken: string): Promise<void> {
  const tokenHash = hashToken(sessionToken)
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
}

export function getSessionCookie(sessionToken: string): string {
  const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60
  return `tack_session=${sessionToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function clearSessionCookie(): string {
  return 'tack_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get('cookie')
  if (!cookie) return null
  const match = cookie.match(/tack_session=([^;]+)/)
  return match?.[1] ?? null
}

export async function requireAuth(
  request: Request,
): Promise<{ userId: string }> {
  const token = getSessionTokenFromRequest(request)
  if (!token) throw new Response('Unauthorized', { status: 401 })

  enforceDashboardRateLimit(token)

  const session = await validateSession(token)
  if (!session) throw new Response('Unauthorized', { status: 401 })

  return session
}
