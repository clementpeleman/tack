import { Link } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { ThemeToggle } from '#/components/ThemeToggle'
import { Logo } from '#/components/brand/Logo'

interface LayoutProps {
  projectId: string
  projectName: string
  sidebarProjects?: { id: string; name: string }[]
  activeSection?: 'inbox' | 'settings'
  children: ReactNode
}

export function Layout({
  projectId,
  projectName,
  sidebarProjects,
  activeSection = 'inbox',
  children,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)] bg-[var(--surface)]">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]"
          aria-label="Open project navigation"
          aria-expanded={sidebarOpen}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-[var(--ink)] truncate">{projectName}</span>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--page)_55%,transparent)]"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-60 border-r border-[var(--line)] bg-[var(--surface)] p-4 flex flex-col transform transition-transform duration-200 ease-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Project navigation"
      >
        <div className="flex items-center justify-between mb-6 md:mb-6">
          <Link
            to="/projects"
            className="flex items-center gap-2 px-2 no-underline"
            onClick={() => setSidebarOpen(false)}
          >
            <Logo size={18} fontSize={14} />
          </Link>
          <button
            type="button"
            className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-[var(--ink-mute)] hover:text-[var(--ink)] bg-transparent border-none cursor-pointer"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="space-y-0.5 flex-1 overflow-y-auto">
          <span className="block px-3 py-1 text-[11px] text-[var(--ink-mute)] font-mono uppercase">
            Projects
          </span>
          {sidebarProjects ? (
            sidebarProjects.map((p) => (
              <NavItem
                key={p.id}
                to="/projects/$id/inbox"
                params={{ id: p.id }}
                label={p.name}
                active={p.id === projectId}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))
          ) : (
            <NavItem
              to="/projects/$id/inbox"
              params={{ id: projectId }}
              label={projectName}
              active
              onNavigate={() => setSidebarOpen(false)}
            />
          )}
          <div className="pt-2 mt-2 border-t border-[color-mix(in_oklab,var(--ink)_6%,transparent)]">
            <span className="block px-3 py-1 text-[11px] text-[var(--ink-mute)] font-mono uppercase">
              {projectName}
            </span>
            <SubNavItem
              to="/projects/$id/inbox"
              params={{ id: projectId }}
              label="Inbox"
              active={activeSection === 'inbox'}
              onNavigate={() => setSidebarOpen(false)}
            />
            <SubNavItem
              to="/projects/$id/settings"
              params={{ id: projectId }}
              label="Settings"
              active={activeSection === 'settings'}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
          <Link
            to="/projects/new"
            className="flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-xs text-[var(--ink-soft)] hover:text-[var(--ink-mute)] hover:bg-[var(--surface-2)] no-underline transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="text-sm leading-none">+</span>
            New project
          </Link>
        </div>

        <div className="pt-4 border-t border-[var(--line)] space-y-4">
          <ThemeToggle compact />
          <form method="POST" action="/api/auth/logout">
            <button
              type="submit"
              className="w-full text-left min-h-11 px-3 py-2 text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] font-mono bg-transparent border-none cursor-pointer transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
    </div>
  )
}

function SubNavItem({
  to,
  params,
  label,
  active,
  onNavigate,
}: {
  to: string
  params: Record<string, string>
  label: string
  active?: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      to={to}
      params={params}
      onClick={onNavigate}
      className={`flex items-center min-h-11 px-3 py-2 rounded-lg text-xs no-underline transition-colors ${
        active
          ? 'text-[var(--ink)] bg-[var(--surface-2)]'
          : 'text-[var(--ink-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-mute)]'
      }`}
    >
      {label}
    </Link>
  )
}

function NavItem({
  to,
  params,
  label,
  active,
  onNavigate,
}: {
  to: string
  params: Record<string, string>
  label: string
  active?: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      to={to}
      params={params}
      onClick={onNavigate}
      className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm no-underline transition-colors ${
        active
          ? 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--ink)]'
          : 'text-[var(--ink-mute)] hover:bg-[var(--surface-2)]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--pin)]' : 'bg-[var(--ink-soft)]'}`} />
      {label}
    </Link>
  )
}
