# @tack/web

Dashboard, API routes, auth, migrations, and static widget hosting for Tack Core.

## Development

From the repository root:

```bash
pnpm --filter @tack/web dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## Common Commands

```bash
pnpm --filter @tack/web test
pnpm --filter @tack/web build
pnpm --filter @tack/web db:migrate
```

The production container runs migrations on boot through the root `docker-entrypoint.sh`.
