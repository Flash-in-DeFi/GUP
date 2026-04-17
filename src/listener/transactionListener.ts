import { Horizon } from '@stellar/stellar-sdk';
import { config } from '../config/env';
import { redis } from '../redis/client';
import { REDIS_KEYS } from '../redis/keys';
import { pool } from '../db/pool';
import { handleDepositEvent } from './depositHandler';

const LISTENER_CURSOR_DB_KEY = 'listener:cursor';

/**
 * Persist the paging_token cursor to Redis (primary) and DB (fallback).
 */
async function saveCursor(pagingToken: string): Promise<void> {
  await redis.set(REDIS_KEYS.LISTENER_CURSOR, pagingToken);

  // DB fallback — upsert into listener_state
  await pool.query(
    `INSERT INTO listener_state (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [LISTENER_CURSOR_DB_KEY, pagingToken]
  );
}

/**
 * Load the last saved cursor from Redis, falling back to the DB.
 * Returns 'now' if no cursor is found (start from current tip).
 */
async function loadCursor(): Promise<string> {
  const redisCursor = await redis.get(REDIS_KEYS.LISTENER_CURSOR);
  if (redisCursor) return redisCursor;

  const result = await pool.query<{ value: string }>(
    `SELECT value FROM listener_state WHERE key = $1`,
    [LISTENER_CURSOR_DB_KEY]
  );

  return result.rows[0]?.value ?? 'now';
}

/**
 * Start the Stellar Horizon SSE stream listener.
 * Streams all payment operations for the platform address.
 * Persists the cursor on each event for restart recovery.
 */
export async function startTransactionListener(): Promise<() => void> {
  const server = new Horizon.Server(config.stellarHorizonUrl);
  const cursor = await loadCursor();

  console.log(`[TransactionListener] Starting from cursor: ${cursor}`);

  // The SDK types declare onmessage as receiving CollectionPage<T>, but at
  // runtime the SSE stream delivers individual operation records. We cast via
  // unknown to bridge the type gap.
  const stopStream = server
    .payments()
    .forAccount(config.platformStellarAddress)
    .cursor(cursor)
    .stream({
      onmessage: async (record: unknown) => {
        const operation = record as Horizon.ServerApi.PaymentOperationRecord;
        try {
          await saveCursor(operation.paging_token);
          await handleDepositEvent(operation);
        } catch (err) {
          console.error('[TransactionListener] Error processing payment:', err);
        }
      },
      onerror: (_event: MessageEvent) => {
        console.error('[TransactionListener] Stream error');
      },
    });

  console.log('[TransactionListener] Listening for deposits...');
  return stopStream;
}
