# Build stage
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy full workspace structure for proper pnpm resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install all dependencies with shamefully-hoist for flat node_modules
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY tsconfig.base.json ./

# Build web app
WORKDIR /app/apps/web

# Build args for Vite - ALL VITE_ vars must be passed at build time
ARG VITE_API_URL
ARG VITE_TON_CONNECT_MANIFEST_URL
ARG VITE_BOT_USERNAME
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TON_CONNECT_MANIFEST_URL=$VITE_TON_CONNECT_MANIFEST_URL
ENV VITE_BOT_USERNAME=$VITE_BOT_USERNAME

# Run vite build using the hoisted binary from root node_modules
RUN /app/node_modules/.bin/vite build

# Production stage - nginx
FROM nginx:alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
