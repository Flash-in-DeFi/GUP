"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentRate = getCurrentRate;
exports.lockRate = lockRate;
exports.getLockedRate = getLockedRate;
const uuid_1 = require("uuid");
const client_1 = require("../redis/client");
const keys_1 = require("../redis/keys");
const env_1 = require("../config/env");
/**
 * Fetch USDC/NGN market rate from CoinGecko public API.
 * Falls back to Binance if CoinGecko fails.
 * Requirements: 4.6
 */
async function fetchMarketRate() {
    // Try CoinGecko first
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=ngn');
        if (res.ok) {
            const data = await res.json();
            const rate = data['usd-coin']?.ngn;
            if (rate && rate > 0) {
                return rate.toString();
            }
        }
    }
    catch {
        // fall through to Binance
    }
    // Fallback: Binance USDT/NGN (USDT ≈ USDC for rate purposes)
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTNGN');
    if (!res.ok) {
        throw new Error('Failed to fetch market rate from all sources');
    }
    const data = await res.json();
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
async function getCachedMarketRate() {
    const cached = await client_1.redis.get(keys_1.REDIS_KEYS.FX_RATE);
    if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.marketRate;
    }
    const marketRate = await fetchMarketRate();
    const fxRate = {
        marketRate,
        platformRate: applySpread(marketRate, env_1.config.fxSpread),
        spread: env_1.config.fxSpread,
        fetchedAt: new Date(),
    };
    await client_1.redis.set(keys_1.REDIS_KEYS.FX_RATE, JSON.stringify(fxRate), 'EX', keys_1.REDIS_TTL.FX_RATE);
    return marketRate;
}
/**
 * Apply spread to market rate: platform_rate = market_rate * (1 - spread)
 */
function applySpread(marketRate, spread) {
    const rate = parseFloat(marketRate);
    return (rate * (1 - spread)).toString();
}
/**
 * Get the current FX rate (market + platform rate with spread applied).
 * Caches in Redis for 60s.
 * Requirements: 4.1, 4.2
 */
async function getCurrentRate() {
    const cached = await client_1.redis.get(keys_1.REDIS_KEYS.FX_RATE);
    if (cached) {
        const parsed = JSON.parse(cached);
        return { ...parsed, fetchedAt: new Date(parsed.fetchedAt) };
    }
    const marketRate = await fetchMarketRate();
    const platformRate = applySpread(marketRate, env_1.config.fxSpread);
    const fxRate = {
        marketRate,
        platformRate,
        spread: env_1.config.fxSpread,
        fetchedAt: new Date(),
    };
    await client_1.redis.set(keys_1.REDIS_KEYS.FX_RATE, JSON.stringify(fxRate), 'EX', keys_1.REDIS_TTL.FX_RATE);
    return fxRate;
}
/**
 * Lock the current FX rate for a user's withdrawal.
 * Stores in Redis with 45s TTL.
 * amountNgn = floor(amountUsdc * platformRate * 100) / 100
 * Requirements: 4.3, 4.5
 */
async function lockRate(userId, amountUsdc) {
    const marketRate = await getCachedMarketRate();
    const platformRate = applySpread(marketRate, env_1.config.fxSpread);
    const usdc = parseFloat(amountUsdc);
    const rate = parseFloat(platformRate);
    const amountNgn = (Math.floor(usdc * rate * 100) / 100).toString();
    const lockId = (0, uuid_1.v4)();
    const expiresAt = new Date(Date.now() + keys_1.REDIS_TTL.RATE_LOCK * 1000);
    const lockedRate = {
        lockId,
        userId,
        platformRate,
        amountUsdc,
        amountNgn,
        expiresAt,
    };
    await client_1.redis.set(keys_1.REDIS_KEYS.RATE_LOCK(lockId), JSON.stringify(lockedRate), 'EX', keys_1.REDIS_TTL.RATE_LOCK);
    return lockedRate;
}
/**
 * Retrieve a locked rate by lockId. Returns null if expired or not found.
 */
async function getLockedRate(lockId) {
    const cached = await client_1.redis.get(keys_1.REDIS_KEYS.RATE_LOCK(lockId));
    if (!cached)
        return null;
    const parsed = JSON.parse(cached);
    return { ...parsed, expiresAt: new Date(parsed.expiresAt) };
}
//# sourceMappingURL=fxEngine.js.map