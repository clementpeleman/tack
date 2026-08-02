import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { users } from '#/db/schema'
import { requireOwnerToken } from '#/lib/owner-token'

/** Cheap validity check for a cached token — `tack status` and startup. */
export const Route = createFileRoute('/api/cli/whoami')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { userId, scopes } = await requireOwnerToken(request)

        const [user] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, userId))

        return Response.json({ email: user?.email ?? null, scopes })
      },
    },
  },
})
