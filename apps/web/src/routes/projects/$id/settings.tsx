import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Layout } from '#/components/Layout'
import { Field } from '#/components/ui/Field'
import { Button } from '#/components/ui/Button'
import type { ProjectNotifySettings } from '#/lib/notifications'
import {
  archiveProject,
  getProject,
  getProjects,
  updateProjectDetails,
  updateProjectSettings,
} from '#/lib/projects'

type SettingsTab = 'general' | 'notifications' | 'danger'

export const Route = createFileRoute('/projects/$id/settings')({
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => ({
    tab:
      search.tab === 'notifications' || search.tab === 'danger'
        ? search.tab
        : undefined,
  }),
  loader: async ({ params }) => {
    const [project, sidebarProjects] = await Promise.all([
      getProject({ data: { id: params.id } }),
      getProjects(),
    ])
    return {
      project,
      sidebarProjects: sidebarProjects.map((p) => ({ id: p.id, name: p.name })),
      settings: (project.settings ?? {}) as ProjectNotifySettings,
    }
  },
})

function SettingsPage() {
  const { project, sidebarProjects, settings } = Route.useLoaderData()
  const { tab: searchTab } = Route.useSearch()
  const router = useRouter()
  const tab: SettingsTab = searchTab ?? 'general'

  const [name, setName] = useState(project.name)
  const [previewUrl, setPreviewUrl] = useState(project.previewUrl)
  const [pinQueryParams, setPinQueryParams] = useState(
    settings.pinQueryParams?.join(', ') ?? '',
  )
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generalMsg, setGeneralMsg] = useState('')
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail ?? '')
  const [discordWebhook, setDiscordWebhook] = useState(
    settings.discordWebhook ?? '',
  )
  const [slackWebhook, setSlackWebhook] = useState(settings.slackWebhook ?? '')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [savingNotify, setSavingNotify] = useState(false)

  const [confirmName, setConfirmName] = useState('')
  const [archiving, setArchiving] = useState(false)
  const [dangerMsg, setDangerMsg] = useState('')

  const copyKey = () => {
    navigator.clipboard.writeText(project.projectKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  const saveGeneral = async () => {
    setSavingGeneral(true)
    setGeneralMsg('')
    try {
      await updateProjectDetails({
        data: {
          projectId: project.id,
          name: name.trim(),
          previewUrl: previewUrl.trim(),
        },
      })

      const queryKeys = pinQueryParams
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)

      await updateProjectSettings({
        data: {
          projectId: project.id,
          settings: {
            ...settings,
            pinQueryParams: queryKeys.length > 0 ? queryKeys : undefined,
          },
        },
      })

      setGeneralMsg('Saved')
      await router.invalidate()
    } catch (err) {
      setGeneralMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingGeneral(false)
    }
  }

  const saveNotifications = async () => {
    setSavingNotify(true)
    setNotifyMsg('')
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
      setNotifyMsg('Saved')
      await router.invalidate()
    } catch (err) {
      setNotifyMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingNotify(false)
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    setDangerMsg('')
    try {
      await archiveProject({
        data: { projectId: project.id, confirmName },
      })
      await router.navigate({ to: '/projects' })
    } catch (err) {
      setDangerMsg(err instanceof Error ? err.message : 'Archive failed')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <Layout
      projectId={project.id}
      projectName={project.name}
      sidebarProjects={sidebarProjects}
      activeSection="settings"
    >
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold text-[var(--ink)] mb-6">
          Settings
        </h1>

        <div className="flex items-center gap-1 mb-6 border-b border-[var(--line)]">
          {(
            [
              ['general', 'General'],
              ['notifications', 'Notifications'],
              ['danger', 'Danger'],
            ] as const
          ).map(([id, label]) => (
            <Link
              key={id}
              to="/projects/$id/settings"
              params={{ id: project.id }}
              search={id === 'general' ? {} : { tab: id }}
              className={`min-h-11 px-3 text-xs font-mono uppercase no-underline border-b-2 -mb-px transition-colors ${
                tab === id
                  ? 'border-[var(--accent)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink-mute)]'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {tab === 'general' && (
          <div className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <Field
              label="Project name"
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Field
              label="Preview URL"
              id="preview-url"
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="font-mono"
            />
            <div>
              <span className="block text-[11px] text-[var(--ink-mute)] uppercase font-mono mb-1.5">
                Project key
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-[var(--ink-soft)] bg-[var(--surface-2)] px-3 py-2 rounded font-mono overflow-x-auto">
                  {project.projectKey}
                </code>
                <button
                  type="button"
                  onClick={copyKey}
                  className="min-h-11 px-3 text-xs text-[var(--accent)] font-mono bg-transparent border border-[var(--line)] rounded-full cursor-pointer hover:bg-[var(--surface-2)]"
                >
                  {keyCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--ink-mute)]">
              Install the widget from the{' '}
              <Link
                to="/projects/$id/install"
                params={{ id: project.id }}
                search={{ onboarding: false }}
                className="text-[var(--accent)]"
              >
                install page
              </Link>
              .
            </p>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs text-[var(--ink-soft)] font-mono bg-transparent border-none cursor-pointer hover:text-[var(--ink)]"
            >
              {showAdvanced ? 'Hide' : 'Show'} advanced URL matching
            </button>
            {showAdvanced && (
              <div>
                <Field
                  label="Pin query params"
                  id="pin-query-params"
                  value={pinQueryParams}
                  onChange={(e) => setPinQueryParams(e.target.value)}
                  placeholder="tab, view"
                  className="font-mono"
                />
                <p className="text-xs text-[var(--ink-mute)] mt-1.5">
                  Comma-separated query keys to keep when matching pin URLs (SPA
                  tabs). Default is pathname-only.
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <Button size="sm" onClick={saveGeneral} disabled={savingGeneral}>
                {savingGeneral ? 'Saving...' : 'Save'}
              </Button>
              {generalMsg && (
                <span className="text-xs text-[var(--ink-mute)]" role="status">
                  {generalMsg}
                </span>
              )}
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <Field
              label="Email"
              id="notify-email"
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="owner@example.com"
            />
            <Field
              label="Discord webhook"
              id="discord-webhook"
              type="url"
              value={discordWebhook}
              onChange={(e) => setDiscordWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="font-mono"
            />
            <Field
              label="Slack webhook"
              id="slack-webhook"
              type="url"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="font-mono"
            />
            <div className="flex items-center gap-3 pt-2">
              <Button size="sm" onClick={saveNotifications} disabled={savingNotify}>
                {savingNotify ? 'Saving...' : 'Save'}
              </Button>
              {notifyMsg && (
                <span className="text-xs text-[var(--ink-mute)]" role="status">
                  {notifyMsg}
                </span>
              )}
            </div>
          </div>
        )}

        {tab === 'danger' && (
          <div className="rounded-lg border border-[color-mix(in_oklab,var(--signal)_35%,var(--line))] bg-[var(--surface)] p-4">
            <p className="text-sm font-medium text-[var(--ink)] mb-1">
              Archive project
            </p>
            <p className="text-xs text-[var(--ink-mute)] mb-4">
              Pins and settings are kept but the project is hidden from your list.
              Type <strong>{project.name}</strong> to confirm.
            </p>
            <Field
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={project.name}
              className="mb-4"
            />
            <Button
              size="sm"
              variant="danger"
              onClick={handleArchive}
              disabled={archiving || confirmName !== project.name}
            >
              {archiving ? 'Archiving...' : 'Archive project'}
            </Button>
            {dangerMsg && (
              <p className="text-xs text-[var(--danger)] mt-3" role="alert">
                {dangerMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
