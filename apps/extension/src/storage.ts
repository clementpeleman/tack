/** Config persisted in `chrome.storage.sync`, shared by popup + content script. */
export interface TackExtensionConfig {
  /** Public project key (`pk_…`) from the Tack dashboard. */
  projectKey: string
  /** Tack host origin, e.g. `https://tack.example.com`. */
  apiHost: string
  /** Origins (scheme + host + port) the widget is enabled on. */
  enabledOrigins: string[]
}

export const DEFAULT_CONFIG: TackExtensionConfig = {
  projectKey: '',
  apiHost: '',
  enabledOrigins: [],
}

export function getConfig(): Promise<TackExtensionConfig> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_CONFIG, (items) =>
      resolve(items as TackExtensionConfig),
    )
  })
}

export function setConfig(patch: Partial<TackExtensionConfig>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set(patch, () => resolve())
  })
}

/** Normalize a URL to an origin we can match against, or null if unsupported. */
export function originOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.origin : null
  } catch {
    return null
  }
}

export function isEnabledForOrigin(
  config: TackExtensionConfig,
  origin: string | null,
): boolean {
  return Boolean(config.projectKey) && origin !== null &&
    config.enabledOrigins.includes(origin)
}
