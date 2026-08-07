# ================================
# Build stage
# ================================
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

# Install all dependencies (including devDependencies for build)
# This will run prisma generate via postinstall hook
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application with memory optimizations
ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN pnpm build

# Drop devDependencies before the runner copies node_modules — the runtime
# entrypoints (next, prisma migrate, tsx for seeds) are all regular
# dependencies, so the image doesn't need typescript/eslint/tailwind etc.
RUN pnpm prune --prod

# ================================
# Production stage
# ================================
FROM node:24-alpine AS runner

# Install dependencies needed for runtime
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Create non-root user for security and give it ownership of the workdir.
# /app itself must be writable by the runtime user (next may write to cwd
# in some cases) — the COPY --chown lines below only chown the files
# copied in, not the /app directory entry itself.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs \
  && chown nextjs:nodejs /app \
  # Uploads volume mount point (outside public/ so access goes through the
  # authorizing /api/uploads route)
  && mkdir -p /app/uploads \
  && chown nextjs:nodejs /app/uploads

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# We do NOT install corepack/pnpm in the runner. All runtime entrypoints
# (next, prisma, tsx) are invoked directly via node_modules/.bin to avoid
# pnpm 11's runDepsStatusCheck, which tries to wipe and reinstall
# node_modules on every script invocation and fails in containers (no TTY).
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Copy the full build output (non-standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma files for migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

# Copy generated Prisma client
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated

# Copy tsconfig + minimal src needed for post-migration-setup.ts (runs with tsx in container)
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app/src/server/db.ts ./src/server/
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/permissions.ts ./src/lib/

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application using next directly (no pnpm wrapper, see comment
# above about runDepsStatusCheck).
CMD ["node", "node_modules/next/dist/bin/next", "start"]