import { mountTackWidget } from './index'

// Capture the loading <script> now: `document.currentScript` is only valid
// during initial synchronous execution, not later inside a DOMContentLoaded
// handler.
const currentScript = document.currentScript as HTMLScriptElement | null

function init() {
  const projectKey = currentScript?.getAttribute('data-project') ?? ''
  const apiHost =
    currentScript?.getAttribute('data-api') ?? window.location.origin

  if (!projectKey) {
    console.error('[tack] data-project attribute required on the script tag')
    return
  }

  mountTackWidget({ projectKey, apiHost, themeScript: currentScript })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
