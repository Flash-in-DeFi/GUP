"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDepositEvent = handleDepositEvent;
const env_1 = require("../config/env");
const pool_1 = require("../db/pool");
const walletService_1 = require("../wallet/walletService");
/**
 * Handle an incoming Stellar payment operation.
 *
 * Flow:
 * 1. Ignore non-USDC assets
 * 2. Fetch parent transaction to extract memo
 * 3. Look up user by memo_id
 * 4. Check tx_hash idempotency
 * 5a. Valid: credit wallet + insert Transaction + Ledger entry (single DB tx)
 * 5b. Invalid memo: insert manual_recovery record + alert
 */
async function handleDepositEvent(payment) {
    // Only handle payment operations (type = 'payment')
    if (payment.type !== 'payment')
        return;
    // Validate asset is USDC with the correct issuer
    const asset = payment.asset_type === 'native'
        ? null
        : { code: payment.asset_code, issuer: payment.asset_issuer };
    if (!asset || asset.code !== 'USDC' || asset.issuer !== env_1.config.usdcIssuer) {
        return;
    }
    const amount = payment.amount;
    const txHash = payment.transaction_hash;
    // Fetch the parent transaction to get the memo
    const txResponse = await payment.transaction();
    const memo = txResponse.memo ?? null;
    // Idempotency: skip if already processed
    const existing = await pool_1.pool.query(`SELECT id FROM transactions WHERE tx_hash = $1`, [txHash]);
    if (existing.rows.length > 0) {
        console.log(`[DepositHandler] Skipping duplicate tx_hash: ${txHash}`);
        return;
    }
    // Look up user by memo_id
    const userResult = await pool_1.pool.query(`SELECT id FROM users WHERE memo_id = $1`, [memo]);
    if (userResult.rows.length === 0) {
        // Invalid or missing memo — flag for manual recovery
        await handleInvalidMemo(txHash, amount, memo);
        return;
    }
    const userId = userResult.rows[0].id;
    // Process valid deposit in a single DB transaction
    const dbClient = await pool_1.pool.connect();
    try {
        await dbClient.query('BEGIN');
        // Insert Transaction record first to get its ID
        const txRecord = await dbClient.query(`INSERT INTO transactions (user_id, type, amount, asset, status, tx_hash)
       VALUES ($1, 'deposit', $2, 'USDC', 'completed', $3)
       RETURNING id`, [userId, amount, txHash]);
        const transactionId = txRecord.rows[0].id;
        // Credit wallet + write Ledger entry (within same DB transaction)
        await (0, walletService_1.credit)(userId, amount, transactionId, dbClient);
        await dbClient.query('COMMIT');
        console.log(`[DepositHandler] Credited ${amount} USDC to user ${userId} (tx: ${txHash})`);
    }
    catch (err) {
        await dbClient.query('ROLLBACK');
        console.error(`[DepositHandler] Failed to process deposit ${txHash}:`, err);
        throw err;
    }
    finally {
        dbClient.release();
    }
}
/**
 * Record an unmatched deposit for manual recovery and alert operators.
 */
async function handleInvalidMemo(txHash, amount, memo) {
    await pool_1.pool.query(`INSERT INTO manual_recovery (tx_hash, amount, memo)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`, [txHash, amount, memo]);
    console.error(`[DepositHandler] ALERT: Unmatched deposit — tx_hash=${txHash}, amount=${amount}, memo=${memo ?? 'none'}`);
}
//# sourceMappingURL=depositHandler.js.map