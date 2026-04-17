import { pool } from '../db/pool';
import { config } from '../config/env';

/**
 * Check if a user is currently suspended.
 * Returns true if the user's suspended_until is in the future.
 */
export async function isUserSuspended(userId: string): Promise<boolean> {
  const result = await pool.query<{ suspended_until: Date | null }>(
    `SELECT suspended_until FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return false;
  const { suspended_until } = result.rows[0];
  return suspended_until !== null && suspended_until > new Date();
}

/**
 * Detect suspicious withdrawal patterns and flag the account if triggered.
 *
 * Rule: if the user has made more than N withdrawals above threshold T USDC
 * in the last 1 hour, suspend the account for FRAUD_SUSPENSION_MINUTES minutes,
 * log an alert, and throw a 403 error rejecting the current withdrawal.
 *
 * N = FRAUD_WITHDRAWAL_COUNT_THRESHOLD (default 5)
 * T = FRAUD_WITHDRAWAL_AMOUNT_THRESHOLD (default 500 USDC)
 *
 * Requirements: 10.5
 */
export async function checkSuspiciousPattern(userId: string, _amountUsdc: string): Promise<void> {
  // First check if already suspended
  if (await isUserSuspended(userId)) {
    throw Object.assign(
      new Error('Account is temporarily suspended due to suspicious activity'),
      { statusCode: 403 }
    );
  }

  const N = config.fraudWithdrawalCountThreshold;
  const T = config.fraudWithdrawalAmountThreshold;

  // Count withdrawals above threshold T in the last 1 hour (exclude failed)
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM withdrawals
     WHERE user_id = $1
       AND amount_usdc > $2
       AND status NOT IN ('failed')
       AND created_at >= NOW() - INTERVAL '1 hour'`,
    [userId, T]
  );

  const recentCount = parseInt(result.rows[0].count, 10);

  // The current withdrawal also counts — if recentCount >= N, the pattern is triggered
  if (recentCount >= N) {
    const suspendUntil = new Date(
      Date.now() + config.fraudSuspensionMinutes * 60 * 1000
    );

    await pool.query(
      `UPDATE users SET suspended_until = $1 WHERE id = $2`,
      [suspendUntil, userId]
    );

    console.error(
      `[FraudDetection] ALERT: User ${userId} flagged for suspicious activity. ` +
        `${recentCount} withdrawals above ${T} USDC in the last hour. ` +
        `Account suspended until ${suspendUntil.toISOString()}.`
    );

    throw Object.assign(
      new Error('Account flagged for suspicious activity and temporarily suspended'),
      { statusCode: 403 }
    );
  }
}
