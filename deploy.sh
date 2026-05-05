#!/bin/bash

set -e

echo "==========================================="
echo "Starting deployment"
echo "==========================================="

docker compose --profile prod up -d postgres
docker compose --profile prod build --no-cache app
docker compose --profile prod up -d --no-deps app

echo ""
echo "Waiting for app container to be ready..."
for i in $(seq 1 30); do
  if [ "$(docker inspect -f '{{.State.Running}}' ptcg_app 2>/dev/null || echo false)" = "true" ]; then
    if curl -fsS http://localhost:8080/ >/dev/null 2>&1; then
      echo "App container is running and responding."
      break
    fi
  fi

  if [ "$i" -eq 30 ]; then
    echo "App container did not become ready in time."
    exit 1
  fi

  sleep 2
done

echo ""
echo "Running one-time Supabase player link backfill..."
docker compose --profile prod exec -T app npm run migrate:supabase-ids:once
echo "One-time Supabase player link backfill complete."

echo ""
echo "==========================================="
echo "Deployment complete!"
echo "==========================================="
