#!/bin/sh
set -euo pipefail

if [ "${SKIP_PRISMA_MIGRATE:-false}" != "true" ]; then
  echo "[entrypoint] Running Prisma migrations..."
  npx prisma migrate deploy
  echo "[entrypoint] Prisma migrations complete"
else
  echo "[entrypoint] Skipping Prisma migrations (SKIP_PRISMA_MIGRATE=true)"
fi

echo "[entrypoint] Starting Nuxt server..."
exec node .output/server/index.mjs
