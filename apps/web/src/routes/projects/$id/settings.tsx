import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Layout } from '#/components/Layout'
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
            <div>
              <label
                htmlFor="project-name"
                className="block text-[11px] text-[var(--ink-mute)] uppercase font-mono mb-1.5"
              >
                Project name
              </label>
              <input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="preview-url"
                className="block text-[11px] text-[var(--ink-mute)] uppercase font-mono mb-1.5"
              >
                Preview URL
              </label>
              <input
                id="preview-url"
                type="url"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] text-sm font-mono"
              />
            </div>
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
                  className="min-h-11 px-3 text-xs text-[var(--accent)] font-mono bg-transparent border border-[var(--line)] rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
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
                <label
                  htmlFor="pin-query-params"
                  className="block text-[11px] text-[var(--ink-mute)] uppercase font-mono mb-1.5"
                >
                  Pin query params
                </label>
                <input
                  id="pin-query-params"
                  value={pinQueryParams}
                  onChange={(e) => setPinQueryParams(e.target.value)}
                  placeholder="tab, view"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] text-sm font-mono"
                />
                <p className="text-xs text-[var(--ink-mute)] mt-1.5">
                  Comma-separated query keys to keep when matching pin URLs (SPA
                  tabs). Default is pathname-only.
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={saveGeneral}
                disabled={savingGeneral}
                className="min-h-11 px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                {savingGeneral ? 'Saving...' : 'Save'}
              </button>
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
            <div>
              <label
                htmlFor="notify-email"
                className="block text-[11px] text-[var(--ink-mute)] uppercase font-mono mb-1.5"
              >
                Email
              </label>
              <input
                id="notify-email"
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="discord-webhook"
                className="block text-[11px] text-[var(--ink-mute)] uppercase font-mono mb-1.5"
              >
                Discord webhook
              </label>
              <input
                id="discord-webhook"
                type="url"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] text-sm font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="slack-webhook"
                className="block text-[11px] text-[var(--ink-mute)] uppercase font-mono mb-1.5"
              >
                Slack webhook
              </label>
              <input
                id="slack-webhook"
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={saveNotifications}
                disabled={savingNotify}
                className="min-h-11 px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                {savingNotify ? 'Saving...' : 'Save'}
              </button>
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
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={project.name}
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] text-sm mb-4"
            />
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving || confirmName !== project.name}
              className="min-h-11 px-4 py-2 rounded-lg bg-[var(--signal)] text-[var(--bone)] text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {archiving ? 'Archiving...' : 'Archive project'}
            </button>
            {dangerMsg && (
              <p className="text-xs text-[var(--signal)] mt-3" role="alert">
                {dangerMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
