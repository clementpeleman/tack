import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getProjects } from '#/lib/projects'
import { getCurrentUser } from '#/lib/user'
import { ThemeToggle } from '#/components/ThemeToggle'

export const Route = createFileRoute('/projects/')({
  beforeLoad: async () => {
    const [user, projects] = await Promise.all([
      getCurrentUser(),
      getProjects(),
    ])

    if (!user.onboardingCompletedAt && projects.length === 0) {
      throw redirect({
        to: '/projects/new',
        search: { onboarding: true },
      })
    }
  },
  component: ProjectsPage,
  loader: () => getProjects(),
})

function ProjectsPage() {
  const projects = Route.useLoaderData()

  return (
    <main className="min-h-screen bg-[var(--page)]">
      <div className="max-w-3xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">
              <circle
                cx="11"
                cy="11"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.4"
              />
              <circle cx="11" cy="11" r="4" fill="var(--pin)" />
            </svg>
            <h1 className="text-xl font-semibold text-[var(--ink)]">
              Projects
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-40 hidden sm:block">
              <ThemeToggle compact />
            </div>
            <Link
              to="/projects/new"
              className="px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-sm font-medium hover:opacity-90 no-underline transition-opacity"
            >
              New project
            </Link>
          </div>
        </div>

        <div className="sm:hidden mb-6">
          <ThemeToggle compact />
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] p-12 text-center">
            <div className="w-10 h-10 bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="text-[var(--accent)]"
              >
                <rect
                  x="3"
                  y="3"
                  width="14"
                  height="14"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M10 7v6M7 10h6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-sm text-[var(--ink)] font-medium mb-1">
              No projects yet
            </p>
            <p className="text-xs text-[var(--ink-mute)] max-w-xs mx-auto mb-4">
              Create a project and embed the Tack widget on your preview site to
              start collecting feedback.
            </p>
            <Link
              to="/projects/new"
              className="inline-block px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-sm font-medium hover:opacity-90 no-underline transition-opacity"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/projects/$id/inbox"
                params={{ id: project.id }}
                className="group block rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 hover:border-[var(--accent)] no-underline transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[var(--pin)] shrink-0" />
                    <div>
                      <h2 className="text-sm font-medium text-[var(--ink)]">
                        {project.name}
                      </h2>
                      <p className="text-xs text-[var(--ink-soft)] font-mono mt-0.5">
                        {project.previewUrl}
                      </p>
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-[var(--ink-soft)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
