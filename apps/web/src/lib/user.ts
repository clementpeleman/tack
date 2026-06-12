import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { db } from '#/db/index'
import { users } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '#/lib/auth'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user) throw new Response('Not found', { status: 404 })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompletedAt: user.onboardingCompletedAt,
    }
  },
)

export const completeOnboarding = createServerFn({ method: 'POST' }).handler(
  async () => {
    const request = getRequest()
    const { userId } = await requireAuth(request)

    await db
      .update(users)
      .set({ onboardingCompletedAt: new Date().toISOString() })
      .where(eq(users.id, userId))

    return { ok: true as const }
  },
)
