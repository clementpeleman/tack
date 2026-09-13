import { useEffect, useRef, useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { applyTheme, getStoredTheme, type Theme } from '#/lib/theme'
import { cn } from '#/lib/utils'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

/**
 * Who is signed in, theme, sign out. Rendered inside the sidebar footer and
 * on the projects page header; `compact` drops the chevron-and-fill look.
 */
export function AccountMenu({
  email,
  align = 'start',
  side = 'top',
  className,
}: {
  email: string | null
  align?: 'start' | 'end'
  side?: 'top' | 'bottom'
  className?: string
}) {
  const [theme, setTheme] = useState<Theme>('light')
  const logoutForm = useRef<HTMLFormElement>(null)

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  const label = email ?? 'Account'

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className={cn(
            'flex w-full min-h-10 items-center gap-2 rounded-lg px-2 text-left text-xs text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-sidebar-accent data-[state=open]:text-foreground',
            className,
          )}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] uppercase text-primary">
            {label.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono">{label}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-ink-soft" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} side={side} sideOffset={6} className="w-56">
          <DropdownMenuLabel className="font-mono text-[11px] uppercase text-muted-foreground">Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(next) => {
              setTheme(next as Theme)
              applyTheme(next as Theme)
            }}
          >
            {THEMES.map((t) => (
              <DropdownMenuRadioItem key={t.value} value={t.value}>
                {t.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logoutForm.current?.requestSubmit()}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form ref={logoutForm} method="POST" action="/api/auth/logout" hidden aria-hidden="true">
        <button type="submit" tabIndex={-1}>Sign out</button>
      </form>
    </>
  )
}
