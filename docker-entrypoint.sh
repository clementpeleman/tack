#!/bin/sh
set -e

mkdir -p /data/screenshots
export DATABASE_URL="${DATABASE_URL:-/data/tack.db}"
export SCREENSHOTS_DIR="${SCREENSHOTS_DIR:-/data/screenshots}"

cd /app/apps/web
node scripts/migrate.mjs

exec "$@"
