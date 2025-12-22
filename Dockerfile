# Multi-stage build for production
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install necessary build dependencies for native modules
WORKDIR /app
COPY prisma/ /app/prisma/

COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG DEPLOY_TIMESTAMP
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_KEY=${SUPABASE_KEY}
ENV DEPLOY_TIMESTAMP=${DEPLOY_TIMESTAMP}
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for the target platform
RUN npx prisma generate --schema=./prisma/schema.prisma

ENV NODE_ENV=production
RUN npm run build

# Production image, copy all the files and run
FROM base AS runner
WORKDIR /app
ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG DEPLOY_TIMESTAMP

ENV NODE_ENV=production
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_KEY=${SUPABASE_KEY}
ENV DEPLOY_TIMESTAMP=${DEPLOY_TIMESTAMP}
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

# Copy necessary files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER nuxtjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
