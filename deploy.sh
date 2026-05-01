#!/bin/bash

# Deploy script that automatically sets DEPLOY_TIMESTAMP
# This ensures all old sessions are invalidated on each deployment

# Generate deployment timestamp (Unix timestamp in milliseconds)
export DEPLOY_TIMESTAMP=$(date +%s%3N)

echo "==========================================="
echo "Starting deployment with timestamp: $DEPLOY_TIMESTAMP"
echo "This will invalidate all existing sessions"
echo "==========================================="

# Run docker compose with the new timestamp
docker compose --profile prod down
docker compose --profile prod build --no-cache
docker compose --profile prod up -d

echo ""
echo "Waiting for app container to be ready..."
for i in $(seq 1 30); do
  if docker compose --profile prod ps app | grep -q "running"; then
    echo "App container is running."
    break
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
echo "All users will need to re-login"
echo "==========================================="
