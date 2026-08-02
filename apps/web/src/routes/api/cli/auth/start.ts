import { createFileRoute } from '@tanstack/react-router'
import {
  isValidRedirectPort,
  startAuthRequest,
} from '#/lib/cli-auth'
import { cliAuthRateLimited, getClientIp } from '#/lib/rate-limit'

/**
 * Begins the CLI browser-login handshake. Unauthenticated by design — anyone
 * can ask to start one, but nothing is granted until a signed-in owner
 * approves it in the browser and the caller proves possession of the PKCE
 * verifier at exchange.
 */
export const Route = createFileRoute('/api/cli/auth/start')({
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

        const { codeChallenge, redirectPort, clientLabel } = body as Record<
          string,
          unknown
        >

        if (
          typeof codeChallenge !== 'string' ||
          codeChallenge.length < 32 ||
          codeChallenge.length > 128
        ) {
          return Response.json(
            { error: 'codeChallenge required (S256, base64url)' },
            { status: 400 },
          )
        }

        // null is legitimate: the CLI could not bind a port (SSH, container),
        // so approval falls back to showing the code for manual entry.
        if (redirectPort != null && !isValidRedirectPort(redirectPort)) {
          return Response.json(
            { error: 'redirectPort must be an integer between 1024 and 65535' },
            { status: 400 },
          )
        }

        if (typeof clientLabel !== 'string' || clientLabel.length === 0) {
          return Response.json(
            { error: 'clientLabel required' },
            { status: 400 },
          )
        }

        const started = await startAuthRequest({
          codeChallenge,
          redirectPort: redirectPort == null ? null : (redirectPort as number),
          clientLabel,
        })

        const authorizeUrl = new URL(
          '/cli/authorize',
          new URL(request.url).origin,
        )
        authorizeUrl.searchParams.set('request', started.requestId)

        return Response.json({
          requestId: started.requestId,
          userCode: started.userCode,
          authorizeUrl: authorizeUrl.toString(),
          expiresAt: started.expiresAt,
        })
      },
    },
  },
})
