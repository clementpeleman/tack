# Tack

Visual feedback on preview sites — pin comments on the page, triage them in an inbox.

## Quick start (Docker)

From the repository root:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) and **claim the instance** with your email — the first account is created on the spot, no email provider required. SQLite and screenshots persist in the `tack-data` volume.

**Enable the AI Inbox** (labels, duplicate groups, implementation briefs): uncomment `TACK_AI_ENABLED` and `OPENAI_API_KEY` in `docker-compose.yml` and restart. Analysis is manual and cost-capped — you only pay OpenAI for runs you trigger.

**No email provider yet?** Sign-in links are printed to the server logs (`docker compose logs -f tack`); uncomment the email lines in `docker-compose.yml` when you're ready.

One-liner without compose:

```bash
docker build -t tack .
docker run --rm -p 3000:3000 -v tack-data:/data tack
```

## Development

```bash
pnpm install
pnpm dev
```

Dashboard: [http://localhost:3000](http://localhost:3000)

## Demo

![Tack demo](docs/demo.svg)

On hosted deployments, set `TACK_DEMO_PROJECT_KEY` to enable the live `/demo` route.

## Self-host configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `./tack.db` | SQLite file path |
| `SCREENSHOTS_DIR` | `./data/screenshots` | Pin screenshot storage |
| `TACK_DEPLOYMENT` | `selfhost` | Deployment mode |
| `TACK_PUBLIC_URL` | from request | Public URL behind a reverse proxy (e.g. `https://tack.example.com`) — keeps the embed snippet and magic links on https |
| `TACK_ALLOW_SIGNUP` | off | Allow accounts beyond the first claimed owner (self-host) |
| `RESEND_API_KEY` | — | Email via Resend |
| `SMTP_HOST` / `SMTP_FROM` | — | Email via SMTP |
| `TACK_AI_ENABLED` | off | Enable AI Inbox (needs `OPENAI_API_KEY`) |
| `TACK_DEMO_PROJECT_KEY` | — | Hosted demo project key |

### Local email with Mailpit

Use the bundled compose overlay (Tack + Mailpit):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Magic links appear in Mailpit at [http://localhost:8025](http://localhost:8025).

## Coolify

1. **New Resource → Git Repository**, point at this repo, branch `main`.
2. **Build Pack: Dockerfile** (the root `Dockerfile` is detected automatically).
3. **Ports Exposes: `3000`**, then set your **Domain** — Coolify provisions HTTPS via Let's Encrypt.
4. **Persistent Storage:** add a volume mounted at **`/data`** (SQLite + screenshots live here; without it, every redeploy wipes your data).
5. **Environment variables:** set **`TACK_PUBLIC_URL`** to your domain (e.g. `https://tack.example.com`) so the embed snippet and magic links use https. Everything else is optional — add `RESEND_API_KEY`/SMTP for email and `TACK_AI_ENABLED` + `OPENAI_API_KEY` for the AI Inbox when you want them.
6. **Deploy.** Open the domain and claim the instance with your email — the first owner account is created on the spot, no email provider required.

`DATABASE_URL`, `SCREENSHOTS_DIR`, and `PORT` already default to the right values in the image; you only need the volume and `TACK_PUBLIC_URL`.

## Widget embed

```html
<script
  src="https://your-tack-host/tack-widget.js"
  data-project="pk_…"
  data-api="https://your-tack-host"
></script>
```

The widget is hidden below 768px viewport width.

## Browser extension

A no-code alternative to the script tag for sites you can't edit, or whose Content-Security-Policy would block a `<script>` snippet: `apps/extension/` injects the same widget from a content script. See [`apps/extension/README.md`](apps/extension/README.md) for build and install instructions.

## Product docs

- [`PRODUCT.md`](PRODUCT.md) — audience, brand personality, design principles
- [`DESIGN.md`](DESIGN.md) — locked design system: tokens, typography, component voice
- [`CONTEXT.md`](CONTEXT.md) — domain language and product layer boundaries
- [`docs/plans/2026-06-01-001-feat-core-v1-launch-hardening-plan.md`](docs/plans/2026-06-01-001-feat-core-v1-launch-hardening-plan.md) — Core launch hardening plan
- [`docs/adr/0003-ship-edits-git-not-production.md`](docs/adr/0003-ship-edits-git-not-production.md) — Ship edits Git, never production

## Project structure

```
tack/
├── apps/web/          # Dashboard + API (TanStack Start)
├── apps/extension/    # Browser extension (no-code widget install)
├── packages/widget/   # Embeddable widget
├── packages/shared/   # Shared types + URL normalization
├── Dockerfile
└── docker-compose.yml
```

## License

[AGPL-3.0](LICENSE)
