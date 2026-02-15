# Build stage
FROM node:22-alpine AS builder

# Install openssl for Prisma
RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy full workspace structure for proper pnpm resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all dependencies with shamefully-hoist
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

# Copy contract wrappers (used by ton-wallet.service.ts)
COPY apps/api/contracts ./apps/api/contracts

# Add hoisted node_modules/.bin to PATH
ENV PATH="/app/node_modules/.bin:${PATH}"

# Build shared package
RUN cd packages/shared && tsc || true

# Generate Prisma client
RUN cd apps/api && prisma generate

# Build the API (disable incremental for clean Docker builds)
RUN cd apps/api && tsc -p tsconfig.build.json --incremental false

# Production stage
FROM node:22-alpine AS runner

# Install openssl for Prisma runtime and wget for healthcheck
RUN apk add --no-cache openssl wget

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace config
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.npmrc ./

# Copy package.json files
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy BOC files from src/contracts to dist/contracts for runtime access
COPY --from=builder /app/apps/api/src/contracts/*.boc ./apps/api/dist/contracts/

# Copy Tolk contract BOC (new escrow-deal.tolk v4.0)
COPY --from=builder /app/apps/api/src/contracts/tolk ./apps/api/dist/contracts/tolk

# Install production dependencies only (ignore-scripts to skip husky)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy the generated Prisma client from builder
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app/apps/api

EXPOSE 4000

# Correct health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
