# Telegram Ads Marketplace

A decentralized advertising marketplace built as a Telegram Mini App that connects channel owners with advertisers using TON blockchain for secure escrow payments.

## Features

### Core Marketplace Functionality
- **Dual-sided Marketplace**: Supports both channel owner listings and advertiser campaign requests
- **Unified Deal Workflow**: Single workflow for negotiation, approvals, escrow, and auto-posting
- **Verified Channel Stats**: Real-time subscriber count, views, and engagement metrics from Telegram API
- **Multiple Ad Formats**: Support for posts, forwards/reposts, stories (configurable pricing per format)

### Escrow System (TON Blockchain)
- **Secure Escrow Wallets**: Unique escrow wallet generated per deal using deterministic derivation
- **Automated Payment Verification**: Real-time monitoring of blockchain for incoming payments
- **Atomic Payouts**: Channel owner payment + platform fee in single transaction
- **Auto-refund**: Automatic refund on deal cancellation or timeout

### Auto-Posting & Verification
- **Scheduled Publishing**: Posts published automatically at agreed time via Telegram Bot API
- **Multi-interval Verification**: Post existence verified at 1h, 6h, 12h, and end of posting duration
- **Violation Detection**: Automatic detection of post deletion or unauthorized edits
- **Stats Tracking**: Views, reactions, and forwards tracked for each published post

### Creative Approval Workflow
- **Submission Flow**: Advertiser submits brief -> Channel owner creates creative -> Advertiser approves
- **Revision Support**: Multiple revision rounds with comment history
- **Media Support**: Support for images and inline buttons in ads

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Telegram Mini App (Web)                     │
│                   React 19 + Vite 6 + TypeScript                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────┐
│                        NestJS API Server                         │
│                     Fastify + Prisma + BullMQ                    │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Auth Module │ Deals Module │Posting Module│  Escrow Module     │
│  JWT + TG    │ State Machine│ Scheduler    │  TON Wallets       │
├──────────────┴──────────────┴──────────────┴────────────────────┤
│                       Telegram Bot (Grammy)                      │
│                  Commands + Conversations + Menus                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
┌──────▼──────┐         ┌──────▼──────┐         ┌──────▼──────┐
│  PostgreSQL │         │    Redis    │         │ TON Network │
│   Prisma    │         │  BullMQ     │         │  Testnet    │
└─────────────┘         └─────────────┘         └─────────────┘
```

### Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Backend Framework | NestJS + Fastify | 10.x + 5.x |
| Frontend | React + Vite | 19 + 6 |
| Database | PostgreSQL + Prisma | 17 + 5.22 |
| Cache/Queue | Redis + BullMQ | 7.4 |
| Telegram Bot | Grammy | 1.21 |
| Blockchain | @ton/ton + @ton/crypto | 13.x + 3.x |
| Package Manager | pnpm + Turborepo | 9.x |

### Project Structure

```
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── core/           # Database, Redis, auth guards
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # Telegram authentication
│   │   │   │   ├── users/      # User management
│   │   │   │   ├── channels/   # Channel registration & stats
│   │   │   │   ├── campaigns/  # Advertiser campaigns
│   │   │   │   ├── deals/      # Deal state machine
│   │   │   │   ├── escrow/     # TON escrow wallets
│   │   │   │   ├── posting/    # Auto-posting & verification
│   │   │   │   ├── telegram-bot/  # Bot commands & conversations
│   │   │   │   ├── notifications/ # User notifications
│   │   │   │   └── jobs/       # Scheduled tasks
│   │   │   └── main.ts
│   │   └── prisma/             # Database schema & migrations
│   │
│   └── web/                    # Telegram Mini App
│       └── src/
│           ├── api/            # API client
│           ├── components/     # Reusable UI components
│           ├── hooks/          # Custom React hooks
│           ├── pages/          # Page components
│           └── providers/      # Context providers
│
├── packages/
│   └── shared/                 # Shared types, constants, utils
│
├── docker-compose.yml          # Production setup
├── docker-compose.dev.yml      # Development infrastructure
└── turbo.json                  # Monorepo configuration
```

## Key Design Decisions

### 1. State Machine for Deals
Deals use a finite state machine with 16 states to ensure correct workflow transitions and prevent invalid operations. The state machine is implemented using XState and enforces:
- Only valid state transitions allowed
- Automatic timeout handling for stale deals
- Clear lifecycle controls with events tracked in timeline

### 2. Deterministic Escrow Wallets
Each deal gets a unique escrow wallet derived deterministically from a master seed + deal ID. This approach:
- Enables wallet reconstruction without storing private keys
- Allows single-transaction payouts (owner + platform fee)
- Simplifies wallet management at scale

### 3. Real Telegram API Integration
Instead of mocking, we use real Telegram Bot API for:
- Channel stats (subscriber count, verified from source)
- Auto-posting (messages sent via bot as admin)
- Post verification (checking message existence via API)

### 4. Job Queue Architecture
BullMQ handles all async operations:
- `post-scheduler`: Scheduled post publishing
- `post-publisher`: Actual Telegram API posting
- `post-verification`: Periodic existence checks
- `escrow-monitor`: Payment detection
- `channel-stats`: Hourly stats updates

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose
- Telegram Bot Token (from @BotFather)
- TON API key (optional, for rate limits)

### Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd telegram-ads-marketplace
pnpm install

# 2. Start infrastructure
docker-compose -f docker-compose.dev.yml up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with your configuration (see below)

# 4. Setup database
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed

# 5. Start development
cd ../..
pnpm dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/telegram_ads_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_BOT_USERNAME=YourBotUsername
TELEGRAM_WEBAPP_URL=https://your-webapp-url.com

# TON Blockchain
TON_NETWORK=testnet
TON_API_KEY=your-toncenter-api-key
TON_PLATFORM_WALLET_ADDRESS=EQxxxx...
ESCROW_MASTER_SEED=word1 word2 word3... (24-word mnemonic)
```

### Creating a Telegram Bot

1. Message @BotFather on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token to `TELEGRAM_BOT_TOKEN`
4. Enable Mini App:
   - Send `/newapp` to @BotFather
   - Select your bot
   - Provide your webapp URL

### Setting Up TON Wallet

1. Create a testnet wallet at https://wallet.ton.org (switch to testnet)
2. Get test TON from @testgiver_ton_bot
3. Export the 24-word mnemonic
4. Set as `ESCROW_MASTER_SEED` in .env

## API Documentation

API documentation is available via Swagger at `/api/docs` when running the server.

### Key Endpoints

#### Authentication
```
POST /auth/telegram          # Authenticate with Telegram init data
POST /auth/refresh           # Refresh access token
```

#### Channels
```
GET  /channels               # List public channels with filters
GET  /channels/:id           # Get channel details + stats
POST /channels               # Register new channel
POST /channels/:id/verify    # Trigger channel verification
PUT  /channels/:id/pricing   # Set ad format pricing
```

#### Campaigns
```
GET  /campaigns              # List open campaigns
POST /campaigns              # Create advertiser campaign
POST /campaigns/:id/apply    # Channel owner applies
```

#### Deals
```
GET  /deals                  # List user's deals
POST /deals                  # Create deal (direct offer)
POST /deals/:id/accept       # Accept deal
POST /deals/:id/creative     # Submit creative
POST /deals/:id/approve      # Approve creative
POST /deals/:id/schedule     # Schedule post
```

#### Escrow
```
GET  /escrow/deals/:id/payment-info    # Get escrow payment address
GET  /escrow/transactions              # Transaction history
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start bot & show main menu |
| `/help` | Show help information |
| `/channels` | Manage your channels |
| `/deals` | View active deals |
| `/settings` | Configure notifications |
| `/webapp` | Open Mini App directly |

## Deal Lifecycle

```
CREATED                 # Advertiser creates deal offer
    ↓
PENDING_CHANNEL_OWNER   # Awaiting channel owner response
    ↓
ACCEPTED                # Channel owner accepted
    ↓
PENDING_PAYMENT         # Escrow created, awaiting payment
    ↓
PAYMENT_RECEIVED        # Funds locked in escrow
    ↓
IN_PROGRESS             # Deal workflow active
    ↓
CREATIVE_PENDING        # Awaiting creative from channel owner
    ↓
CREATIVE_SUBMITTED      # Creative submitted for review
    ↓
CREATIVE_APPROVED       # Advertiser approved creative
    ↓
SCHEDULED               # Post scheduled for publishing
    ↓
POSTED                  # Post published to channel
    ↓
VERIFYING               # Periodic verification in progress
    ↓
VERIFIED                # Final verification passed
    ↓
COMPLETED               # Funds released to channel owner
```

Alternative endings: `CANCELLED`, `REFUNDED`, `EXPIRED`, `DISPUTED`

## Deployment

### Production Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# Run migrations
docker-compose exec api pnpm prisma migrate deploy

# View logs
docker-compose logs -f
```

### Webhook Setup for Production

For production, configure Telegram webhook instead of polling:

```bash
# Set webhook (replace with your domain)
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-api-domain.com/webhook/telegram"
```

## Known Limitations & Future Work

### Current Limitations

1. **Partial Channel Analytics**: Bot API doesn't expose detailed analytics (views per post, language distribution). These require MTProto (userbot) access or external services like tgstat.com

2. **Message Verification**: The current implementation uses copy-delete trick to verify message existence. Direct message access would require MTProto

3. **Single-currency**: Currently only TON supported. Multi-token support would need jetton integration

4. **No Dispute Resolution**: Automated disputes not implemented. Manual admin review required for contested deals

### Planned Features

- **Multi-admin Support**: Allow PR managers to manage channels
- **Bulk Campaigns**: Book multiple channels in single transaction
- **Analytics Dashboard**: Detailed performance metrics
- **Automated Dispute Resolution**: AI-powered content verification
- **Reputation System**: On-chain reputation tokens
- **Jetton Payments**: Support for USDT and other jettons

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details.

---

Built for Telegram Tools Contest 2026
