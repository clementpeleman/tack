# Tack

Visual feedback on preview sites — pin comments on the page, triage them in an inbox.

## Quick start (Docker)

```bash
cd app
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). SQLite and screenshots persist in the `tack-data` volume.

**Enable the AI Inbox** (labels, duplicate groups, implementation briefs): uncomment `TACK_AI_ENABLED` and `OPENAI_API_KEY` in `docker-compose.yml` and restart. Analysis is manual and cost-capped — you only pay OpenAI for runs you trigger.

**No email provider yet?** Sign-in links are printed to the server logs (`docker compose logs -f tack`); uncomment the email lines in `docker-compose.yml` when you're ready.

One-liner without compose:

```bash
docker build -t tack ./app
docker run --rm -p 3000:3000 -v tack-data:/data tack
```

## Development

```bash
cd app
pnpm install
pnpm dev
```

Dashboard: [http://localhost:3000](http://localhost:3000)

## Demo

![Tack demo](docs/demo.svg)

Replace `docs/demo.svg` with a recorded GIF (`docs/demo.gif`) before Show HN. On hosted deployments, set `TACK_DEMO_PROJECT_KEY` to enable the live `/demo` route.

## Self-host configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `./tack.db` | SQLite file path |
| `SCREENSHOTS_DIR` | `./data/screenshots` | Pin screenshot storage |
| `TACK_DEPLOYMENT` | `selfhost` | Deployment mode |
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

Import `app/docker-compose.yml` as a Docker Compose service. Mount a persistent volume at `/data`.

## Widget embed

```html
<script
  src="https://your-tack-host/tack-widget.js"
  data-project="pk_…"
  data-api="https://your-tack-host"
></script>
```

The widget is hidden below 768px viewport width.

## Specs

- [`core-v1.md`](../core-v1.md) — Core launch bar
- [`ai-inbox-v1.md`](../ai-inbox-v1.md) — AI Inbox
- [`ship-v1.md`](../ship-v1.md) — Ship (private beta)

## Project structure

```
app/
├── apps/web/          # Dashboard + API (TanStack Start)
├── packages/widget/   # Embeddable widget
├── packages/shared/   # Shared types + URL normalization
├── Dockerfile
└── docker-compose.yml
```
