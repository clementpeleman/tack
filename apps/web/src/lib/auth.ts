import { createHash, randomBytes } from 'node:crypto'
import { redirect } from '@tanstack/react-router'
import { safeReturnPath } from './return-path.ts'

export { safeReturnPath }
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

/**
 * Magic-link tokens live in the same `sessions` table as real sessions. They
 * are hashed under a distinct prefix so the raw token from an email can never
 * be presented as a `tack_session` cookie: the cookie path hashes the bare
 * value, which will not match a row stored under the prefixed one.
 */
function hashMagicLinkToken(token: string): string {
  return hashToken(`magic-link:${token}`)
}

/**
 * `Secure` is set whenever the instance is known to be served over https
 * (TACK_PUBLIC_URL) or the request itself arrived over https. Behind a TLS
 * proxy the app sees plain http, so the env var is what makes this reliable.
 */
export function isSecureDeployment(request?: Request): boolean {
  const publicUrl = process.env.TACK_PUBLIC_URL
  if (publicUrl?.startsWith('https://')) return true
  if (request) {
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    if (proto === 'https') return true
    if (request.url.startsWith('https://')) return true
  }
  return false
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
    tokenHash: hashMagicLinkToken(token),
    expiresAt,
  })

  return token
}

export async function verifyMagicLinkToken(
  token: string,
): Promise<{ userId: string; sessionId: string } | null> {
  const tokenHash = hashMagicLinkToken(token)
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

export function getSessionCookie(
  sessionToken: string,
  request?: Request,
): string {
  const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60
  const secure = isSecureDeployment(request) ? '; Secure' : ''
  return `tack_session=${sessionToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
}

export function clearSessionCookie(request?: Request): string {
  const secure = isSecureDeployment(request) ? '; Secure' : ''
  return `tack_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get('cookie')
  if (!cookie) return null
  const match = cookie.match(/tack_session=([^;]+)/)
  return match?.[1] ?? null
}

/** The page path a request was for, so sign-in can return there. */
function returnPathFor(request: Request): string | null {
  try {
    const url = new URL(request.url)
    // A server-function RPC carries the page in its Referer, not its URL.
    if (url.pathname.startsWith('/_serverFn/') || url.pathname.startsWith('/_server')) {
      const referer = request.headers.get('referer')
      if (!referer) return null
      const ref = new URL(referer)
      if (ref.origin !== url.origin) return null
      return safeReturnPath(ref.pathname + ref.search)
    }
    return safeReturnPath(url.pathname + url.search)
  } catch {
    return null
  }
}

/**
 * For dashboard server functions. A signed-out browser hitting a dashboard
 * route used to get a 500 page (a thrown 401 Response is not something a
 * route loader knows how to render); a redirect to the login page is what
 * the person actually needs, and after signing in they come back to the
 * page they asked for (the CLI authorize page depends on this). API routes
 * keep `requireAuth` and its 401.
 */
export async function requireDashboardAuth(
  request: Request,
): Promise<{ userId: string }> {
  try {
    return await requireAuth(request)
  } catch (err) {
    if (err instanceof Response && err.status === 401) {
      const next = returnPathFor(request)
      throw redirect({ to: '/login', search: next ? { next } : {} })
    }
    throw err
  }
}

export async function requireAuth(
  request: Request,
): Promise<{ userId: string }> {
  const token = getSessionTokenFromRequest(request)
  if (!token) throw new Response('Unauthorized', { status: 401 })

  // Keyed on the hash, not the raw cookie, so an attacker sending random
  // cookie values cannot fill the limiter with unbounded distinct keys of
  // their choosing (the hash is still distinct per value, but bounded in
  // length and never the secret itself).
  enforceDashboardRateLimit(hashToken(token).slice(0, 16))

  const session = await validateSession(token)
  if (!session) throw new Response('Unauthorized', { status: 401 })

  return session
}
