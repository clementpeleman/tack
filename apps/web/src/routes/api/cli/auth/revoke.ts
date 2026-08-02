import { createFileRoute } from '@tanstack/react-router'
import { getBearerToken, revokeOwnerToken } from '#/lib/owner-token'

/**
 * `tack logout` — revokes server-side, so deleting the local credentials file
 * is not the only thing standing between a leaked token and the account.
 */
export const Route = createFileRoute('/api/cli/auth/revoke')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getBearerToken(request)
        if (!token) return Response.json({ ok: true })

        // Always 200: whether the token existed is not information a caller
        // holding an unknown token should be able to confirm.
        await revokeOwnerToken(token)
        return Response.json({ ok: true })
      },
    },
  },
})
