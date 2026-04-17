import { v4 as uuidv4 } from 'uuid';
import { redis } from '../redis/client';
import { REDIS_KEYS, REDIS_TTL } from '../redis/keys';
import { config } from '../config/env';

export interface FXRate {
  marketRate: string;   // NGN per USDC from external feed
  platformRate: string; // marketRate * (1 - spread)
  spread: number;
  fetchedAt: Date;
}

export interface LockedRate {
  lockId: string;
  userId: string;
  platformRate: string;
  amountUsdc: string;
  amountNgn: string;
  expiresAt: Date;
}

/**
 * Fetch USDC/NGN market rate from CoinGecko public API.
 * Falls back to Binance if CoinGecko fails.
 * Requirements: 4.6
 */
async function fetchMarketRate(): Promise<string> {
  // Try CoinGecko first
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=ngn'
    );
    if (res.ok) {
      const data = await res.json() as { 'usd-coin': { ngn: number } };
      const rate = data['usd-coin']?.ngn;
      if (rate && rate > 0) {
        return rate.toString();
      }
    }
  } catch {
    // fall through to Binance
  }

  // Fallback: Binance USDT/NGN (USDT ≈ USDC for rate purposes)
  const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTNGN');
  if (!res.ok) {
    throw new Error('Failed to fetch market rate from all sources');
  }
  const data = await res.json() as { price: string };
  const rate = parseFloat(data.price);
  if (!rate || rate <= 0) {
    throw new Error('Invalid market rate received');
  }
  return data.price;
}

/**
 * Get the current USDC/NGN market rate, using Redis cache (60s TTL).
 * Requirements: 4.6
 */
async function getCachedMarketRate(): Promise<string> {
  const cached = await redis.get(REDIS_KEYS.FX_RATE);
  if (cached) {
    const parsed = JSON.parse(cached) as FXRate;
    return parsed.marketRate;
  }

  const marketRate = await fetchMarketRate();

  const fxRate: FXRate = {
    marketRate,
    platformRate: applySpread(marketRate, config.fxSpread),
    spread: config.fxSpread,
    fetchedAt: new Date(),
  };

  await redis.set(REDIS_KEYS.FX_RATE, JSON.stringify(fxRate), 'EX', REDIS_TTL.FX_RATE);

  return marketRate;
}

/**
 * Apply spread to market rate: platform_rate = market_rate * (1 - spread)
 */
function applySpread(marketRate: string, spread: number): string {
  const rate = parseFloat(marketRate);
  return (rate * (1 - spread)).toString();
}

/**
 * Get the current FX rate (market + platform rate with spread applied).
 * Caches in Redis for 60s.
 * Requirements: 4.1, 4.2
 */
export async function getCurrentRate(): Promise<FXRate> {
  const cached = await redis.get(REDIS_KEYS.FX_RATE);
  if (cached) {
    const parsed = JSON.parse(cached) as FXRate;
    return { ...parsed, fetchedAt: new Date(parsed.fetchedAt) };
  }

  const marketRate = await fetchMarketRate();
  const platformRate = applySpread(marketRate, config.fxSpread);

  const fxRate: FXRate = {
    marketRate,
    platformRate,
    spread: config.fxSpread,
    fetchedAt: new Date(),
  };

  await redis.set(REDIS_KEYS.FX_RATE, JSON.stringify(fxRate), 'EX', REDIS_TTL.FX_RATE);

  return fxRate;
}

/**
 * Lock the current FX rate for a user's withdrawal.
 * Stores in Redis with 45s TTL.
 * amountNgn = floor(amountUsdc * platformRate * 100) / 100
 * Requirements: 4.3, 4.5
 */
export async function lockRate(userId: string, amountUsdc: string): Promise<LockedRate> {
  const marketRate = await getCachedMarketRate();
  const platformRate = applySpread(marketRate, config.fxSpread);

  const usdc = parseFloat(amountUsdc);
  const rate = parseFloat(platformRate);
  const amountNgn = (Math.floor(usdc * rate * 100) / 100).toString();

  const lockId = uuidv4();
  const expiresAt = new Date(Date.now() + REDIS_TTL.RATE_LOCK * 1000);

  const lockedRate: LockedRate = {
    lockId,
    userId,
    platformRate,
    amountUsdc,
    amountNgn,
    expiresAt,
  };

  await redis.set(
    REDIS_KEYS.RATE_LOCK(lockId),
    JSON.stringify(lockedRate),
    'EX',
    REDIS_TTL.RATE_LOCK
  );

  return lockedRate;
}

/**
 * Retrieve a locked rate by lockId. Returns null if expired or not found.
 */
export async function getLockedRate(lockId: string): Promise<LockedRate | null> {
  const cached = await redis.get(REDIS_KEYS.RATE_LOCK(lockId));
  if (!cached) return null;
  const parsed = JSON.parse(cached) as LockedRate;
  return { ...parsed, expiresAt: new Date(parsed.expiresAt) };
}
