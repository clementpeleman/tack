import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { ThemeToggle } from '#/components/ThemeToggle'
import { isEmailConfigured } from '#/lib/email'

const getLoginConfig = createServerFn({ method: 'GET' }).handler(async () => ({
  emailConfigured: isEmailConfigured(),
}))

export const Route = createFileRoute('/login')({
  loader: () => getLoginConfig(),
  component: LoginPage,
})

function LoginPage() {
  const { emailConfigured } = Route.useLoaderData()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong')
        return
      }

      setSent(true)
    } catch {
      setError('Could not reach server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--page)] relative">
      <div className="absolute top-4 right-4 w-48">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-8">
          <svg width="24" height="24" viewBox="0 0 22 22" aria-hidden="true">
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
          <span className="text-xl font-semibold text-[var(--ink)]">
            tack
          </span>
        </div>

        {sent ? (
          <div className="rounded-lg border border-[var(--signal)] bg-[color-mix(in_oklab,var(--signal)_8%,var(--surface))] p-5">
            <p className="text-sm text-[var(--ink)] font-medium mb-1">
              {emailConfigured ? 'Check your inbox' : 'Check the server logs'}
            </p>
            {emailConfigured ? (
              <p className="text-xs text-[var(--ink-mute)]">
                We sent a sign-in link to{' '}
                <span className="font-mono text-[var(--ink-soft)]">{email}</span>.
              </p>
            ) : (
              <p className="text-xs text-[var(--ink-mute)]">
                No email provider is configured, so the sign-in link for{' '}
                <span className="font-mono text-[var(--ink-soft)]">{email}</span>{' '}
                was printed to the server logs. Run{' '}
                <code className="font-mono text-[var(--ink-soft)]">
                  docker compose logs -f tack
                </code>{' '}
                (or check the terminal running the server) and open the link.
              </p>
            )}
            <button
              onClick={() => {
                setSent(false)
                setEmail('')
              }}
              className="mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-2)] bg-transparent border-none cursor-pointer font-mono transition-colors"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-medium text-[var(--ink)] mb-1">
              Sign in
            </h1>
            <p className="text-sm text-[var(--ink-mute)] mb-6">
              Enter your email to receive a magic link.
            </p>

            {!emailConfigured && (
              <p className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--ink-mute)]">
                This server has no email provider configured. Sign-in links are
                printed to the server logs instead of emailed — set{' '}
                <code className="font-mono text-[var(--ink-soft)]">RESEND_API_KEY</code>{' '}
                or{' '}
                <code className="font-mono text-[var(--ink-soft)]">SMTP_HOST</code>{' '}
                +{' '}
                <code className="font-mono text-[var(--ink-soft)]">SMTP_FROM</code>{' '}
                to enable email.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs text-[var(--ink-mute)] mb-1.5 font-mono uppercase">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                  autoComplete="email"
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-sm placeholder:text-[var(--ink-soft)] transition-colors"
                />
              </div>
              {error && (
                <p id="login-error" className="text-xs text-[var(--danger)]" role="alert">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--on-accent)] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Sending...' : 'Continue with email'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
