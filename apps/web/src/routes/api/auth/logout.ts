import { createFileRoute } from '@tanstack/react-router'
import {
  invalidateSession,
  getSessionTokenFromRequest,
  clearSessionCookie,
} from '#/lib/auth'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getSessionTokenFromRequest(request)
        if (token) {
          await invalidateSession(token)
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: '/login',
            'Set-Cookie': clearSessionCookie(),
          },
        })
      },
    },
  },
})
