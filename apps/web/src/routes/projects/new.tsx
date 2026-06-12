import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createProject } from '#/lib/projects'
import { ThemeToggle } from '#/components/ThemeToggle'

export const Route = createFileRoute('/projects/new')({
  component: NewProjectPage,
  validateSearch: (search: Record<string, unknown>) => ({
    onboarding: search.onboarding === '1' || search.onboarding === 1,
  }),
})

function NewProjectPage() {
  const navigate = useNavigate()
  const { onboarding } = Route.useSearch()
  const [name, setName] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !previewUrl) return
    setError('')
    setLoading(true)

    try {
      const project = await createProject({
        data: { name, previewUrl },
      })
      navigate({
        to: '/projects/$id/install',
        params: { id: project.id },
        search: onboarding ? { onboarding: true } : {},
      })
    } catch {
      setError('Failed to create project. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--page)] relative">
      <div className="absolute top-4 right-4 w-48">
        <ThemeToggle compact />
      </div>
      <div className="max-w-md mx-auto p-8 pt-16">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-xs text-[var(--ink-soft)] hover:text-[var(--ink-mute)] no-underline font-mono mb-6 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M8.5 3.5 L5 7 L8.5 10.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to projects
        </Link>

        <h1 className="text-xl font-semibold text-[var(--ink)] mb-1">
          {onboarding ? 'Create your first project' : 'New project'}
        </h1>
        <p className="text-sm text-[var(--ink-mute)] mb-6">
          Create a project to start collecting visual feedback.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--ink-mute)] mb-1.5 font-mono uppercase">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="acme.com redesign"
              required
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-sm placeholder:text-[var(--ink-soft)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--ink-mute)] mb-1.5 font-mono uppercase">
              Preview URL
            </label>
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="https://preview.acme.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-sm placeholder:text-[var(--ink-soft)] transition-colors"
            />
            <p className="text-[11px] text-[var(--ink-soft)] mt-1.5">
              Where the widget will be embedded. You can change this later.
            </p>
          </div>

          {error && (
            <p className="text-xs text-[var(--danger)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-3 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--on-accent)] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Creating...' : 'Create project'}
          </button>
        </form>
      </div>
    </main>
  )
}
