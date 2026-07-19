import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { useState } from 'react'
import { ThemeToggle } from '#/components/ThemeToggle'
import { Field } from '#/components/ui/Field'
import { Button } from '#/components/ui/Button'
import { isEmailConfigured } from '#/lib/email'
import { claimFirstOwner, getSessionCookie, hasAnyUser } from '#/lib/auth'

const getLoginConfig = createServerFn({ method: 'GET' }).handler(async () => ({
  emailConfigured: isEmailConfigured(),
  needsClaim: !(await hasAnyUser()),
}))

const claimInstance = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email?.toLowerCase().trim()
    if (!email || !email.includes('@')) {
      return { ok: false as const, error: 'Enter a valid email.' }
    }
    const result = await claimFirstOwner(email)
    if (!result) {
      return {
        ok: false as const,
        error: 'This instance is already set up. Sign in instead.',
      }
    }
    setResponseHeader('Set-Cookie', getSessionCookie(result.sessionId))
    return { ok: true as const }
  })

export const Route = createFileRoute('/login')({
  loader: () => getLoginConfig(),
  component: LoginPage,
})

function LoginPage() {
  const { emailConfigured, needsClaim } = Route.useLoaderData()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await claimInstance({ data: { email } })
      if (!result.ok) {
        setError(result.error)
        return
      }
      window.location.href = '/projects'
    } catch {
      setError('Could not reach server')
    } finally {
      setLoading(false)
    }
  }

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

        {needsClaim ? (
          <>
            <h1 className="text-lg font-medium text-[var(--ink)] mb-1">
              Set up Tack
            </h1>
            <p className="text-sm text-[var(--ink-mute)] mb-6">
              This instance has no owner yet. Claim it with your email — no
              confirmation link needed.
            </p>

            <form onSubmit={handleClaim} className="space-y-4">
              <Field
                label="Owner email"
                id="claim-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
                autoComplete="email"
                aria-describedby={error ? 'login-error' : undefined}
              />
              {error && (
                <p id="login-error" className="text-xs text-[var(--danger)]" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Setting up…' : 'Claim this instance'}
              </Button>
            </form>
          </>
        ) : sent ? (
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
              <Field
                label="Email"
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
                autoComplete="email"
                aria-describedby={error ? 'login-error' : undefined}
              />
              {error && (
                <p id="login-error" className="text-xs text-[var(--danger)]" role="alert">{error}</p>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Continue with email'}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
