# Gasless Offramp

A USD → NGN off-ramp platform built on Stellar. Users deposit USDC on-chain and withdraw Nigerian Naira directly to their bank accounts via Flutterwave — no XLM gas fees required.

## How it works

1. User deposits USDC to their platform-assigned Stellar address (identified by memo ID)
2. The Stellar transaction listener detects the deposit and credits the user's wallet
3. User locks an FX rate (valid 45s) and submits a withdrawal request
4. Platform debits the wallet, submits a Flutterwave bank transfer, and tracks status via webhook
5. On failure, the system retries with exponential backoff and auto-refunds if all retries are exhausted

## Stack

- Backend: Node.js + Express + TypeScript
- Frontend: React + Vite + TypeScript
- Database: PostgreSQL 16
- Cache / queues: Redis 7
- Blockchain: Stellar (via `@stellar/stellar-sdk`)
- Payouts: Flutterwave Transfer API
- FX rates: CoinGecko (Binance fallback)

## Project structure

```
├── src/                    # Backend (Express API)
│   ├── auth/               # JWT auth (register, login, middleware)
│   ├── wallet/             # Wallet balance, credit/debit, deposit address
│   ├── fx/                 # FX rate fetching, caching, rate locking
│   ├── withdrawal/         # Withdrawal flow, Flutterwave payout, webhooks
│   ├── listener/           # Stellar SSE stream listener + deposit handler
│   ├── fraud/              # Suspicious pattern detection + account suspension
│   ├── liquidity/          # NGN liquidity queue processor
│   ├── gas/                # XLM gas sponsorship service
│   ├── transactions/       # Transaction history API
│   ├── redis/              # Redis client + key constants
│   ├── db/                 # PostgreSQL pool + migrations
│   └── config/             # Environment variable loader
└── client/                 # Frontend (React SPA)
    └── src/
        ├── pages/          # Auth, user dashboard, admin panel
        ├── api/            # Typed API client functions
        ├── components/     # Layout + UI primitives
        └── hooks/          # useAuth, useCountdown
```

## Prerequisites

- Node.js 20+
- Docker (for Postgres + Redis)

## Getting started

**1. Install dependencies**

```bash
npm install
cd client && npm install && cd ..
```

**2. Start infrastructure**

```bash
docker-compose up -d
```

This starts Postgres on port `5433` and Redis on port `6379`.

**3. Configure environment**

```bash
cp .env.example .env
```

Fill in the required values (see [Environment variables](#environment-variables) below).

**4. Run migrations**

```bash
npm run migrate
```

**5. Start the backend**

```bash
npm run dev
```

**6. Start the frontend**

```bash
cd client && npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start backend in dev mode (ts-node) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled backend |
| `npm test` | Run Jest test suite |
| `npm run migrate` | Apply DB migrations |
| `cd client && npm run dev` | Start frontend dev server |
| `cd client && npm run build` | Build frontend for production |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes | Redis connection string |
| `JWT_SECRET` | yes | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | no | Token TTL (default: `24h`) |
| `STELLAR_NETWORK` | no | `testnet` or `mainnet` (default: `testnet`) |
| `STELLAR_HORIZON_URL` | no | Horizon endpoint |
| `PLATFORM_STELLAR_ADDRESS` | yes | Platform's Stellar public key |
| `PLATFORM_STELLAR_SECRET` | yes | Platform's Stellar secret key |
| `GAS_SPONSOR_ADDRESS` | yes | Gas sponsor Stellar public key |
| `GAS_SPONSOR_SECRET` | yes | Gas sponsor Stellar secret key |
| `USDC_ISSUER` | yes | USDC asset issuer address |
| `FLUTTERWAVE_PUBLIC_KEY` | yes | Flutterwave public key |
| `FLUTTERWAVE_SECRET_KEY` | yes | Flutterwave secret key |
| `FLUTTERWAVE_ENCRYPTION_KEY` | yes | Flutterwave encryption key |
| `FLUTTERWAVE_WEBHOOK_SECRET` | yes | Webhook HMAC secret |
| `FX_SPREAD` | no | Platform spread on FX rate (default: `0.01` = 1%) |
| `MIN_XLM_RESERVE` | no | Minimum XLM for gas sponsor (default: `100`) |
| `FRAUD_WITHDRAWAL_COUNT_THRESHOLD` | no | Withdrawals per hour before suspension (default: `5`) |
| `FRAUD_WITHDRAWAL_AMOUNT_THRESHOLD` | no | Per-withdrawal amount that counts toward fraud check (default: `500` USDC) |
| `FRAUD_SUSPENSION_MINUTES` | no | Suspension duration on fraud flag (default: `60`) |
| `NGN_LIQUIDITY_POOL` | no | Available NGN liquidity (default: `10,000,000`) |
| `PORT` | no | Server port (default: `3000`) |
| `NODE_ENV` | no | `development` or `production` |

## API overview

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get JWT |
| `GET` | `/wallet/balance` | Get USDC balance |
| `GET` | `/deposit-address` | Get Stellar deposit address + memo |
| `GET` | `/rates` | Get current USDC/NGN rate |
| `POST` | `/rates/lock` | Lock rate for 45s |
| `POST` | `/withdrawal` | Initiate withdrawal |
| `GET` | `/withdrawal/:id` | Get withdrawal status |
| `POST` | `/withdrawal/webhook` | Flutterwave webhook handler |
| `GET` | `/transactions` | Transaction history |
| `GET` | `/health` | Health check |

## Key features

- Gasless deposits — users don't need XLM; the platform sponsors gas via Stellar fee bumps
- Rate locking — FX rate is locked for 45 seconds to protect users from slippage
- Fraud detection — accounts are auto-suspended on suspicious withdrawal patterns
- Auto-retry — failed Flutterwave payouts retry up to 3 times with exponential backoff, then auto-refund
- Liquidity queue — withdrawals queue when NGN liquidity is low and process when funds are available
- Append-only ledger — every credit/debit is recorded for auditability
- Admin panel — manage users, review withdrawals, handle manual deposit recovery

## Database schema

Core tables: `users`, `wallets`, `transactions`, `withdrawals`, `ledger`, `manual_recovery`, `listener_state`

The `ledger` table is append-only and records every balance-affecting event with a `balance_after` snapshot for auditability.
