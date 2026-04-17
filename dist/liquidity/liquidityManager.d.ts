import { WithdrawalRecord } from '../withdrawal/withdrawalService';
/**
 * Get the current NGN liquidity pool balance.
 * The pool balance is tracked as the sum of completed NGN payouts subtracted
 * from the configured pool ceiling, or read from a dedicated config/table.
 * For MVP, we use a configurable env var NGN_LIQUIDITY_POOL as the available balance.
 * Requirements: 8.1
 */
export declare function getLiquidityPoolBalance(): number;
/**
 * Check whether the NGN liquidity pool has enough balance to cover a payout.
 * Requirements: 8.1
 */
export declare function hasLiquidity(amountNgn: string): boolean;
/**
 * Submit a withdrawal to Flutterwave if liquidity is available,
 * otherwise set the withdrawal status to "queued".
 * Requirements: 8.1
 */
export declare function submitOrQueue(withdrawal: WithdrawalRecord): Promise<void>;
/**
 * FIFO queue processor — runs every 60 seconds.
 * Fetches the oldest "queued" withdrawals and processes them in created_at order
 * when liquidity is available. Notifies users when their withdrawal is processed.
 * Requirements: 8.2, 8.3
 */
export declare function processQueuedWithdrawals(): Promise<void>;
/**
 * Start the background FIFO queue processor.
 * Polls every 60 seconds.
 * Requirements: 8.2
 */
export declare function startLiquidityQueueProcessor(): NodeJS.Timeout;
//# sourceMappingURL=liquidityManager.d.ts.map