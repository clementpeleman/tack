import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { Layout } from '#/components/Layout'
import { Field } from '#/components/ui/field'
import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { ConfirmDialog } from '#/components/ui/confirm-dialog'
import type { ProjectNotifySettings } from '#/lib/notifications'
import {
  archiveProject,
  getAiStatus,
  getProject,
  getProjects,
  updateProjectDetails,
  updateProjectSettings,
} from '#/lib/projects'
import { getCurrentUser } from '#/lib/user'

type SettingsTab = 'general' | 'notifications' | 'ai' | 'danger'

export const Route = createFileRoute('/projects/$id/settings')({
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => ({
    tab:
      search.tab === 'notifications' || search.tab === 'danger' || search.tab === 'ai'
        ? search.tab
        : undefined,
  }),
  loader: async ({ params }) => {
    const [project, sidebarProjects, user, ai] = await Promise.all([
      getProject({ data: { id: params.id } }),
      getProjects(),
      getCurrentUser(),
      getAiStatus(),
    ])
    return {
      project,
      ai,
      userEmail: user.email,
      sidebarProjects: sidebarProjects.map((p) => ({ id: p.id, name: p.name })),
      settings: (project.settings ?? {}) as ProjectNotifySettings,
    }
  },
})

/** Route a server-side validation message to the field it is about. */
function fieldFor(message: string): 'email' | 'discord' | 'slack' | null {
  const m = message.toLowerCase()
  if (m.includes('discord')) return 'discord'
  if (m.includes('slack')) return 'slack'
  if (m.includes('email')) return 'email'
  return null
}

function SettingsPage() {
  const { project, sidebarProjects, settings, userEmail, ai } = Route.useLoaderData()
  const { tab: searchTab } = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate()
  const tab: SettingsTab = searchTab ?? 'general'

  const [name, setName] = useState(project.name)
  const [previewUrl, setPreviewUrl] = useState(project.previewUrl)
  const [pinQueryParams, setPinQueryParams] = useState(settings.pinQueryParams?.join(', ') ?? '')
  const [showAdvanced, setShowAdvanced] = useState(Boolean(settings.pinQueryParams?.length))
  const [general, setGeneral] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail ?? '')
  const [discordWebhook, setDiscordWebhook] = useState(settings.discordWebhook ?? '')
  const [slackWebhook, setSlackWebhook] = useState(settings.slackWebhook ?? '')
  const [notifyError, setNotifyError] = useState<{ field: string | null; text: string } | null>(null)
  const [notifySaved, setNotifySaved] = useState(false)
  const [savingNotify, setSavingNotify] = useState(false)

  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [archiving, setArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState('')

  const copyKey = () => {
    void navigator.clipboard?.writeText(project.projectKey).catch(() => {})
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  const saveGeneral = async () => {
    setSavingGeneral(true)
    setGeneral(null)
    try {
      await updateProjectDetails({
        data: { projectId: project.id, name: name.trim(), previewUrl: previewUrl.trim() },
      })
      const keys = pinQueryParams.split(',').map((k) => k.trim()).filter(Boolean)
      await updateProjectSettings({
        data: { projectId: project.id, settings: { ...settings, pinQueryParams: keys.length ? keys : undefined } },
      })
      setGeneral({ tone: 'ok', text: 'Saved' })
      await router.invalidate()
    } catch (err) {
      setGeneral({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save' })
    } finally {
      setSavingGeneral(false)
    }
  }

  const saveNotifications = async () => {
    setSavingNotify(true)
    setNotifyError(null)
    setNotifySaved(false)
    try {
      await updateProjectSettings({
        data: {
          projectId: project.id,
          settings: {
            ...settings,
            notifyEmail: notifyEmail.trim() || undefined,
            discordWebhook: discordWebhook.trim() || undefined,
            slackWebhook: slackWebhook.trim() || undefined,
          },
        },
      })
      setNotifySaved(true)
      await router.invalidate()
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Could not save'
      setNotifyError({ field: fieldFor(text), text })
    } finally {
      setSavingNotify(false)
    }
  }

  const archive = async () => {
    setArchiving(true)
    setArchiveError('')
    try {
      await archiveProject({ data: { projectId: project.id, confirmName } })
      await router.navigate({ to: '/projects' })
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Could not archive')
      setArchiving(false)
    }
  }

  const tabs: { value: SettingsTab; label: string }[] = [
    { value: 'general', label: 'General' },
    { value: 'notifications', label: 'Notifications' },
    { value: 'ai', label: 'AI' },
    { value: 'danger', label: 'Danger' },
  ]

  return (
    <Layout
      projectId={project.id}
      projectName={project.name}
      sidebarProjects={sidebarProjects}
      activeSection="settings"
      userEmail={userEmail}
    >
      <div className="max-w-2xl">
        <h1 className="text-page-title mb-5">Settings</h1>

        <div className="mb-6">
          <Tabs
            value={tab}
            onValueChange={(next) =>
              void navigate({
                to: '/projects/$id/settings',
                params: { id: project.id },
                search: next === 'general' ? {} : { tab: next as SettingsTab },
                replace: true,
              })
            }
          >
            <TabsList variant="line" aria-label="Settings sections" className="w-full justify-start border-b border-border">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="flex-none px-3 font-mono text-[11px] uppercase tracking-wide">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {tab === 'general' && (
          <Section>
            <Field label="Project name" id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <Field
                label="Preview URL"
                id="preview-url"
                type="url"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="https://preview.acme.com"
                className="font-mono"
              />
              <Hint>
                Where reviewers see the site. A wildcard like <span className="font-mono">https://*.vercel.app</span> covers
                branch previews. Dev servers and staging hosts go under Allowed origins on the{' '}
                <Link to="/projects/$id/connect" params={{ id: project.id }} search={{ onboarding: false }} className="text-[var(--accent)]">
                  Connect page
                </Link>
                .
              </Hint>
            </div>
            <div>
              <span className="mb-1.5 block font-mono text-[11px] uppercase text-[var(--ink-mute)]">Project key</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-[10px] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--ink-mute)]">
                  {project.projectKey}
                </code>
                <Button size="sm" variant="outline" onClick={copyKey}>
                  {keyCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Hint>Public by design; it identifies the project in the widget. Access is decided by origin, not by this key.</Hint>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
                className="font-mono text-[11px] text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                {showAdvanced ? '▾' : '▸'} URL matching
              </button>
              {showAdvanced && (
                <div className="mt-3">
                  <Field
                    label="Pin query params"
                    id="pin-query-params"
                    value={pinQueryParams}
                    onChange={(e) => setPinQueryParams(e.target.value)}
                    placeholder="tab, view"
                    className="font-mono"
                  />
                  <Hint>Comma-separated query keys that make a page distinct (single-page apps). Default is path only.</Hint>
                </div>
              )}
            </div>
            <Actions>
              <Button size="sm" onClick={saveGeneral} disabled={savingGeneral}>
                {savingGeneral ? 'Saving…' : 'Save'}
              </Button>
              {general && <Msg tone={general.tone}>{general.text}</Msg>}
            </Actions>
          </Section>
        )}

        {tab === 'notifications' && (
          <Section>
            <p className="text-sm leading-relaxed text-[var(--ink-mute)]">
              One message per burst of activity, at most once a minute per project. Leave a field empty to switch that channel off; with nothing set, the owner's email is used.
            </p>
            <div>
              <Field
                label="Email"
                id="notify-email"
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder={userEmail ?? 'owner@example.com'}
                error={notifyError?.field === 'email' ? notifyError.text : null}
              />
            </div>
            <div>
              <Field
                label="Discord webhook"
                id="discord-webhook"
                type="url"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                placeholder="https://discord.com/api/webhooks/…"
                className="font-mono"
                error={notifyError?.field === 'discord' ? notifyError.text : null}
              />
            </div>
            <div>
              <Field
                label="Slack webhook"
                id="slack-webhook"
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/…"
                className="font-mono"
                error={notifyError?.field === 'slack' ? notifyError.text : null}
              />
            </div>
            <Actions>
              <Button size="sm" onClick={saveNotifications} disabled={savingNotify}>
                {savingNotify ? 'Saving…' : 'Save'}
              </Button>
              {notifySaved && <Msg tone="ok">Saved</Msg>}
              {notifyError && !notifyError.field && <Msg tone="error">{notifyError.text}</Msg>}
            </Actions>
          </Section>
        )}

        {tab === 'ai' && (
          <Section>
            {ai.entitled ? (
              <>
                <p className="text-sm text-[var(--ink)]">
                  <span className="text-[var(--signal)]">On.</span> Analysis is manual: press Analyze in the inbox and Tack groups related pins, labels them and writes an implementation brief per group. It never changes code.
                </p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="font-mono text-[11px] uppercase text-[var(--ink-mute)]">Cap per run</dt>
                  <dd className="m-0 text-[var(--ink)]">{(ai.jobCapCents / 100).toFixed(2)} USD</dd>
                  <dt className="font-mono text-[11px] uppercase text-[var(--ink-mute)]">Cap per month</dt>
                  <dd className="m-0 text-[var(--ink)]">{(ai.monthlyCapCents / 100).toFixed(2)} USD</dd>
                </dl>
                {!ai.hosted && <Hint>Caps come from TACK_AI_JOB_CAP_CENTS and TACK_AI_MONTHLY_CAP_CENTS on the server.</Hint>}
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--ink)]">
                  <span className="text-[var(--ink-mute)]">Off on this instance.</span>{' '}
                  {ai.hosted
                    ? 'AI analysis is not available on your plan yet.'
                    : 'The inbox works without it; turn it on when you want grouping and implementation briefs.'}
                </p>
                {!ai.hosted && (
                  <Hint>
                    On the server, set <span className="font-mono">TACK_AI_ENABLED=true</span> and{' '}
                    <span className="font-mono">OPENAI_API_KEY</span>, then restart. Runs are manual and cost-capped; you only pay for runs you start.
                  </Hint>
                )}
              </>
            )}
          </Section>
        )}

        {tab === 'danger' && (
          <Section>
            <div>
              <h2 className="text-section">Archive this project</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ink-mute)]">
                Pins and settings are kept; the project disappears from your list and its widget stops loading. There is no self-service undo.
              </p>
            </div>
            <Actions>
              <Button size="sm" variant="destructive" onClick={() => setConfirmArchive(true)}>
                Archive project
              </Button>
            </Actions>
            <ConfirmDialog
              open={confirmArchive}
              onOpenChange={(open) => {
                setConfirmArchive(open)
                if (!open) {
                  setConfirmName('')
                  setArchiveError('')
                }
              }}
              title={`Archive ${project.name}?`}
              description="Type the project name to confirm."
              confirmLabel={archiving ? 'Archiving…' : 'Archive'}
              tone="danger"
              busy={archiving || confirmName !== project.name}
              onConfirm={archive}
            >
              <Field value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={project.name} autoFocus />
              {archiveError && <Msg tone="error">{archiveError}</Msg>}
            </ConfirmDialog>
          </Section>
        )}
      </div>
    </Layout>
  )
}

function Section({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">{children}</div>
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-mute)]">{children}</p>
}

function Msg({ tone, children }: { tone: 'ok' | 'error'; children: ReactNode }) {
  return (
    <span
      className={`text-xs ${tone === 'error' ? 'text-[var(--danger)]' : 'text-[var(--ink-mute)]'}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </span>
  )
}
