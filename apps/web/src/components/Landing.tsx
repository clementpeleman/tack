import { useState, useRef, type MouseEvent } from 'react'
import { ArrowRight, Check, Copy, MousePointerClick } from 'lucide-react'
import { ThemeToggle } from '#/components/ThemeToggle'

const GITHUB_URL = 'https://github.com/clementpeleman/tack'
const DEMO_URL = '/demo'
const SIGNIN_URL = '/login'

/** Clay pointer wordmark — Tack's pin as a cursor head. */
function PinMark({ size = 20 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="block shrink-0 rounded-[52%_52%_52%_3px]"
      style={{
        width: size,
        height: size,
        background: 'var(--pin)',
        boxShadow:
          '0 0 0 2px var(--page), 0 4px 10px -3px color-mix(in oklab, var(--pin) 55%, transparent)',
      }}
    />
  )
}

/** A bare collaborator pin head (cursor blob), pointing down-left. */
function PinDrop({ tone = 'var(--pin)', className = '' }: { tone?: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-5 w-5 rounded-[52%_52%_52%_3px] ${className}`}
      style={{
        background: tone,
        boxShadow: `0 0 0 2px var(--page), 0 6px 16px -4px color-mix(in oklab, ${tone} 55%, transparent)`,
      }}
    />
  )
}

/** A named collaborator pointer: a tinted name pill + a cursor blob, mirroring
 *  the multiplayer pointers from the reference. `flip` puts the blob first. */
function Pointer({
  label,
  tone,
  flip = false,
  className = '',
}: {
  label: string
  tone: string
  flip?: boolean
  className?: string
}) {
  const pill = (
    <span
      className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none"
      style={{
        background: `color-mix(in oklab, ${tone} 15%, var(--surface))`,
        color: `color-mix(in oklab, ${tone} 68%, var(--ink))`,
      }}
    >
      {label}
    </span>
  )
  const blob = (
    <span
      aria-hidden="true"
      className="block h-4 w-4 shrink-0 rounded-[52%_52%_52%_3px]"
      style={{
        background: tone,
        boxShadow: `0 0 0 2px var(--page), 0 5px 14px -4px color-mix(in oklab, ${tone} 55%, transparent)`,
      }}
    />
  )
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {flip ? (
        <>
          {blob}
          {pill}
        </>
      ) : (
        <>
          {pill}
          {blob}
        </>
      )}
    </div>
  )
}

function PrimaryLink({
  href,
  children,
  external = false,
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] no-underline transition-[transform,opacity] duration-200 hover:opacity-90 active:translate-y-px"
    >
      {children}
      <ArrowRight
        size={16}
        strokeWidth={2}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  )
}

function GhostLink({
  href,
  children,
  external = false,
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-5 text-sm font-medium text-[var(--ink)] no-underline transition-colors duration-200 hover:bg-[var(--surface-2)]"
    >
      {children}
    </a>
  )
}

function GitHubGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function FauxBar() {
  return (
    <span className="flex gap-1.5" aria-hidden="true">
      <span className="h-2.5 w-2.5 rounded-full bg-[var(--line)]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[var(--line)]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[var(--line)]" />
    </span>
  )
}

/** A muted skeleton line used inside the faux preview / inbox mocks. */
function Bar({ w }: { w: string }) {
  return (
    <span
      aria-hidden="true"
      className="block h-2 rounded-full bg-[var(--surface-3)]"
      style={{ width: w }}
    />
  )
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] py-2.5 last:border-b-0">
      <dt className="text-xs text-[var(--ink-mute)]">{label}</dt>
      <dd className="text-right text-sm text-[var(--ink)]">{value}</dd>
    </div>
  )
}

/** The signature hero artifact: a live preview you can pin. Decorative — the
 *  meaning is carried by the copy, so the container stays aria-hidden. */
function HeroArtifact() {
  const [pins, setPins] = useState<{ id: number; x: number; y: number }[]>([])
  const [interacted, setInteracted] = useState(false)
  const idRef = useRef(0)

  const dropPin = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    setInteracted(true)
    setPins((prev) => [...prev.slice(-5), { id: idRef.current++, x, y }])
  }

  return (
    <div className="relative" aria-hidden="true">
      {/* preview window */}
      <div className="tk-fade overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-modal)]">
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <FauxBar />
          <span className="truncate rounded-md bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--ink-soft)]">
            preview.acme.com/pricing
          </span>
        </div>
        <div
          className="relative cursor-crosshair space-y-4 p-6 select-none sm:p-8"
          onClick={dropPin}
        >
          {/* invitation to interact — fades after the first pin */}
          <div
            className={`pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 transition-opacity duration-300 ${interacted ? 'opacity-0' : 'opacity-100'}`}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: 'color-mix(in oklab, var(--tk-accent) 14%, var(--surface))',
                color: 'color-mix(in oklab, var(--tk-accent) 70%, var(--ink))',
              }}
            >
              <MousePointerClick size={13} strokeWidth={2} aria-hidden="true" />
              Click to drop a pin
            </span>
          </div>

          <div className="space-y-2.5">
            <Bar w="42%" />
            <Bar w="70%" />
          </div>
          {/* the pinned element */}
          <div className="relative mt-6 rounded-lg border border-dashed border-[color-mix(in_oklab,var(--pin)_45%,var(--line))] bg-[color-mix(in_oklab,var(--pin)_5%,transparent)] p-5">
            <div className="space-y-2">
              <Bar w="55%" />
              <Bar w="38%" />
            </div>
            <span className="absolute -right-2.5 -top-2.5">
              <span className="tk-pin-drop block">
                <PinDrop />
              </span>
            </span>
          </div>
          <div className="space-y-2.5 pt-2">
            <Bar w="80%" />
            <Bar w="60%" />
          </div>

          {/* pins you drop */}
          {pins.map((p) => (
            <span
              key={p.id}
              className="tk-pop pointer-events-none absolute z-10 block h-4 w-4 rounded-[52%_52%_52%_3px]"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: 'translate(-50%, -100%)',
                background: 'var(--tk-accent)',
                boxShadow:
                  '0 0 0 2px var(--surface), 0 5px 14px -4px color-mix(in oklab, var(--tk-accent) 55%, transparent)',
              }}
            />
          ))}
        </div>
      </div>

      {/* floating collaborators — decorative; the meaning is in the copy */}
      <div className="tk-rise absolute -top-3.5 left-2 z-10 hidden sm:block lg:-left-10" style={{ animationDelay: '0.5s' }}>
        <Pointer label="Sam · client" tone="var(--pt-green)" />
      </div>
      <div className="tk-rise absolute bottom-28 left-2 z-10 hidden sm:block lg:-left-12" style={{ animationDelay: '0.68s' }}>
        <Pointer label="Maya · agency" tone="var(--pt-violet)" />
      </div>

      {/* comment popover */}
      <div className="tk-rise absolute -bottom-6 right-2 w-60 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3.5 shadow-[var(--shadow-modal)] sm:-right-8 sm:w-64" style={{ animationDelay: '0.6s' }}>
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--ink)] text-[10px] font-semibold text-[var(--page)]">
            M
          </span>
          <span className="text-xs font-medium text-[var(--ink)]">Mia</span>
          <span className="text-xs text-[var(--ink-soft)]">· client</span>
        </div>
        <p className="text-sm leading-snug text-[var(--ink)]">
          This headline should be punchier — and the CTA feels buried.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['.hero h1', '1440×900', 'Chrome'].map((chip) => (
            <span
              key={chip}
              className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--ink-mute)]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Landing() {
  const [copied, setCopied] = useState(false)
  const command = 'docker compose up --build'

  const copyCommand = () => {
    navigator.clipboard?.writeText(command).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      },
      () => {},
    )
  }

  return (
    <div className="tk-landing min-h-screen bg-[var(--page)] text-[var(--ink)]">
      {/* ── Nav ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--page)_85%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="/" className="flex items-center gap-2 no-underline" aria-label="Tack home">
            <PinMark />
            <span className="text-lg font-semibold tracking-tight text-[var(--ink)]">tack</span>
          </a>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            <a href={DEMO_URL} className="text-sm text-[var(--ink-mute)] no-underline transition-colors hover:text-[var(--ink)]">Live demo</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--ink-mute)] no-underline transition-colors hover:text-[var(--ink)]">GitHub</a>
            <a href="#self-host" className="text-sm text-[var(--ink-mute)] no-underline transition-colors hover:text-[var(--ink)]">Self-host</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href={SIGNIN_URL} className="hidden text-sm text-[var(--ink-mute)] no-underline transition-colors hover:text-[var(--ink)] sm:inline">Sign in</a>
            <PrimaryLink href={DEMO_URL}>Try the demo</PrimaryLink>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:pb-28">
          <div>
            <h1
              className="tk-rise font-semibold text-[var(--ink)]"
              style={{ fontSize: 'clamp(2.75rem, 5.8vw, 5rem)', lineHeight: 1.02, letterSpacing: '-0.02em', textWrap: 'balance' }}
            >
              Quantify client feedback.
            </h1>
            <p
              className="tk-rise mt-6 max-w-md text-lg leading-relaxed text-[var(--ink-mute)]"
              style={{ animationDelay: '0.08s', textWrap: 'pretty' }}
            >
              Reviewers pin comments on your preview site. Each one arrives with
              the exact element, a screenshot, the viewport, and the browser.
            </p>
            <div className="tk-rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.16s' }}>
              <PrimaryLink href={DEMO_URL}>Try the demo</PrimaryLink>
              <GhostLink href={GITHUB_URL} external>
                <GitHubGlyph />
                View on GitHub
              </GhostLink>
            </div>
            <p className="tk-rise mt-6 text-sm text-[var(--ink-mute)]" style={{ animationDelay: '0.24s' }}>
              Open source (AGPL) · Self-hosted with Docker
            </p>
          </div>
          <div className="lg:pl-6">
            <HeroArtifact />
          </div>
        </section>

        {/* ── The loop (genuine 3-step sequence) ──────────── */}
        <section className="tk-loop-section">
          <div className="tk-loop-content mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <h2
              className="max-w-2xl font-semibold text-[var(--ink)]"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)', lineHeight: 1.08, letterSpacing: '-0.02em', textWrap: 'balance' }}
            >
              What happens when someone leaves a comment.
            </h2>
            <p className="mt-4 max-w-xl text-[var(--ink-mute)]" style={{ textWrap: 'pretty' }}>
              No screenshots pasted into Slack, no thread spent working out which
              button they meant.
            </p>

            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  n: '1',
                  title: 'A reviewer leaves a comment',
                  body: 'They click the element, type what is wrong, and submit. The widget is already on your preview site, so there is nothing to install and no account to create.',
                  visual: (
                    <div className="tk-loop-card relative rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
                      <div className="space-y-2">
                        <Bar w="60%" />
                        <Bar w="40%" />
                      </div>
                      <span className="absolute right-3 top-3"><PinDrop /></span>
                    </div>
                  ),
                },
                {
                  n: '2',
                  title: 'It arrives with context',
                  body: 'The comment lands in your inbox with the page URL, the CSS selector, a screenshot, the viewport, and the browser — enough to reproduce it without asking.',
                  visual: (
                    <div className="tk-loop-card rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-[50%_50%_50%_2px] -rotate-45 bg-[var(--pin)]" aria-hidden="true" />
                        <span className="text-xs font-medium text-[var(--ink)]">Headline too soft</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {['/pricing', '.hero h1', '1440×900'].map((c) => (
                          <span key={c} className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--ink-mute)]">{c}</span>
                        ))}
                      </div>
                    </div>
                  ),
                },
                {
                  n: '3',
                  title: 'You triage it',
                  body: 'Reply, set a status, group duplicates, and resolve. “Open in preview” jumps straight back to the element on the live page.',
                  visual: (
                    <div className="tk-loop-card rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Check size={13} strokeWidth={2.5} className="text-[var(--ink-soft)]" aria-hidden="true" />
                          <Bar w="62%" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={13} strokeWidth={2.5} className="text-[var(--ink-soft)]" aria-hidden="true" />
                          <Bar w="48%" />
                        </div>
                      </div>
                    </div>
                  ),
                },
              ].map((step) => (
                <li key={step.n} className="relative">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--line)] text-sm font-semibold text-[var(--ink)]">
                      {step.n}
                    </span>
                    <h3 className="text-base font-semibold text-[var(--ink)]">{step.title}</h3>
                  </div>
                  {step.visual}
                  <p className="mt-4 text-sm leading-relaxed text-[var(--ink-mute)]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── The context ─────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
            <div>
              <h2
                className="font-semibold text-[var(--ink)]"
                style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)', lineHeight: 1.08, letterSpacing: '-0.02em', textWrap: 'balance' }}
              >
                Every comment carries what you need to reproduce it.
              </h2>
              <p className="mt-5 max-w-md text-[var(--ink-mute)]" style={{ textWrap: 'pretty' }}>
                Each comment is anchored to the element it's about and arrives with
                the details below. “Open in preview” takes you straight back to it
                on the live page.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)] sm:p-8">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 rounded-[50%_50%_50%_3px] -rotate-45 bg-[var(--pin)]" aria-hidden="true" />
                <span className="text-sm font-medium text-[var(--ink)]">Pin · “Headline too soft”</span>
              </div>
              <dl>
                <ContextRow label="Page" value="/pricing" />
                <ContextRow label="Element" value=".hero h1" />
                <ContextRow label="XPath" value="/html/body/main/section[1]/h1" />
                <ContextRow label="Viewport" value="1440 × 900" />
                <ContextRow label="Browser" value="Chrome 124 · macOS" />
                <ContextRow label="Screenshot" value="Captured" />
                <ContextRow label="Reviewer" value="Mia (no account)" />
              </dl>
            </div>
          </div>
        </section>

        {/* ── Agency angle ────────────────────────────────── */}
        <section className="border-y border-[var(--line)] bg-[var(--surface)]">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
            <h2
              className="mx-auto max-w-2xl font-semibold text-[var(--ink)]"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', lineHeight: 1.06, letterSpacing: '-0.02em', textWrap: 'balance' }}
            >
              It fits how agencies already work.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink-mute)]" style={{ textWrap: 'pretty' }}>
              You already share a preview link with clients. Put Tack's widget on
              it, and every stakeholder can leave feedback in place — they click,
              type, and you get it with full context. Nothing for them to install,
              no account to create. Every comment and reply stays in one inbox you
              control.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <PrimaryLink href={DEMO_URL}>Try the demo</PrimaryLink>
            </div>
          </div>
        </section>

        {/* ── Open source / self-host ─────────────────────── */}
        <section id="self-host" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <h2
                className="font-semibold text-[var(--ink)]"
                style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)', lineHeight: 1.08, letterSpacing: '-0.02em', textWrap: 'balance' }}
              >
                Self-host the whole thing.
              </h2>
              <p className="mt-5 max-w-md text-[var(--ink-mute)]" style={{ textWrap: 'pretty' }}>
                Tack is AGPL open source. Run it on your own infrastructure with
                Docker and claim the instance with your email — your data stays with
                you. The AI Inbox is optional and uses your own API key.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <GhostLink href={`${GITHUB_URL}#self-host`} external>Read the self-host guide</GhostLink>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[var(--ink-mute)] no-underline transition-colors hover:text-[var(--ink)]"
                >
                  <GitHubGlyph />
                  Star on GitHub
                </a>
              </div>
            </div>
            <div>
              <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--ink)]">
                <div className="flex items-center justify-between border-b border-[color-mix(in_oklab,var(--page)_18%,var(--ink))] px-4 py-2.5">
                  <span className="text-xs text-[color-mix(in_oklab,var(--page)_62%,var(--ink))]">Terminal — from the repo root</span>
                  <button
                    type="button"
                    onClick={copyCommand}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[color-mix(in_oklab,var(--page)_72%,var(--ink))] transition-colors hover:text-[var(--page)]"
                    aria-label="Copy command"
                  >
                    {copied ? <Check size={13} strokeWidth={2.5} aria-hidden="true" /> : <Copy size={13} strokeWidth={2} aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="px-4 py-5" style={{ fontFamily: 'var(--tk-code)' }}>
                  <code className="text-sm text-[var(--page)]">
                    <span className="select-none text-[color-mix(in_oklab,var(--pin)_85%,var(--page))]">$ </span>
                    {command}
                  </code>
                </div>
              </div>
              <p className="mt-3 text-sm text-[var(--ink-mute)]">
                Open the app, claim it with your email, and add the widget to your
                preview site.
              </p>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ─────────────────────────────────── */}
        <section className="border-t border-[var(--line)]">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-24">
            <h2
              className="mx-auto max-w-xl font-semibold text-[var(--ink)]"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', lineHeight: 1.06, letterSpacing: '-0.02em', textWrap: 'balance' }}
            >
              Open the demo and drop a pin.
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <PrimaryLink href={DEMO_URL}>Try the demo</PrimaryLink>
              <GhostLink href={GITHUB_URL} external>
                <GitHubGlyph />
                View on GitHub
              </GhostLink>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <PinMark size={18} />
            <span className="font-semibold text-[var(--ink)]">tack</span>
            <span className="ml-2 text-sm text-[var(--ink-mute)]">Open-source visual feedback for preview sites.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href={DEMO_URL} className="text-sm text-[var(--ink-mute)] no-underline transition-colors hover:text-[var(--ink)]">Demo</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--ink-mute)] no-underline transition-colors hover:text-[var(--ink)]">GitHub</a>
            <a href={SIGNIN_URL} className="text-sm text-[var(--ink-mute)] no-underline transition-colors hover:text-[var(--ink)]">Sign in</a>
            <div className="w-40"><ThemeToggle compact /></div>
          </div>
        </div>
      </footer>
    </div>
  )
}
