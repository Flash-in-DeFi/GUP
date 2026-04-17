-- Migration 001: Initial schema

-- Users
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  kyc_status       TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  stellar_address  TEXT NOT NULL,
  memo_id          TEXT UNIQUE NOT NULL,
  daily_limit_usdc NUMERIC(20,7) NOT NULL DEFAULT 1000,
  suspended_until  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  asset   TEXT NOT NULL DEFAULT 'USDC',
  balance NUMERIC(20,7) NOT NULL DEFAULT 0,
  UNIQUE(user_id, asset)
);

-- Transactions (deposits, withdrawals, refunds)
CREATE TABLE IF NOT EXISTS transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL, -- deposit | withdrawal | refund
  amount     NUMERIC(20,7) NOT NULL,
  asset      TEXT NOT NULL,
  status     TEXT NOT NULL, -- pending | completed | failed
  tx_hash    TEXT UNIQUE,   -- Stellar tx hash (nullable for fiat-side events)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  amount_usdc     NUMERIC(20,7) NOT NULL,
  amount_ngn      NUMERIC(20,2) NOT NULL,
  fx_rate         NUMERIC(20,7) NOT NULL,
  bank_code       TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | queued | completed | failed
  flutterwave_ref TEXT,
  retry_count     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ledger (append-only audit trail)
CREATE TABLE IF NOT EXISTS ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  event_type    TEXT NOT NULL, -- credit | debit | refund | fee
  amount        NUMERIC(20,7) NOT NULL,
  asset         TEXT NOT NULL,
  reference_id  UUID,          -- FK to transactions or withdrawals
  balance_after NUMERIC(20,7) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Manual recovery for unmatched deposits
CREATE TABLE IF NOT EXISTS manual_recovery (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash    TEXT NOT NULL,
  amount     NUMERIC(20,7) NOT NULL,
  memo       TEXT,
  resolved   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Listener cursor state
CREATE TABLE IF NOT EXISTS listener_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
