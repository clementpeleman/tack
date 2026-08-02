import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '#/db/index'
import { cliAuthRequests } from '#/db/schema'
import { hashToken } from '#/lib/auth'
import { CLI_SCOPES, createOwnerToken } from '#/lib/owner-token'

/** A login handshake is short-lived on purpose; the CLI is waiting on it. */
const REQUEST_TTL_MS = 10 * 60 * 1000

/**
 * The loopback redirect target is hardcoded. Only the port is caller-supplied,
 * and only after being validated as an integer in the ephemeral range — if the
 * host were caller-supplied this endpoint would be an open redirect that hands
 * an auth code to an arbitrary origin.
 */
export const LOOPBACK_HOST = '127.0.0.1'

export function isValidRedirectPort(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1024 &&
    value <= 65535
  )
}

export function buildLoopbackRedirect(
  port: number,
  code: string,
  state: string,
): string {
  const url = new URL(`http://${LOOPBACK_HOST}:${port}/callback`)
  url.searchParams.set('code', code)
  url.searchParams.set('state', state)
  return url.toString()
}

/** Unambiguous alphabet — no O/0, I/1 — since a human may read this aloud. */
const USER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateUserCode(): string {
  const bytes = randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += USER_CODE_ALPHABET[bytes[i] % USER_CODE_ALPHABET.length]
    if (i === 3) out += '-'
  }
  return out
}

export function sha256Base64Url(input: string): string {
  return createHash('sha256').update(input).digest('base64url')
}

/** PKCE S256 check, compared in constant time. */
export function verifyCodeChallenge(
  verifier: string,
  challenge: string,
): boolean {
  const expected = Buffer.from(sha256Base64Url(verifier))
  const actual = Buffer.from(challenge)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

export interface StartedAuthRequest {
  requestId: string
  userCode: string
  expiresAt: string
}

export async function startAuthRequest(input: {
  codeChallenge: string
  redirectPort: number | null
  clientLabel: string
}): Promise<StartedAuthRequest> {
  const requestId = randomBytes(32).toString('base64url')
  const userCode = generateUserCode()
  const expiresAt = new Date(Date.now() + REQUEST_TTL_MS).toISOString()

  await db.insert(cliAuthRequests).values({
    requestIdHash: hashToken(requestId),
    codeChallenge: input.codeChallenge,
    redirectPort: input.redirectPort,
    userCode,
    clientLabel: input.clientLabel.slice(0, 120),
    expiresAt,
  })

  // The raw id goes to the CLI only; the row is looked up by hash.
  return { requestId, userCode, expiresAt }
}

async function findLiveRequest(requestId: string) {
  const [row] = await db
    .select()
    .from(cliAuthRequests)
    .where(eq(cliAuthRequests.requestIdHash, hashToken(requestId)))

  if (!row) return null
  if (row.consumedAt) return null
  if (Date.parse(row.expiresAt) <= Date.now()) return null
  return row
}

export async function getPendingRequest(requestId: string) {
  const row = await findLiveRequest(requestId)
  if (!row || row.approvedUserId) return null
  return row
}

/**
 * Approve a pending request and mint the one-shot auth code. The long-lived
 * token is NOT created here — it is only issued at exchange, when the CLI
 * proves possession of the PKCE verifier.
 */
export async function approveAuthRequest(
  requestId: string,
  userId: string,
): Promise<{ code: string; redirectPort: number | null } | null> {
  const row = await findLiveRequest(requestId)
  if (!row || row.approvedUserId) return null

  const code = randomBytes(32).toString('base64url')

  const updated = await db
    .update(cliAuthRequests)
    .set({ approvedUserId: userId, authCodeHash: hashToken(code) })
    .where(
      and(
        eq(cliAuthRequests.id, row.id),
        isNull(cliAuthRequests.approvedUserId),
      ),
    )
    .returning({ id: cliAuthRequests.id })

  // Lost a race with a concurrent approval.
  if (updated.length === 0) return null

  return { code, redirectPort: row.redirectPort }
}

export type ExchangeResult =
  | { ok: true; token: string; expiresAt: string; userId: string }
  | { ok: false; error: string }

/**
 * Trade an approved auth code + PKCE verifier for an owner token. Single use:
 * the request is marked consumed before the token is minted, so a replayed
 * code cannot produce a second token.
 */
export async function exchangeAuthCode(input: {
  requestId: string
  code: string
  codeVerifier: string
  label: string
}): Promise<ExchangeResult> {
  const row = await findLiveRequest(input.requestId)
  if (!row) return { ok: false, error: 'Request not found or expired.' }
  if (!row.approvedUserId || !row.authCodeHash) {
    return { ok: false, error: 'Request has not been approved yet.' }
  }

  const provided = Buffer.from(hashToken(input.code))
  const expected = Buffer.from(row.authCodeHash)
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return { ok: false, error: 'Invalid code.' }
  }

  if (!verifyCodeChallenge(input.codeVerifier, row.codeChallenge)) {
    return { ok: false, error: 'Invalid code verifier.' }
  }

  // Consume first, and only if still unconsumed, so a concurrent replay loses.
  const consumed = await db
    .update(cliAuthRequests)
    .set({ consumedAt: new Date().toISOString() })
    .where(
      and(eq(cliAuthRequests.id, row.id), isNull(cliAuthRequests.consumedAt)),
    )
    .returning({ id: cliAuthRequests.id })

  if (consumed.length === 0) return { ok: false, error: 'Code already used.' }

  const { token, expiresAt } = await createOwnerToken({
    userId: row.approvedUserId,
    label: input.label || row.clientLabel,
    scopes: CLI_SCOPES,
    source: 'cli',
  })

  return { ok: true, token, expiresAt, userId: row.approvedUserId }
}
