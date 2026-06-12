import { useEffect, useState } from 'react'
import {
  applyTheme,
  getEffectiveTheme,
  getStoredTheme,
  getSystemTheme,
  syncWidgetHostTheme,
  type Theme,
} from '#/lib/theme'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = getStoredTheme()
    setTheme(stored)
    setResolved(getEffectiveTheme(stored))
    syncWidgetHostTheme(stored)

    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onSystemChange = () => {
      if (getStoredTheme() === 'system') {
        setResolved(getSystemTheme())
        syncWidgetHostTheme('system')
      }
    }
    media.addEventListener('change', onSystemChange)
    return () => media.removeEventListener('change', onSystemChange)
  }, [])

  const select = (next: Theme) => {
    setTheme(next)
    setResolved(getEffectiveTheme(next))
    applyTheme(next)
  }

  if (compact) {
    return (
      <div className="flex rounded-lg border border-[var(--line)] p-0.5 bg-[var(--surface-2)]">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => select(option.value)}
            aria-pressed={theme === option.value}
            className={`flex-1 min-h-11 px-2 rounded-md text-[11px] font-mono uppercase border-none cursor-pointer transition-colors sm:min-h-9 ${
              theme === option.value
                ? 'bg-[var(--surface)] text-[var(--ink)]'
                : 'bg-transparent text-[var(--ink-soft)] hover:text-[var(--ink-mute)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
      <p className="text-[11px] text-[var(--ink-soft)] font-mono uppercase mb-2">
        Theme · {resolved}
      </p>
      <ThemeToggle compact />
    </div>
  )
}
