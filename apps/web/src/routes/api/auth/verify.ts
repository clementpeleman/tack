import { createFileRoute } from '@tanstack/react-router'
import { verifyMagicLinkToken, getSessionCookie } from '#/lib/auth'

export const Route = createFileRoute('/api/auth/verify')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const token = url.searchParams.get('token')

        if (!token) {
          return Response.json({ error: 'Token required' }, { status: 400 })
        }

        const result = await verifyMagicLinkToken(token)

        if (!result) {
          return Response.json(
            { error: 'Invalid or expired token' },
            { status: 401 },
          )
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: '/projects',
            'Set-Cookie': getSessionCookie(result.sessionId),
          },
        })
      },
    },
  },
})
