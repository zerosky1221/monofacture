# Deployment Guide — Monofacture

## Prerequisites

- VPS with 4 GB+ RAM (Ubuntu 22.04+ recommended)
- Docker 24+ and Docker Compose v2
- Domain with DNS A-record pointing to the server
- Nginx or Caddy as reverse proxy (for SSL termination)
- Telegram Bot token from @BotFather
- TON Center API key

## Architecture

```
┌─────────────┐     ┌───────────────┐     ┌─────────────┐
│  Nginx/SSL  │────▶│  Web (Nginx)  │     │   Redis 7   │
│  :443/:80   │     │  :3000 → :80  │     │   :6379     │
└──────┬──────┘     └───────────────┘     └──────┬──────┘
       │                                         │
       │            ┌───────────────┐     ┌──────┴──────┐
       └───────────▶│  API (Node)   │────▶│ PostgreSQL  │
                    │  :4000        │     │   17-alpine │
                    └───────────────┘     └─────────────┘
```

All services run as Docker containers on a single `telegram-ads-network` bridge network.

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url> /opt/monofacture
cd /opt/monofacture
cp .env.example .env
```

### 2. Edit `.env`

Fill in all required values:

```env
# Application
NODE_ENV=production
PORT=4000
WEBAPP_URL=https://app.yourdomain.com

# Database
POSTGRES_USER=monofacture
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=telegram_ads
DATABASE_URL=postgresql://monofacture:<password>@postgres:5432/telegram_ads?connection_limit=5&pool_timeout=30

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT (generate with: openssl rand -base64 48)
JWT_SECRET=<random-secret>
JWT_REFRESH_SECRET=<different-random-secret>

# Telegram
TELEGRAM_BOT_TOKEN=<from-botfather>
TELEGRAM_BOT_USERNAME=<your_bot_username>
TELEGRAM_WEBAPP_URL=https://app.yourdomain.com

# TON
TON_NETWORK=mainnet
TON_API_KEY=<from-toncenter>
TON_PLATFORM_WALLET_ADDRESS=<your-ton-wallet>
ESCROW_MASTER_SEED=<random-seed-for-escrow-keypairs>

# Frontend build args
VITE_API_URL=/api/v1
VITE_TON_CONNECT_MANIFEST_URL=https://app.yourdomain.com/tonconnect-manifest.json
VITE_BOT_USERNAME=<your_bot_username>
```

### 3. Build and start

```bash
docker compose build --no-cache
docker compose up -d
```

### 4. Run database migrations

```bash
docker compose exec api npx prisma migrate deploy
```

### 5. Verify

```bash
# Check all containers are healthy
docker compose ps

# Check API health
curl http://localhost:4000/api/v1/health

# Check web
curl -I http://localhost:3000
```

## Reverse Proxy (Nginx)

Example config for `/etc/nginx/sites-available/monofacture`:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Swagger docs (non-production only)
    location /docs {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
    }

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then:

```bash
sudo ln -s /etc/nginx/sites-available/monofacture /etc/nginx/sites-enabled/
sudo certbot --nginx -d app.yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

## Memory Limits

Configured for a 4 GB VPS:

| Service    | Limit  | Reserved |
|------------|--------|----------|
| PostgreSQL | 512 MB | 256 MB   |
| Redis      | 256 MB | 64 MB    |
| API        | 1 GB   | 512 MB   |
| Web        | 128 MB | 64 MB    |
| **Total**  | ~2 GB  | ~896 MB  |

Node.js heap is limited to 768 MB via `NODE_OPTIONS="--max-old-space-size=768"`.

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` or `development` |
| `PORT` | No | API port (default: `4000`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_HOST` | Yes | Redis hostname |
| `REDIS_PORT` | No | Redis port (default: `6379`) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | JWT refresh token secret |
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `TELEGRAM_BOT_USERNAME` | Yes | Bot username (without @) |
| `TELEGRAM_WEBAPP_URL` | Yes | Mini App URL |
| `WEBAPP_URL` | Yes | Frontend URL for CORS |
| `TON_NETWORK` | Yes | `mainnet` or `testnet` |
| `TON_API_KEY` | Yes | TON Center API key |
| `TON_PLATFORM_WALLET_ADDRESS` | Yes | Platform wallet for escrow |
| `ESCROW_MASTER_SEED` | Yes | Seed for escrow keypair derivation |
| `VITE_API_URL` | No | API base path (default: `/api/v1`) |
| `VITE_TON_CONNECT_MANIFEST_URL` | No | TON Connect manifest URL |
| `VITE_BOT_USERNAME` | No | Bot username for TWA return |

## Common Operations

### Update and redeploy

```bash
cd /opt/monofacture
git pull origin main

# Rebuild and restart specific service
docker compose build --no-cache api
docker compose up -d api

# Or rebuild everything
docker compose build --no-cache
docker compose up -d
```

### Run migrations after schema changes

```bash
docker compose exec api npx prisma migrate deploy
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web

# Last 100 lines
docker compose logs --tail 100 api
```

### Database backup

```bash
docker compose exec postgres pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-telegram_ads} > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database restore

```bash
cat backup.sql | docker compose exec -T postgres psql -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-telegram_ads}
```

### Access Prisma Studio (development)

```bash
docker compose exec api npx prisma studio
```

### Reset a stuck container

```bash
docker compose restart api
```

## Rate Limiting

Global rate limits are configured via `ThrottlerModule`:

| Tier   | Limit | Window |
|--------|-------|--------|
| Short  | 3     | 1s     |
| Medium | 20    | 10s    |
| Long   | 100   | 60s    |

Critical endpoints have stricter per-endpoint limits:
- Escrow operations (fund/release/refund): **3 req/min**
- Deal/channel creation: **5 req/min**
- Chat messages: **10 req/min**

Exceeding limits returns HTTP 429 (Too Many Requests).

## API Documentation (Swagger)

Swagger UI is available at `/api/v1/docs` when `NODE_ENV` is not `production`.

To access in development:
```
http://localhost:4000/docs
```

## Troubleshooting

### Container won't start
```bash
docker compose logs api | tail -50
docker compose ps        # Check health status
```

### Database connection errors
```bash
# Verify PostgreSQL is healthy
docker compose exec postgres pg_isready -U postgres

# Check connection string
docker compose exec api printenv DATABASE_URL
```

### Out of memory
Check container memory usage:
```bash
docker stats --no-stream
```

If a container is OOM-killed, increase limits in `docker-compose.yml` under `deploy.resources.limits.memory`.

### Prisma migration issues
```bash
# Check migration status
docker compose exec api npx prisma migrate status

# Force reset (DESTROYS DATA)
docker compose exec api npx prisma migrate reset --force
```

### Redis issues
```bash
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli info memory
```
