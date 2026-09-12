---
date: 2026-09-12
topic: share-links
status: phase 1 built, phase 2 planned
---

# Share links: `tack share`

Reviewers open one link and see the preview with the widget already on it. The site itself is untouched: Tack proxies it on the share domain and injects the script tag on the way through. This is what makes Tack usable for previews an agency cannot edit, for hosts whose Content-Security-Policy blocks a script tag, and, once phase 2 lands, for a dev server on a laptop.

## Phase 1 (built): proxy-injection for a reachable preview

- **Data**: `shares` table (slug, target URL, optional passcode hash, expiry, revocation, last access). Slug carries ~70 bits of randomness and is the only secret; the project key stays public.
- **Domain**: `TACK_SHARE_DOMAIN` (e.g. `share.example.com`) with wildcard DNS and TLS. A different host than the dashboard on purpose, so a proxied site can never read dashboard cookies. Dev: `share.localhost` with `TACK_SHARE_PORT=3000` (see `.claude/launch.json` → `web-share`).
- **Proxy**: `apps/web/share-proxy.mjs`, used by `server.mjs` in production and as a Vite middleware in dev. Strips CSP/X-Frame-Options headers and `<meta http-equiv="Content-Security-Policy">`, rewrites `Location` and absolute links from the target origin to the share origin, drops `Domain=` on cookies, injects the widget before `</body>` unless the page already loads it, and never caches or indexes.
- **Passcode**: optional; cookie carries the per-slug hash so it is useless on another share.
- **Origin gate**: a live share's origin counts as an allowed origin for its project (`isOriginAllowed` in `widget-connection.ts`). The stored allowlist is not widened.
- **SSRF**: targets must resolve to public addresses (`lib/net.ts` at creation, again in the proxy with a 60 s DNS cache). `TACK_SHARE_ALLOW_LOCAL=true` is dev-only. Self-targeting (the instance or another share) is refused.
- **Surfaces**: install page panel (create, copy, revoke), `POST/GET /api/cli/shares`, `DELETE /api/cli/shares/:id` behind the new `shares:write` scope, and `tack share <url> [--passcode] [--days]`, `tack share list`, `tack share revoke <id>`.

### Known limits

- WebSocket upgrades are not proxied. Fine for static and SSR previews; a dev server's HMR socket will not connect through a share (relevant for phase 2).
- DNS is checked before the fetch, not pinned to the resolved address. A rebinding attack needs control of the target's DNS and a sub-60-second TTL; acceptable for v1, revisit if the hosted instance grows.
- Pins do not record which share they came from yet. The inbox shows the origin that first phoned home only.

## Phase 2 (planned): localhost via cloudflared

Decision: lean on `cloudflared` for the tunnel first rather than building one. `tack share` with no URL will:

1. Detect the dev port (existing `detectFramework`).
2. Spawn `cloudflared tunnel --url http://localhost:<port>` (prompt to install if missing; `brew install cloudflared` / winget / apt).
3. Read the assigned `*.trycloudflare.com` URL from its output.
4. Create a share with that URL as target, print the share link, keep both processes alive until Ctrl-C, then revoke the share.

Trade-off: Cloudflare sits in the trust chain and the tunnel URL changes each run, so the share target is per session. A self-built tunnel (WebSocket multiplexing in the CLI, ~300 lines each side) stays the option for the self-host story if agencies ask for it. Also needed for phase 2: proxying WebSocket upgrades so HMR works through the share.

## Infra checklist for the hosted instance

- DNS: `*.share.peleman.io` → the Coolify server.
- TLS: wildcard certificate via DNS-01 on the Tack resource (Traefik + DNS provider token).
- Env: `TACK_SHARE_DOMAIN=share.peleman.io`; `TACK_PUBLIC_URL` already set.
- Verify with `tack share https://<any public preview>` and open the link.
