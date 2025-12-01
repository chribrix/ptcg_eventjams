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
- `SMTP_*` - Your production email service credentials

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
- Expose the app on port 3000

### 3. Run Database Migrations

```bash
# Run Prisma migrations in the app container
docker exec ptcg_app npx prisma migrate deploy

# Optional: Seed the database
docker exec ptcg_app npx prisma db seed
```

### 4. Access the Application

- App: http://localhost:3000

## Development Mode

For local development with pgAdmin:

```bash
# Start with dev profile (includes pgAdmin)
docker-compose --profile dev up -d
```

Access:

- App: Run locally with `npm run dev`
- Database: localhost:5432
- pgAdmin: http://localhost:5050

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
docker exec -it ptcg_postgres psql -U idp -d idp
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
- [ ] Test the application at http://localhost:3000
- [ ] Set up reverse proxy (nginx/caddy) for SSL
- [ ] Configure firewall rules
- [ ] Set up monitoring and backups
