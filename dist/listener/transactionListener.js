"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTransactionListener = startTransactionListener;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const env_1 = require("../config/env");
const client_1 = require("../redis/client");
const keys_1 = require("../redis/keys");
const pool_1 = require("../db/pool");
const depositHandler_1 = require("./depositHandler");
const LISTENER_CURSOR_DB_KEY = 'listener:cursor';
/**
 * Persist the paging_token cursor to Redis (primary) and DB (fallback).
 */
async function saveCursor(pagingToken) {
    await client_1.redis.set(keys_1.REDIS_KEYS.LISTENER_CURSOR, pagingToken);
    // DB fallback — upsert into listener_state
    await pool_1.pool.query(`INSERT INTO listener_state (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [LISTENER_CURSOR_DB_KEY, pagingToken]);
}
/**
 * Load the last saved cursor from Redis, falling back to the DB.
 * Returns 'now' if no cursor is found (start from current tip).
 */
async function loadCursor() {
    const redisCursor = await client_1.redis.get(keys_1.REDIS_KEYS.LISTENER_CURSOR);
    if (redisCursor)
        return redisCursor;
    const result = await pool_1.pool.query(`SELECT value FROM listener_state WHERE key = $1`, [LISTENER_CURSOR_DB_KEY]);
    return result.rows[0]?.value ?? 'now';
}
/**
 * Start the Stellar Horizon SSE stream listener.
 * Streams all payment operations for the platform address.
 * Persists the cursor on each event for restart recovery.
 */
async function startTransactionListener() {
    const server = new stellar_sdk_1.Horizon.Server(env_1.config.stellarHorizonUrl);
    const cursor = await loadCursor();
    console.log(`[TransactionListener] Starting from cursor: ${cursor}`);
    // The SDK types declare onmessage as receiving CollectionPage<T>, but at
    // runtime the SSE stream delivers individual operation records. We cast via
    // unknown to bridge the type gap.
    const stopStream = server
        .payments()
        .forAccount(env_1.config.platformStellarAddress)
        .cursor(cursor)
        .stream({
        onmessage: async (record) => {
            const operation = record;
            try {
                await saveCursor(operation.paging_token);
                await (0, depositHandler_1.handleDepositEvent)(operation);
            }
            catch (err) {
                console.error('[TransactionListener] Error processing payment:', err);
            }
        },
        onerror: (_event) => {
            console.error('[TransactionListener] Stream error');
        },
    });
    console.log('[TransactionListener] Listening for deposits...');
    return stopStream;
}
//# sourceMappingURL=transactionListener.js.map