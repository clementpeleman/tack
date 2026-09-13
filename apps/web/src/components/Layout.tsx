import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ChevronsUpDown, Inbox, Link2, Plus, Settings } from 'lucide-react'
import { Logo } from '#/components/brand/Logo'
import { AccountMenu } from '#/components/AccountMenu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'

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
 * The app shell on shadcn's Sidebar: one project at a time, a switcher at
 * the top, three sections, the account at the bottom. On small screens the
 * sidebar becomes a sheet behind the trigger in the top bar.
 */
export function Layout({
  projectId,
  projectName,
  sidebarProjects,
  activeSection = 'inbox',
  userEmail = null,
  children,
}: LayoutProps) {
  const projects = sidebarProjects ?? [{ id: projectId, name: projectName }]

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
        <SidebarHeader className="gap-3 p-3">
          <Link to="/projects" className="flex items-center px-2 pt-1 no-underline" aria-label="All projects">
            <Logo size={18} fontSize={14} />
          </Link>
          <ProjectSwitcher projectId={projectId} projectName={projectName} projects={projects} />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ section, label, to, icon: Icon }) => {
                  const active = section === activeSection
                  return (
                    <SidebarMenuItem key={section}>
                      <SidebarMenuButton asChild isActive={active} className="min-h-10 data-[active=true]:bg-primary/10 data-[active=true]:font-medium">
                        <Link
                          to={to}
                          params={{ id: projectId }}
                          search={section === 'connect' ? { onboarding: false } : undefined}
                          aria-current={active ? 'page' : undefined}
                        >
                          <Icon className={active ? 'text-primary' : 'text-ink-soft'} aria-hidden="true" />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2">
          <AccountMenu email={userEmail} />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 md:hidden">
          <SidebarTrigger aria-label="Open navigation" />
          <span className="truncate text-sm font-semibold">{projectName}</span>
        </div>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function ProjectSwitcher({
  projectId,
  projectName,
  projects,
}: {
  projectId: string
  projectName: string
  projects: { id: string; name: string }[]
}) {
  const navigate = useNavigate()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label="Switch project"
        className="flex w-full min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-left outline-none transition-colors hover:border-ink-soft focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{projectName}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-ink-soft" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
        <DropdownMenuLabel className="font-mono text-[11px] uppercase text-muted-foreground">Projects</DropdownMenuLabel>
        {projects.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={() => {
              if (p.id !== projectId) void navigate({ to: '/projects/$id/inbox', params: { id: p.id } })
            }}
          >
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            {p.id === projectId && <span className="font-mono text-[11px] text-ink-soft">current</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: '/projects/new', search: { onboarding: false } })}>
          <Plus aria-hidden="true" />
          New project
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/projects' })}>All projects</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
