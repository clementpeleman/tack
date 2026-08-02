import { createFileRoute } from '@tanstack/react-router'
import { exchangeAuthCode } from '#/lib/cli-auth'
import { cliAuthRateLimited, getClientIp } from '#/lib/rate-limit'

/**
 * Trades an approved auth code + PKCE verifier for an owner token. This is the
 * only place the token is ever produced, and it never travels through the
 * browser — so it cannot end up in history, a referrer, or the address bar.
 */
export const Route = createFileRoute('/api/cli/auth/token')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (cliAuthRateLimited(getClientIp(request))) {
          return Response.json(
            { error: 'Too many requests. Try again shortly.' },
            { status: 429 },
          )
        }

        const body = await request.json().catch(() => null)
        if (!body || typeof body !== 'object') {
          return Response.json({ error: 'Invalid body' }, { status: 400 })
        }

        const { requestId, code, codeVerifier, label } = body as Record<
          string,
          unknown
        >

        if (
          typeof requestId !== 'string' ||
          typeof code !== 'string' ||
          typeof codeVerifier !== 'string'
        ) {
          return Response.json(
            { error: 'requestId, code and codeVerifier are required' },
            { status: 400 },
          )
        }

        const result = await exchangeAuthCode({
          requestId,
          code,
          codeVerifier,
          label: typeof label === 'string' ? label : '',
        })

        if (!result.ok) {
          // Deliberately uniform: not-found, unapproved, wrong code and wrong
          // verifier all return the same shape, so this can't be used to probe
          // which part of a guess was correct.
          return Response.json({ error: result.error }, { status: 400 })
        }

        return Response.json({
          token: result.token,
          expiresAt: result.expiresAt,
        })
      },
    },
  },
})
