import { mountTackWidget, unmountTackWidget } from '@tack/widget'
import { getConfig, isEnabledForOrigin, originOf } from './storage'

// Runs in the content script's isolated world. The page's CSP does not apply
// to it, so the widget loads even on sites where the `<script>` snippet and a
// `javascript:` bookmarklet would both be blocked.

async function reconcile() {
  const config = await getConfig()
  const origin = originOf(window.location.href)
  const enabled = isEnabledForOrigin(config, origin)
  const mounted = Boolean(document.getElementById('tack-widget-host'))

  if (enabled && !mounted) {
    mountTackWidget({
      projectKey: config.projectKey,
      apiHost: config.apiHost || window.location.origin,
    })
  } else if (!enabled && mounted) {
    unmountTackWidget()
  }
}

// React to the popup enabling/disabling this site or changing keys, without a
// page reload.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return
  if ('enabledOrigins' in changes || 'projectKey' in changes || 'apiHost' in changes) {
    void reconcile()
  }
})

void reconcile()
