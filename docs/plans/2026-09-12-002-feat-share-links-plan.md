---
date: 2026-09-12
topic: share-links
status: phase 1 and 2 built
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

- DNS is checked before the fetch, not pinned to the resolved address. A rebinding attack needs control of the target's DNS and a sub-60-second TTL; acceptable for v1, revisit if the hosted instance grows.
- Pins do not record which share they came from yet. The inbox shows the origin that first phoned home only.

## Phase 2 (built): localhost via cloudflared

`tack share` with no URL (`packages/cli/src/tunnel.ts`, `commands/share.ts`):

1. Detects the dev port (`detectFramework`, or `--port`) and checks something listens on it over IPv4 and IPv6 (Vite binds `::1` on recent Node).
2. Spawns `cloudflared tunnel --url http://localhost:<port> --http-host-header localhost:<port> --no-autoupdate`; the host-header flag keeps Vite from refusing the request. Missing binary: prints the install command for the platform.
3. Reads the `*.trycloudflare.com` URL from cloudflared's output (45 s timeout).
4. Creates a one-day share on that URL, prints the link, and waits. Ctrl-C (or cloudflared exiting) revokes the share and stops the tunnel; cloudflared's 30 s grace period is cut short with SIGKILL after 3 s.

The proxy forwards WebSocket upgrades (`share-proxy.mjs` → `upgrade`): raw socket piping to the target with the Host rewritten, behind the same share and passcode checks. In dev, `vite.config.ts` wraps Vite's own `upgrade` listener so share hosts go to the proxy and Vite keeps its HMR. Verified end to end: `[vite] connected` and `hot updated: /main.js` through a share, both against a local target and through a cloudflared tunnel.

Trade-off kept: Cloudflare sits in the trust chain for tunnel shares and the URL changes per run. A self-built tunnel stays the option for the self-host story.

## Infra checklist for the hosted instance

- DNS: `*.share.peleman.io` → the Coolify server.
- TLS: wildcard certificate via DNS-01 on the Tack resource (Traefik + DNS provider token).
- Env: `TACK_SHARE_DOMAIN=share.peleman.io`; `TACK_PUBLIC_URL` already set.
- Verify with `tack share https://<any public preview>` and open the link.
