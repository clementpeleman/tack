import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Menu, MenuItem, MenuLabel, MenuRadioGroup, MenuSeparator } from '#/components/ui/Menu'
import { applyTheme, getStoredTheme, type Theme } from '#/lib/theme'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

/**
 * Account menu: who is signed in, theme, sign out. Replaces the standalone
 * theme toggle that used to take the most prominent spot in the sidebar.
 */
export function AccountMenu({
  email,
  align = 'start',
  side = 'top',
}: {
  email: string | null
  align?: 'start' | 'end'
  side?: 'top' | 'bottom'
}) {
  const [theme, setTheme] = useState<Theme>('light')
  const logoutForm = useRef<HTMLFormElement>(null)

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  const label = email ?? 'Account'

  return (
    <>
      <Menu
        align={align}
        side={side}
        ariaLabel="Account menu"
        triggerClassName="group flex w-full min-h-10 items-center gap-2 rounded-lg px-3 text-left text-xs text-[var(--ink-mute)] outline-none transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] data-[state=open]:bg-[var(--surface-2)] data-[state=open]:text-[var(--ink)]"
        trigger={
          <>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] font-mono text-[11px] uppercase text-[var(--accent)]">
              {label.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono">{label}</span>
            <ChevronDown size={13} strokeWidth={2} className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
          </>
        }
      >
        <MenuLabel>Theme</MenuLabel>
        <MenuRadioGroup
          value={theme}
          options={THEMES}
          onChange={(next) => {
            setTheme(next)
            applyTheme(next)
          }}
        />
        <MenuSeparator />
        <MenuItem onSelect={() => logoutForm.current?.requestSubmit()}>Sign out</MenuItem>
      </Menu>
      <form ref={logoutForm} method="POST" action="/api/auth/logout" hidden aria-hidden="true">
        <button type="submit" tabIndex={-1}>Sign out</button>
      </form>
    </>
  )
}
