# Tack browser extension

A no-code way to load the Tack widget on a preview site. The extension injects
the **same** widget as the `<script>` snippet, but from a content script — so it
works on sites where you can't edit the HTML, and on sites whose
Content-Security-Policy would block both the `<script>` snippet and a
`javascript:` bookmarklet (the page CSP does not apply to extension content
scripts in Chromium).

| | `<script>` snippet | Bookmarklet | **This extension** |
|---|---|---|---|
| No code / no deploy | ❌ | ✅ | ✅ |
| Survives restrictive CSP | ❌ | ❌ | ✅ (Chromium) |
| Persists across navigation | ✅ | ❌ | ✅ |
| Works on auth-gated staging | ✅ | ✅ | ✅ |

## Build

The extension bundles `@tack/widget`, so build the widget first (Turbo's
`^build` does this automatically):

```bash
pnpm --filter @tack/widget build
pnpm --filter @tack/extension build
```

Output lands in `apps/extension/dist/` (`manifest.json`, `content.js`,
`popup.html`, `popup.js`).

## Load it (Chrome / Edge)

1. Go to `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `apps/extension/dist`.
3. Click the Tack toolbar icon:
   - Paste your **project key** (`pk_…`) and **Tack host**
     (e.g. `https://tack.example.com`), then **Save project**.
   - Open the preview site and click **Enable Tack on this site**.

The widget mounts immediately (no reload) and on every later visit to that
origin. Disable it per-site from the same popup.

## How it works

- `src/content.ts` runs at `document_idle`, reads config from
  `chrome.storage.sync`, and calls `mountTackWidget()` from `@tack/widget` when
  the current origin is enabled. It reacts to storage changes so the popup can
  toggle a site without a reload.
- The widget's API calls (`/api/widget/*`) are plain cross-origin `fetch` /
  `EventSource` requests; the Tack server already serves these to the
  cross-origin script-tag widget, so CORS is satisfied without extra host
  permissions.

## Notes / hardening backlog

- **Permissions:** the content script currently matches `http://*/*` +
  `https://*/*`, which triggers a broad host-permission prompt at install.
  A privacy-tighter approach is `optional_host_permissions` +
  `chrome.scripting.registerContentScripts`, requesting access per origin when
  the user enables a site. Worth doing before any public store listing.
- **Icons:** no `action.default_icon` is set yet — the browser shows a generic
  icon. Add 16/32/48/128px PNGs and reference them in `manifest.json`.
- **Firefox/Safari:** content scripts there apply the page CSP more strictly,
  so the CSP-bypass advantage is Chromium-specific. The extension still loads;
  the widget UI lives in a Shadow DOM created by the content script.
