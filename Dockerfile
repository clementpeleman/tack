FROM node:22-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/widget/package.json packages/widget/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @tack/widget build && pnpm --filter @tack/web build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/data/tack.db
ENV SCREENSHOTS_DIR=/data/screenshots
ENV TACK_DEPLOYMENT=selfhost

WORKDIR /app/apps/web

EXPOSE 3000
VOLUME ["/data"]

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.mjs"]
