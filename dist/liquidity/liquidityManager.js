"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiquidityPoolBalance = getLiquidityPoolBalance;
exports.hasLiquidity = hasLiquidity;
exports.submitOrQueue = submitOrQueue;
exports.processQueuedWithdrawals = processQueuedWithdrawals;
exports.startLiquidityQueueProcessor = startLiquidityQueueProcessor;
const pool_1 = require("../db/pool");
const withdrawalService_1 = require("../withdrawal/withdrawalService");
const env_1 = require("../config/env");
/**
 * Get the current NGN liquidity pool balance.
 * The pool balance is tracked as the sum of completed NGN payouts subtracted
 * from the configured pool ceiling, or read from a dedicated config/table.
 * For MVP, we use a configurable env var NGN_LIQUIDITY_POOL as the available balance.
 * Requirements: 8.1
 */
function getLiquidityPoolBalance() {
    return env_1.config.ngnLiquidityPool;
}
/**
 * Check whether the NGN liquidity pool has enough balance to cover a payout.
 * Requirements: 8.1
 */
function hasLiquidity(amountNgn) {
    const required = parseFloat(amountNgn);
    const available = getLiquidityPoolBalance();
    return available >= required;
}
/**
 * Submit a withdrawal to Flutterwave if liquidity is available,
 * otherwise set the withdrawal status to "queued".
 * Requirements: 8.1
 */
async function submitOrQueue(withdrawal) {
    if (hasLiquidity(withdrawal.amountNgn)) {
        await (0, withdrawalService_1.submitFlutterwavePayout)(withdrawal);
        return;
    }
    // Insufficient liquidity — queue the withdrawal
    console.log(`[Liquidity] Insufficient NGN liquidity for withdrawal ${withdrawal.id}. Queuing.`);
    await pool_1.pool.query(`UPDATE withdrawals SET status = 'queued', updated_at = NOW() WHERE id = $1`, [withdrawal.id]);
}
/**
 * FIFO queue processor — runs every 60 seconds.
 * Fetches the oldest "queued" withdrawals and processes them in created_at order
 * when liquidity is available. Notifies users when their withdrawal is processed.
 * Requirements: 8.2, 8.3
 */
async function processQueuedWithdrawals() {
    const result = await pool_1.pool.query(`SELECT id, user_id, amount_usdc, amount_ngn, fx_rate, bank_code, account_number,
            account_name, status, flutterwave_ref, retry_count, created_at, updated_at
     FROM withdrawals
     WHERE status = 'queued'
     ORDER BY created_at ASC`);
    if (result.rows.length === 0)
        return;
    console.log(`[Liquidity] Processing ${result.rows.length} queued withdrawal(s).`);
    for (const row of result.rows) {
        if (!hasLiquidity(row.amount_ngn)) {
            console.log(`[Liquidity] Still insufficient liquidity. Stopping queue processing.`);
            break;
        }
        const withdrawal = {
            id: row.id,
            userId: row.user_id,
            amountUsdc: row.amount_usdc,
            amountNgn: row.amount_ngn,
            fxRate: row.fx_rate,
            bankCode: row.bank_code,
            accountNumber: row.account_number,
            accountName: row.account_name,
            status: row.status,
            flutterwaveRef: row.flutterwave_ref,
            retryCount: row.retry_count,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
        try {
            // Move to pending before submitting
            await pool_1.pool.query(`UPDATE withdrawals SET status = 'pending', updated_at = NOW() WHERE id = $1`, [withdrawal.id]);
            await (0, withdrawalService_1.submitFlutterwavePayout)(withdrawal);
            // Notify user that their queued withdrawal is now being processed
            await (0, withdrawalService_1.sendUserEmailNotification)(withdrawal.userId, 'Your Withdrawal Is Being Processed', `Your withdrawal of ${withdrawal.amountUsdc} USDC (${withdrawal.amountNgn} NGN) ` +
                `is now being processed. You will receive another notification once it completes.`);
            console.log(`[Liquidity] Queued withdrawal ${withdrawal.id} submitted successfully.`);
        }
        catch (err) {
            console.error(`[Liquidity] Failed to process queued withdrawal ${withdrawal.id}:`, err);
            // Revert to queued so it can be retried next cycle
            await pool_1.pool.query(`UPDATE withdrawals SET status = 'queued', updated_at = NOW() WHERE id = $1`, [withdrawal.id]);
        }
    }
}
/**
 * Start the background FIFO queue processor.
 * Polls every 60 seconds.
 * Requirements: 8.2
 */
function startLiquidityQueueProcessor() {
    console.log('[Liquidity] Queue processor started (60s interval).');
    return setInterval(() => {
        processQueuedWithdrawals().catch((err) => {
            console.error('[Liquidity] Queue processor error:', err);
        });
    }, 60000);
}
//# sourceMappingURL=liquidityManager.js.map