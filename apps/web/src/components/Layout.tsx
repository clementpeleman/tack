import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { ChevronsUpDown, Inbox, Link2, Settings } from 'lucide-react'
import { Logo } from '#/components/brand/Logo'
import { AccountMenu } from '#/components/AccountMenu'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '#/components/ui/Menu'

export type ShellSection = 'inbox' | 'connect' | 'settings'

interface LayoutProps {
  projectId: string
  projectName: string
  sidebarProjects?: { id: string; name: string }[]
  activeSection?: ShellSection
  userEmail?: string | null
  children: ReactNode
}

const NAV: { section: ShellSection; label: string; to: string; icon: typeof Inbox }[] = [
  { section: 'inbox', label: 'Inbox', to: '/projects/$id/inbox', icon: Inbox },
  { section: 'connect', label: 'Connect', to: '/projects/$id/connect', icon: Link2 },
  { section: 'settings', label: 'Settings', to: '/projects/$id/settings', icon: Settings },
]

/**
 * The app shell: one project at a time. A switcher at the top of the
 * sidebar, three sections underneath, the account at the bottom. Replaces
 * the two stacked lists (all projects + this project's subnav) and the
 * standalone theme toggle.
 */
export function Layout({
  projectId,
  projectName,
  sidebarProjects,
  activeSection = 'inbox',
  userEmail = null,
  children,
}: LayoutProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page)] md:flex-row">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]"
          aria-label="Open navigation"
          aria-expanded={open}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <span className="truncate text-sm font-semibold text-[var(--ink)]">{projectName}</span>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--ink)_35%,transparent)] md:hidden"
          aria-label="Close navigation"
          onClick={close}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 transform flex-col border-r border-[var(--line)] bg-[var(--surface)] p-3 transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Project navigation"
      >
        <div className="mb-4 flex items-center justify-between px-2 pt-1">
          <Link to="/projects" className="no-underline" onClick={close} aria-label="All projects">
            <Logo size={18} fontSize={14} />
          </Link>
          <button
            type="button"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[var(--ink-mute)] hover:text-[var(--ink)] md:hidden"
            aria-label="Close navigation"
            onClick={close}
          >
            ×
          </button>
        </div>

        <ProjectSwitcher
          projectId={projectId}
          projectName={projectName}
          projects={sidebarProjects ?? [{ id: projectId, name: projectName }]}
          onNavigate={close}
        />

        <nav className="mt-4 flex-1 space-y-0.5" aria-label="Project sections">
          {NAV.map(({ section, label, to, icon: Icon }) => {
            const active = section === activeSection
            return (
              <Link
                key={section}
                to={to}
                params={{ id: projectId }}
                search={section === 'connect' ? { onboarding: false } : undefined}
                onClick={close}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  active
                    ? 'bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] font-medium text-[var(--ink)]'
                    : 'text-[var(--ink-mute)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
                }`}
              >
                <Icon size={15} strokeWidth={1.8} aria-hidden="true" className={active ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]'} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[var(--line)] pt-3">
          <AccountMenu email={userEmail} />
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}

function ProjectSwitcher({
  projectId,
  projectName,
  projects,
  onNavigate,
}: {
  projectId: string
  projectName: string
  projects: { id: string; name: string }[]
  onNavigate: () => void
}) {
  const navigate = useNavigate()
  return (
    <Menu
      ariaLabel="Switch project"
      triggerClassName="flex w-full min-h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--page)] px-3 text-left outline-none transition-colors hover:border-[var(--ink-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] data-[state=open]:border-[var(--accent)]"
      trigger={
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)]">{projectName}</span>
          <ChevronsUpDown size={14} strokeWidth={1.8} className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
        </>
      }
    >
      <MenuLabel>Projects</MenuLabel>
      {projects.map((p) => (
        <MenuItem
          key={p.id}
          hint={p.id === projectId ? 'current' : undefined}
          onSelect={() => {
            onNavigate()
            if (p.id !== projectId) {
              void navigate({ to: '/projects/$id/inbox', params: { id: p.id } })
            }
          }}
        >
          {p.name}
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem
        onSelect={() => {
          onNavigate()
          void navigate({ to: '/projects/new', search: { onboarding: false } })
        }}
      >
        New project
      </MenuItem>
      <MenuItem onSelect={() => { onNavigate(); void navigate({ to: '/projects' }) }}>
        All projects
      </MenuItem>
    </Menu>
  )
}
