import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getProjectsOverview } from '#/lib/projects'
import { getCurrentUser } from '#/lib/user'
import { AccountMenu } from '#/components/AccountMenu'
import { Logo } from '#/components/brand/Logo'
import { buttonClasses } from '#/components/ui/Button'
import { getTimeAgo } from '#/lib/pin-display'

export const Route = createFileRoute('/projects/')({
  beforeLoad: async () => {
    const [user, projects] = await Promise.all([getCurrentUser(), getProjectsOverview()])
    if (!user.onboardingCompletedAt && projects.length === 0) {
      throw redirect({ to: '/projects/new', search: { onboarding: true } })
    }
  },
  component: ProjectsPage,
  loader: async () => {
    const [projects, user] = await Promise.all([getProjectsOverview(), getCurrentUser()])
    return { projects, userEmail: user.email }
  },
})

function host(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/**
 * All projects, as a list rather than cards: what is open and when the
 * last pin came in are the two things that decide where an owner goes next.
 */
function ProjectsPage() {
  const { projects, userEmail } = Route.useLoaderData()

  return (
    <main className="min-h-screen bg-[var(--page)]">
      <div className="mx-auto max-w-3xl p-6 md:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={18} wordmark={false} />
            <h1 className="text-page-title">Projects</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden w-52 sm:block">
              <AccountMenu email={userEmail} align="end" side="bottom" />
            </div>
            <Link to="/projects/new" search={{ onboarding: false }} className={buttonClasses('primary', 'md')}>
              New project
            </Link>
          </div>
        </div>
        <div className="mb-6 sm:hidden">
          <AccountMenu email={userEmail} side="bottom" />
        </div>

        {projects.length === 0 ? (
          <div className="max-w-md py-10">
            <h2 className="font-display text-[20px] font-bold text-[var(--ink)]">No projects yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-mute)]">
              A project is one website under review. Create one, share a review link with your client, and their pins land in its inbox.
            </p>
            <Link to="/projects/new" search={{ onboarding: false }} className={`${buttonClasses('primary', 'md')} mt-5`}>
              Create your first project
            </Link>
          </div>
        ) : (
          <ol className="m-0 list-none border-t border-[var(--line)] p-0">
            {projects.map((project) => (
              <li key={project.id} className="border-b border-[var(--line)]">
                <Link
                  to="/projects/$id/inbox"
                  params={{ id: project.id }}
                  className="group flex items-center gap-4 py-4 no-underline outline-none transition-colors hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] -mx-3 px-3 rounded-lg"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[17px] font-bold text-[var(--ink)]">
                      {project.name}
                    </span>
                    <span className="mt-0.5 block truncate text-meta">
                      {project.previewUrl ? host(project.previewUrl) : 'no preview URL'}
                      {!project.connected && ' · not connected yet'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block text-sm ${project.open > 0 ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink-mute)]'}`}>
                      {project.open > 0 ? `${project.open} open` : project.total > 0 ? 'all resolved' : 'no pins'}
                    </span>
                    {project.lastPinAt && (
                      <span className="block text-meta">last pin {getTimeAgo(project.lastPinAt)}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  )
}
