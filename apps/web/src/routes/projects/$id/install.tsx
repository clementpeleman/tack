import { createFileRoute, redirect } from '@tanstack/react-router'

/** Old address of the connect page; links in emails and the CLI may still use it. */
export const Route = createFileRoute('/projects/$id/install')({
  validateSearch: (search: Record<string, unknown>) => ({
    onboarding: search.onboarding === '1' || search.onboarding === 1 || search.onboarding === true || search.onboarding === 'true',
  }),
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/projects/$id/connect',
      params: { id: params.id },
      search: { onboarding: search.onboarding },
    })
  },
})
