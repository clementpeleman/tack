import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSessionTokenFromRequest, validateSession } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { Landing } from '#/components/Landing'

const checkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const token = getSessionTokenFromRequest(request)
  if (!token) return { authenticated: false }
  const session = await validateSession(token)
  return { authenticated: !!session }
})

export const Route = createFileRoute('/')({
  // Logged-in owners go straight to their projects; everyone else sees the
  // marketing landing.
  beforeLoad: async () => {
    const { authenticated } = await checkAuth()
    if (authenticated) {
      throw redirect({ to: '/projects' })
    }
  },
  head: () => ({
    meta: [
      { title: 'Tack — visual feedback for preview sites, pinned' },
      {
        name: 'description',
        content:
          'Open-source visual feedback for preview sites. A reviewer pins a comment on the exact element; you get the URL, CSS selector, screenshot and viewport. Self-hostable, AGPL.',
      },
    ],
  }),
  component: LandingPage,
})

function LandingPage() {
  return <Landing />
}
