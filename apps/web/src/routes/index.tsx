import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSessionTokenFromRequest, validateSession } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'

const checkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const token = getSessionTokenFromRequest(request)
  if (!token) return { authenticated: false }
  const session = await validateSession(token)
  return { authenticated: !!session }
})

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { authenticated } = await checkAuth()
    if (authenticated) {
      throw redirect({ to: '/projects' })
    } else {
      throw redirect({ to: '/login' })
    }
  },
})
