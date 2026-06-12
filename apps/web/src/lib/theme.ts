export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'tack-theme'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const value = localStorage.getItem(STORAGE_KEY)
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'light'
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function getEffectiveTheme(theme: Theme = getStoredTheme()): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme()
  return theme
}

export function syncWidgetHostTheme(theme: Theme) {
  const host = document.getElementById('tack-widget-host')
  if (!host) return
  if (theme === 'system') {
    host.removeAttribute('data-theme')
  } else {
    host.setAttribute('data-theme', theme)
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }
  localStorage.setItem(STORAGE_KEY, theme)
  syncWidgetHostTheme(theme)
}

export const themeBootScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'light';if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`
