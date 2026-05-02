# Docker Production Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js 22+ (for local development)

## Production Deployment

### 1. Configure Environment

```bash
# Copy the example environment file
cp .env.production.example .env

# Edit .env with your production values
nano .env
```

**Important**: Update these values in `.env`:

- `POSTGRES_PASSWORD` - Use a strong password
- `SUPABASE_URL` and `SUPABASE_KEY` - Your production Supabase credentials
- `APP_BASE_URL` - The public URL of your app (used in Supabase magic-link redirects)
- `SMTP_*` - Your production email service credentials

These values are injected into the Docker build, so make sure `.env` exists **before** running `docker compose --profile prod up -d --build`.

Production note: PostgreSQL should remain reachable only on the internal Docker network. Do not publish `5432` on the host in production.

### 2. Build and Start Production Services

```bash
# Build and start the app and database with the 'prod' profile
docker-compose --profile prod up -d --build

# Or use the shorthand
docker compose --profile prod up -d --build
```

This will:

- Start PostgreSQL database
- Build the app container with Node.js 22
- Start the app container
- Expose the app on host port 8080
- Keep PostgreSQL private on the internal Docker network only

### 3. Database Migrations

When the app container starts it automatically runs `npx prisma migrate deploy`. This ensures the schema is always up to date when the service boots. To skip this behavior (for example on read-only replicas) set `SKIP_PRISMA_MIGRATE=true` in the app container environment.

If you want to seed data manually you can still run:

```bash
docker exec ptcg_app npx prisma db seed
```

### 4. Access the Application

- App: http://localhost:8080

## Development Mode

For local development with pgAdmin:

```bash
# Start with dev profile (includes pgAdmin)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up -d
```

Access:

- App: Run locally with `npm run dev`
- Database: published on `127.0.0.1:5432` for local Nuxt/Prisma access only
- pgAdmin: http://localhost:5050

If you need direct SQL access, use `docker exec -it ptcg_postgres psql -U <user> -d <db>` rather than publishing port 5432.

The host port binding exists only in `docker-compose.dev.yml`. Production deploys must use only `docker-compose.yml`.

## Useful Commands

### View Logs

```bash
# All services
docker-compose --profile prod logs -f

# Specific service
docker-compose --profile prod logs -f app
```

### Restart Services

```bash
docker-compose --profile prod restart app
```

### Stop Services

```bash
docker-compose --profile prod down
```

### Stop and Remove Volumes (⚠️ Data Loss)

```bash
docker-compose --profile prod down -v
```

### Rebuild After Code Changes

```bash
docker-compose --profile prod up -d --build app
```

### Access App Container Shell

```bash
docker exec -it ptcg_app sh
```

### Access Database

```bash
docker exec -it ptcg_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## Environment Variables

The app container uses these environment variables:

- `DATABASE_URL` - Automatically constructed from POSTGRES\_\* vars
- `NODE_ENV` - Set to 'production'
- All other vars from `.env` file

## Troubleshooting

### App Container Won't Start

```bash
# Check logs
docker-compose --profile prod logs app

# Check if database is ready
docker-compose --profile prod ps
```

### Database Connection Issues

1. Ensure `DATABASE_URL` uses `postgres` as host (not `localhost`)
2. Wait for database to be ready before starting app
3. Check network: `docker network inspect ptcg_eventjams_fe_default`
4. Confirm PostgreSQL is not published on the host: `docker ps --format '{{.Names}}\t{{.Ports}}'`

### Port Already in Use

```bash
# Change ports in docker-compose.yml
# For example: "3001:3000" instead of "3000:3000"
```

## Production Checklist

- [ ] Strong database password in `.env`
- [ ] Production Supabase credentials
- [ ] Production SMTP credentials
- [ ] Run migrations: `docker exec ptcg_app npx prisma migrate deploy`
- [ ] Check logs: `docker-compose --profile prod logs -f`
- [ ] Test the application at http://localhost:8080
- [ ] Set up reverse proxy (nginx/caddy) for SSL
- [ ] Configure firewall rules
- [ ] Verify `ptcg_postgres` is not published on `0.0.0.0:5432`
- [ ] Verify `ptcg_postgres` has no host port published in production
- [ ] Set up monitoring and backups
