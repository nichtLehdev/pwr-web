# ================================
# Build stage
# ================================
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

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
ENV NODE_OPTIONS="--max-old-space-size=1024"

RUN pnpm build

# ================================
# Production stage
# ================================
FROM node:22-alpine AS runner

# Install pnpm (needed for prisma commands)
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Install dependencies needed for runtime
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files for migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]