import { PoolClient } from 'pg';
import { pool } from '../db/pool';

export interface WalletBalance {
  asset: string;
  balance: string;
}

/**
 * Credit a user's wallet balance atomically within a DB transaction.
 * Uses SELECT ... FOR UPDATE to prevent race conditions.
 * Writes a Ledger entry for every credit.
 *
 * @param userId - The user whose wallet to credit
 * @param amount - Amount to credit (as a decimal string)
 * @param referenceId - UUID of the related transaction record
 * @param dbClient - An active pg PoolClient with an open transaction
 */
export async function credit(
  userId: string,
  amount: string,
  referenceId: string,
  dbClient: PoolClient
): Promise<void> {
  // Lock the wallet row for this user
  const walletResult = await dbClient.query<{ balance: string }>(
    `SELECT balance FROM wallets WHERE user_id = $1 AND asset = 'USDC' FOR UPDATE`,
    [userId]
  );

  if (walletResult.rows.length === 0) {
    throw new Error(`Wallet not found for user ${userId}`);
  }

  const updatedResult = await dbClient.query<{ balance: string }>(
    `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 AND asset = 'USDC' RETURNING balance`,
    [amount, userId]
  );

  const balanceAfter = updatedResult.rows[0].balance;

  await dbClient.query(
    `INSERT INTO ledger (user_id, event_type, amount, asset, reference_id, balance_after)
     VALUES ($1, 'credit', $2, 'USDC', $3, $4)`,
    [userId, amount, referenceId, balanceAfter]
  );
}

/**
 * Debit a user's wallet balance atomically within a DB transaction.
 * Uses SELECT ... FOR UPDATE to prevent race conditions.
 * Writes a Ledger entry for every debit.
 *
 * @param userId - The user whose wallet to debit
 * @param amount - Amount to debit (as a decimal string)
 * @param referenceId - UUID of the related withdrawal record
 * @param dbClient - An active pg PoolClient with an open transaction
 */
export async function debit(
  userId: string,
  amount: string,
  referenceId: string,
  dbClient: PoolClient
): Promise<void> {
  // Lock the wallet row for this user
  const walletResult = await dbClient.query<{ balance: string }>(
    `SELECT balance FROM wallets WHERE user_id = $1 AND asset = 'USDC' FOR UPDATE`,
    [userId]
  );

  if (walletResult.rows.length === 0) {
    throw new Error(`Wallet not found for user ${userId}`);
  }

  const currentBalance = parseFloat(walletResult.rows[0].balance);
  const debitAmount = parseFloat(amount);

  if (debitAmount > currentBalance) {
    throw new Error('INSUFFICIENT_BALANCE');
  }

  const updatedResult = await dbClient.query<{ balance: string }>(
    `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND asset = 'USDC' RETURNING balance`,
    [amount, userId]
  );

  const balanceAfter = updatedResult.rows[0].balance;

  await dbClient.query(
    `INSERT INTO ledger (user_id, event_type, amount, asset, reference_id, balance_after)
     VALUES ($1, 'debit', $2, 'USDC', $3, $4)`,
    [userId, amount, referenceId, balanceAfter]
  );
}

/**
 * Get the current USDC balance for a user.
 */
export async function getBalance(userId: string): Promise<WalletBalance> {
  const result = await pool.query<{ asset: string; balance: string }>(
    `SELECT asset, balance FROM wallets WHERE user_id = $1 AND asset = 'USDC'`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Wallet not found for user ${userId}`);
  }

  return {
    asset: result.rows[0].asset,
    balance: result.rows[0].balance,
  };
}
