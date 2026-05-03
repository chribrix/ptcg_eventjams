#!/bin/sh
set -euo pipefail

run_prisma_migrate() {
  echo "[entrypoint] Running Prisma migrations..."
  npx prisma migrate deploy
  echo "[entrypoint] Prisma migrations complete"
}

if [ "${RUN_PRISMA_GENERATE_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] Generating Prisma client..."
  npx prisma generate --schema=./prisma/schema.prisma
  echo "[entrypoint] Prisma client generation complete"
fi

if [ "${SKIP_PRISMA_MIGRATE:-false}" != "true" ]; then
  # Give Postgres a brief warmup window (useful on fresh container boots).
  max_attempts="${PRISMA_MIGRATE_MAX_ATTEMPTS:-10}"
  attempt=1
  until run_prisma_migrate; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "[entrypoint] Prisma migration failed after ${attempt} attempts"
      exit 1
    fi
    echo "[entrypoint] Migration attempt ${attempt}/${max_attempts} failed, retrying in 3s..."
    attempt=$((attempt + 1))
    sleep 3
  done
else
  echo "[entrypoint] Skipping Prisma migrations (SKIP_PRISMA_MIGRATE=true)"
fi

echo "[entrypoint] Starting Nuxt server..."
exec node .output/server/index.mjs
