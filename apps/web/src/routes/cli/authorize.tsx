import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { useState } from 'react'
import { Button } from '#/components/ui/Button'
import { Logo } from '#/components/brand/Logo'
import { requireDashboardAuth } from '#/lib/auth'
import {
  approveAuthRequest,
  buildLoopbackRedirect,
  getPendingRequest,
} from '#/lib/cli-auth'
import { CLI_SCOPES } from '#/lib/owner-token'
import { getCurrentUser } from '#/lib/user'

const loadRequest = createServerFn({ method: 'GET' })
  .inputValidator((data: { request: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requireDashboardAuth(request)

    // The page is only ever rendered top-level; framing it would let an
    // attacker's request be approved by a distracted owner.
    setResponseHeader(
      'Content-Security-Policy',
      "frame-ancestors 'none'",
    )
    setResponseHeader('X-Frame-Options', 'DENY')

    const pending = await getPendingRequest(data.request)
    if (!pending) return { found: false as const }

    const user = await getCurrentUser()
    return {
      found: true as const,
      userCode: pending.userCode,
      clientLabel: pending.clientLabel,
      manualEntry: pending.redirectPort == null,
      email: user.email,
      // Sent from the server rather than imported into the component: the
      // scopes constant lives beside code that pulls in node:crypto and the
      // db, and referencing it from JSX would drag both into the client bundle.
      scopes: [...CLI_SCOPES],
    }
  })

const approve = createServerFn({ method: 'POST' })
  .inputValidator((data: { request: string }) => data)
  .handler(async ({ data }) => {
    const httpRequest = getRequest()
    const { userId } = await requireDashboardAuth(httpRequest)

    // SameSite=Lax already blocks a cross-site POST from carrying the session
    // cookie; this rejects a same-site-but-wrong-origin submission too.
    const origin = httpRequest.headers.get('origin')
    if (origin && origin !== new URL(httpRequest.url).origin) {
      return { ok: false as const, error: 'Invalid request origin.' }
    }

    const approved = await approveAuthRequest(data.request, userId)
    if (!approved) {
      return { ok: false as const, error: 'This request expired or was already used.' }
    }

    return {
      ok: true as const,
      // Only present in loopback mode; in manual mode the CLI prompts for it.
      redirectTo:
        approved.redirectPort != null
          ? buildLoopbackRedirect(approved.redirectPort, approved.code, data.request)
          : null,
      code: approved.code,
    }
  })

export const Route = createFileRoute('/cli/authorize')({
  validateSearch: (search: Record<string, unknown>) => ({
    request: typeof search.request === 'string' ? search.request : '',
  }),
  beforeLoad: ({ search }) => {
    if (!search.request) throw redirect({ to: '/projects' })
  },
  loaderDeps: ({ search }) => ({ request: search.request }),
  loader: ({ deps }) => loadRequest({ data: { request: deps.request } }),
  component: AuthorizePage,
})

function AuthorizePage() {
  const data = Route.useLoaderData()
  const { request } = Route.useSearch()
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'working' }
    | { status: 'done'; code: string }
    | { status: 'error'; message: string }
  >({ status: 'idle' })

  const handleApprove = async () => {
    setState({ status: 'working' })
    const result = await approve({ data: { request } })
    if (!result.ok) {
      setState({ status: 'error', message: result.error })
      return
    }
    if (result.redirectTo) {
      window.location.href = result.redirectTo
      return
    }
    setState({ status: 'done', code: result.code })
  }

  return (
    <main className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size={22} fontSize={17} />
        </div>

        {!data.found ? (
          <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
            <h1 className="text-lg font-semibold text-[var(--ink)] mb-1">
              This request expired
            </h1>
            <p className="text-sm text-[var(--ink-mute)]">
              Login requests are valid for 10 minutes. Run the command again to
              start a new one.
            </p>
          </div>
        ) : state.status === 'done' ? (
          <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-6">
            <h1 className="text-lg font-semibold text-[var(--ink)] mb-1">
              Paste this code into the CLI
            </h1>
            <p className="text-sm text-[var(--ink-mute)] mb-4">
              Your terminal is waiting for it.
            </p>
            <code className="block rounded-[10px] bg-[var(--surface-2)] px-3 py-3 font-mono text-sm text-[var(--ink)] break-all">
              {state.code}
            </code>
          </div>
        ) : (
          <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-6">
            <h1 className="text-lg font-semibold text-[var(--ink)] mb-1">
              Authorize the Tack CLI
            </h1>
            <p className="text-sm text-[var(--ink-mute)] mb-5">
              Signed in as{' '}
              <span className="font-mono text-[var(--ink-soft)]">
                {data.email}
              </span>
              .
            </p>

            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] p-4 mb-5">
              <p className="font-mono text-[11px] uppercase text-[var(--ink-mute)] mb-1.5">
                Verification code
              </p>
              <p className="font-mono text-xl tracking-[0.12em] text-[var(--ink)]">
                {data.userCode}
              </p>
              <p className="text-xs text-[var(--ink-mute)] mt-2">
                Only continue if this matches the code shown in your terminal.
              </p>
            </div>

            <dl className="text-sm mb-5">
              <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
                <dt className="text-[var(--ink-mute)]">Client</dt>
                <dd className="text-right font-mono text-xs text-[var(--ink)]">
                  {data.clientLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-[var(--ink-mute)]">Access</dt>
                <dd className="text-right text-xs text-[var(--ink)]">
                  {data.scopes.join(', ')}
                </dd>
              </div>
            </dl>

            <p className="text-xs text-[var(--ink-mute)] mb-5">
              The CLI can list your projects, create one, create share links, and register local dev
              origins. It cannot read pins or reviewer feedback.
            </p>

            {state.status === 'error' && (
              <p className="text-xs text-[var(--danger)] mb-4" role="alert">
                {state.message}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={state.status === 'working'}
              >
                {state.status === 'working' ? 'Authorizing…' : 'Authorize'}
              </Button>
              <Button variant="secondary" href="/projects">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
