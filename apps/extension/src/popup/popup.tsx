import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import {
  DEFAULT_CONFIG,
  getConfig,
  isEnabledForOrigin,
  originOf,
  setConfig,
  type TackExtensionConfig,
} from '../storage'

function currentTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
      resolve(tabs[0]),
    )
  })
}

function Popup() {
  const [config, setLocalConfig] = useState<TackExtensionConfig>(DEFAULT_CONFIG)
  const [origin, setOrigin] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedKeys, setSavedKeys] = useState(false)

  useEffect(() => {
    void Promise.all([getConfig(), currentTab()]).then(([cfg, tab]) => {
      setLocalConfig(cfg)
      setOrigin(originOf(tab?.url))
      setLoading(false)
    })
  }, [])

  const enabledHere = isEnabledForOrigin(config, origin)
  const hasKey = Boolean(config.projectKey.trim())

  async function saveKeys() {
    const projectKey = config.projectKey.trim()
    const apiHost = config.apiHost.trim().replace(/\/$/, '')
    setLocalConfig((c) => ({ ...c, projectKey, apiHost }))
    await setConfig({ projectKey, apiHost })
    setSavedKeys(true)
    setTimeout(() => setSavedKeys(false), 1600)
  }

  async function toggleSite() {
    if (!origin) return
    const enabledOrigins = enabledHere
      ? config.enabledOrigins.filter((o) => o !== origin)
      : [...config.enabledOrigins, origin]
    setLocalConfig((c) => ({ ...c, enabledOrigins }))
    await setConfig({ enabledOrigins })
  }

  if (loading) {
    return <div class="muted">Loading…</div>
  }

  return (
    <div class="stack">
      <header>
        <span class="dot" />
        <strong>Tack</strong>
      </header>

      <label class="field">
        <span>Project key</span>
        <input
          type="text"
          placeholder="pk_…"
          value={config.projectKey}
          onInput={(e) =>
            setLocalConfig((c) => ({
              ...c,
              projectKey: (e.target as HTMLInputElement).value,
            }))
          }
        />
      </label>

      <label class="field">
        <span>Tack host</span>
        <input
          type="text"
          placeholder="https://tack.example.com"
          value={config.apiHost}
          onInput={(e) =>
            setLocalConfig((c) => ({
              ...c,
              apiHost: (e.target as HTMLInputElement).value,
            }))
          }
        />
      </label>

      <button class="primary" onClick={saveKeys}>
        {savedKeys ? 'Saved' : 'Save project'}
      </button>

      <hr />

      {origin ? (
        <>
          <div class="site">
            <span class="muted">This site</span>
            <code>{origin}</code>
          </div>
          <button
            class={enabledHere ? 'danger' : 'primary'}
            disabled={!hasKey}
            onClick={toggleSite}
          >
            {enabledHere ? 'Disable Tack here' : 'Enable Tack on this site'}
          </button>
          {!hasKey && (
            <p class="muted small">Add a project key first.</p>
          )}
        </>
      ) : (
        <p class="muted small">
          Open a normal http(s) page to enable Tack on it.
        </p>
      )}
    </div>
  )
}

render(<Popup />, document.getElementById('app')!)
