FROM node:24-alpine AS builder

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# pnpm version must match package.json "packageManager" (e.g. pnpm@11.1.1)
COPY package.json ./
RUN corepack enable && corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

# Copy lockfile + workspace config (pnpm 11: allowBuilds / strictDepBuilds lives here)
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy prisma schema for generation
COPY prisma ./prisma
COPY prisma.config.ts ./

# Accept DATABASE_URL as build argument - MUST be before install
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# postinstall runs prisma generate
RUN pnpm install --frozen-lockfile

COPY . .

ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN pnpm build

# Runtime entrypoints (next, prisma migrate, tsx) are regular dependencies.
RUN pnpm prune --prod

FROM node:24-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

# /app itself must be writable by nextjs (next may write to cwd); COPY --chown
# only chowns the copied files, not the directory.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs \
  && chown nextjs:nodejs /app \
  # Uploads outside public/, so access goes through the authorizing /api/uploads route
  && mkdir -p /app/uploads \
  && chown nextjs:nodejs /app/uploads

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# No pnpm in the runner: pnpm 11's runDepsStatusCheck tries to reinstall node_modules
# on every script run and fails in containers (no TTY). Entrypoints run via node directly.
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Copy the full build output (non-standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma files for migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated

# Minimal src for the prisma/*.ts scripts run with tsx at container start (deploy/stack.yaml).
# List every transitive import: a missing file builds fine and fails only at runtime, quietly.
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app/src/server/db.ts ./src/server/
COPY --from=builder --chown=nextjs:nodejs /app/src/server/utils/logger.ts ./src/server/utils/
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/permissions.ts ./src/lib/
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/bezirke.ts ./src/lib/
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/slug.ts ./src/lib/
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/phone-number.ts ./src/lib/
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/description-linebreaks.ts ./src/lib/

# Trigger scripts for the mStudio cron jobs (mittwald), see the script headers
COPY --chown=nextjs:nodejs scripts/trigger-registration-closed.mjs ./scripts/
COPY --chown=nextjs:nodejs scripts/trigger-newsletter-cleanup.mjs ./scripts/
COPY --chown=nextjs:nodejs scripts/trigger-waitlist-offers.mjs ./scripts/

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# No pnpm wrapper, see runDepsStatusCheck above.
CMD ["node", "node_modules/next/dist/bin/next", "start"]