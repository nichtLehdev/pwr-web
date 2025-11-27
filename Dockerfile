# Build stage
FROM node:24-alpine3.21 AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy prisma schema first
COPY prisma ./prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm prisma generate

# Copy source code
COPY . .

# Build the application (skip env validation for Docker builds)
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build

# Production stage
FROM node:24-alpine3.21 AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

WORKDIR /app

# Set to production
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
