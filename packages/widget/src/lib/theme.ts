export type WidgetThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'tack-theme'

export function resolveWidgetThemePreference(
  script: HTMLScriptElement | null,
): WidgetThemePreference {
  const attr = script?.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark' || attr === 'system') return attr

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    /* cross-origin or private mode */
  }

  return 'system'
}

export function applyWidgetHostTheme(
  host: HTMLElement,
  preference: WidgetThemePreference,
) {
  if (preference === 'system') {
    host.removeAttribute('data-theme')
    return
  }
  host.setAttribute('data-theme', preference)
}

export function watchWidgetTheme(host: HTMLElement, script: HTMLScriptElement | null) {
  const apply = () => applyWidgetHostTheme(host, resolveWidgetThemePreference(script))

  apply()

  const media = window.matchMedia('(prefers-color-scheme: light)')
  media.addEventListener('change', apply)

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) apply()
  })

  return () => {
    media.removeEventListener('change', apply)
  }
}
