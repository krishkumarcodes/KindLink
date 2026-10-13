# Multi-stage Dockerfile for KindLink (Next.js Standalone)
# ------------------------------------------------------------------------------
# 1. Dependencies Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

# ------------------------------------------------------------------------------
# 2. Builder Stage (Compiles Next.js standalone bundle)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Arguments for client-inlined Next.js environment variables
ARG NEXT_PUBLIC_SUPABASE_URL="https://pwfvaajngfmnmsfmqgyx.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZnZhYWpuZ2Ztbm1zZm1xZ3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4ODc3ODUsImV4cCI6MjEwNzQ2Mzc4NX0.LSbxXDJJe0PfZsf_JUPD88f5W9KAJVfyKMHIyTLDnWg"
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_JeO_LxYPZFhNoIl5a7tkZw_cogjbwdY"
ARG DATA_SOURCE="supabase"
ARG NEXT_PUBLIC_DATA_SOURCE="supabase"
ARG NEXT_PUBLIC_SITE_URL="https://kindlink.onrender.com"
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=""
ARG NEXT_PUBLIC_BING_SITE_VERIFICATION=""
ARG INDEXNOW_KEY=""

# Make build args available as environment variables during next build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV DATA_SOURCE=$DATA_SOURCE
ENV NEXT_PUBLIC_DATA_SOURCE=$NEXT_PUBLIC_DATA_SOURCE
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_PUBLIC_BING_SITE_VERIFICATION=$NEXT_PUBLIC_BING_SITE_VERIFICATION
ENV INDEXNOW_KEY=$INDEXNOW_KEY

RUN npm run build

# ------------------------------------------------------------------------------
# 3. Runner Stage (Minimal production runtime)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Runtime arguments and fallbacks (overridable at container startup)
ARG NEXT_PUBLIC_SUPABASE_URL="https://pwfvaajngfmnmsfmqgyx.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZnZhYWpuZ2Ztbm1zZm1xZ3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4ODc3ODUsImV4cCI6MjEwNzQ2Mzc4NX0.LSbxXDJJe0PfZsf_JUPD88f5W9KAJVfyKMHIyTLDnWg"
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_JeO_LxYPZFhNoIl5a7tkZw_cogjbwdY"
ARG SUPABASE_SERVICE_ROLE_KEY=""
ARG SUPABASE_SECRET_KEY=""
ARG DATA_SOURCE="supabase"
ARG NEXT_PUBLIC_DATA_SOURCE="supabase"
ARG NEXT_PUBLIC_SITE_URL="https://kindlink.onrender.com"
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=""
ARG NEXT_PUBLIC_BING_SITE_VERIFICATION=""
ARG INDEXNOW_KEY=""

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV SUPABASE_SECRET_KEY=$SUPABASE_SECRET_KEY
ENV DATA_SOURCE=$DATA_SOURCE
ENV NEXT_PUBLIC_DATA_SOURCE=$NEXT_PUBLIC_DATA_SOURCE
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_PUBLIC_BING_SITE_VERIFICATION=$NEXT_PUBLIC_BING_SITE_VERIFICATION
ENV INDEXNOW_KEY=$INDEXNOW_KEY

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy assets and standalone bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
