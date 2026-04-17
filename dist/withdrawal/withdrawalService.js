"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWithdrawal = validateWithdrawal;
exports.initiateWithdrawal = initiateWithdrawal;
exports.submitFlutterwavePayout = submitFlutterwavePayout;
exports.sendUserEmailNotification = sendUserEmailNotification;
exports.retryWithdrawal = retryWithdrawal;
exports.refundWithdrawal = refundWithdrawal;
exports.handleFlutterwaveWebhook = handleFlutterwaveWebhook;
exports.getWithdrawal = getWithdrawal;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const client_1 = require("../redis/client");
const keys_1 = require("../redis/keys");
const walletService_1 = require("../wallet/walletService");
const env_1 = require("../config/env");
/**
 * Validate a withdrawal request.
 * Checks KYC, daily limit, locked rate, and balance.
 * Requirements: 5.1, 5.7, 5.8, 10.1
 */
async function validateWithdrawal(userId, req) {
    // 1. Check KYC status
    const userResult = await pool_1.pool.query(`SELECT kyc_status, daily_limit_usdc FROM users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
        throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    const { kyc_status, daily_limit_usdc } = userResult.rows[0];
    if (kyc_status !== 'approved') {
        throw Object.assign(new Error('KYC approval required to withdraw'), { statusCode: 403 });
    }
    // 2. Check daily withdrawal limit (rolling 24h)
    const dailyResult = await pool_1.pool.query(`SELECT COALESCE(SUM(amount_usdc), 0) AS total
     FROM withdrawals
     WHERE user_id = $1
       AND status NOT IN ('failed')
       AND created_at >= NOW() - INTERVAL '24 hours'`, [userId]);
    const dailyUsed = parseFloat(dailyResult.rows[0].total);
    const dailyLimit = parseFloat(daily_limit_usdc);
    const requested = parseFloat(req.amountUsdc);
    if (dailyUsed + requested > dailyLimit) {
        throw Object.assign(new Error(`Daily withdrawal limit of ${dailyLimit} USDC exceeded`), { statusCode: 422 });
    }
    // 3. Fetch locked rate from Redis
    const cached = await client_1.redis.get(keys_1.REDIS_KEYS.RATE_LOCK(req.lockId));
    if (!cached) {
        throw Object.assign(new Error('Rate lock expired or not found'), { statusCode: 422 });
    }
    const lockedRate = JSON.parse(cached);
    // Ensure the lock belongs to this user
    if (lockedRate.userId !== userId) {
        throw Object.assign(new Error('Rate lock does not belong to this user'), { statusCode: 403 });
    }
    // 4. Check wallet balance
    const walletResult = await pool_1.pool.query(`SELECT balance FROM wallets WHERE user_id = $1 AND asset = 'USDC'`, [userId]);
    if (walletResult.rows.length === 0) {
        throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });
    }
    const balance = parseFloat(walletResult.rows[0].balance);
    if (requested > balance) {
        throw Object.assign(new Error('Insufficient USDC balance'), { statusCode: 422 });
    }
    return lockedRate;
}
/**
 * Initiate a withdrawal: validate, debit wallet, create Withdrawal + Ledger records.
 * Enqueues async Flutterwave payout.
 * Requirements: 5.3
 */
async function initiateWithdrawal(userId, req) {
    const lockedRate = await validateWithdrawal(userId, req);
    const dbClient = await pool_1.pool.connect();
    let withdrawalId;
    try {
        await dbClient.query('BEGIN');
        withdrawalId = (0, uuid_1.v4)();
        // Debit wallet (also writes ledger entry)
        await (0, walletService_1.debit)(userId, req.amountUsdc, withdrawalId, dbClient);
        // Insert Withdrawal record
        const result = await dbClient.query(`INSERT INTO withdrawals
         (id, user_id, amount_usdc, amount_ngn, fx_rate, bank_code, account_number, account_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING
         id, user_id AS "userId", amount_usdc AS "amountUsdc", amount_ngn AS "amountNgn",
         fx_rate AS "fxRate", bank_code AS "bankCode", account_number AS "accountNumber",
         account_name AS "accountName", status, flutterwave_ref AS "flutterwaveRef",
         retry_count AS "retryCount", created_at AS "createdAt", updated_at AS "updatedAt"`, [
            withdrawalId,
            userId,
            req.amountUsdc,
            lockedRate.amountNgn,
            lockedRate.platformRate,
            req.bankCode,
            req.accountNumber,
            req.accountName,
        ]);
        await dbClient.query('COMMIT');
        const withdrawal = result.rows[0];
        // Async: submit to Flutterwave (or queue if liquidity is low); on failure, retry with exponential backoff
        setImmediate(() => {
            Promise.resolve().then(() => __importStar(require('../liquidity/liquidityManager'))).then(({ submitOrQueue }) => {
                submitOrQueue(withdrawal).catch(() => {
                    retryWithdrawal(withdrawalId).catch((err) => {
                        console.error(`[Withdrawal] Retry logic failed for ${withdrawalId}:`, err);
                    });
                });
            });
        });
        return withdrawal;
    }
    catch (err) {
        await dbClient.query('ROLLBACK');
        throw err;
    }
    finally {
        dbClient.release();
    }
}
/**
 * Submit payout to Flutterwave Transfer API.
 * Stores flutterwave_ref on the Withdrawal record.
 * Requirements: 5.4
 */
async function submitFlutterwavePayout(withdrawal) {
    const reference = `offramp-${withdrawal.id}`;
    const payload = {
        account_bank: withdrawal.bankCode,
        account_number: withdrawal.accountNumber,
        amount: parseFloat(withdrawal.amountNgn),
        narration: `USD to NGN withdrawal`,
        currency: 'NGN',
        reference,
        beneficiary_name: withdrawal.accountName,
    };
    const res = await fetch('https://api.flutterwave.com/v3/transfers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env_1.config.flutterwaveSecretKey}`,
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.status !== 'success') {
        throw new Error(`Flutterwave transfer failed: ${data.message}`);
    }
    const flutterwaveRef = data.data?.id?.toString() ?? reference;
    await pool_1.pool.query(`UPDATE withdrawals SET flutterwave_ref = $1, updated_at = NOW() WHERE id = $2`, [flutterwaveRef, withdrawal.id]);
}
/**
 * Send a simple email notification to the user.
 * Uses nodemailer if configured, otherwise logs to console.
 * Requirements: 7.4, 8.3
 */
async function sendUserEmailNotification(userId, subject, message) {
    try {
        const userResult = await pool_1.pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
        if (userResult.rows.length === 0)
            return;
        const { email } = userResult.rows[0];
        // Log the notification — in production, replace with a real email provider
        console.log(`[Email] To: ${email} | Subject: ${subject} | Body: ${message}`);
    }
    catch (err) {
        console.error('[Email] Failed to send notification:', err);
    }
}
/**
 * Retry a failed Flutterwave payout with exponential backoff.
 * Delays: 1s, 2s, 4s (3 attempts total).
 * After all retries fail: refund wallet, set status="failed", write Ledger entry, notify user.
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
async function retryWithdrawal(withdrawalId) {
    const MAX_RETRIES = 3;
    const BACKOFF_DELAYS_MS = [1000, 2000, 4000];
    const result = await pool_1.pool.query(`SELECT id, user_id, amount_usdc, amount_ngn, fx_rate, bank_code, account_number,
            account_name, status, flutterwave_ref, retry_count, created_at, updated_at
     FROM withdrawals WHERE id = $1`, [withdrawalId]);
    if (result.rows.length === 0) {
        throw new Error(`Withdrawal ${withdrawalId} not found`);
    }
    const row = result.rows[0];
    if (row.status === 'completed' || row.status === 'failed') {
        console.log(`[Retry] Withdrawal ${withdrawalId} already in terminal state: ${row.status}`);
        return;
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
    let attempt = withdrawal.retryCount;
    while (attempt < MAX_RETRIES) {
        const delayMs = BACKOFF_DELAYS_MS[attempt] ?? 4000;
        console.log(`[Retry] Withdrawal ${withdrawalId} attempt ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        // Increment retry_count before attempting
        await pool_1.pool.query(`UPDATE withdrawals SET retry_count = retry_count + 1, updated_at = NOW() WHERE id = $1`, [withdrawalId]);
        attempt++;
        try {
            await submitFlutterwavePayout(withdrawal);
            console.log(`[Retry] Withdrawal ${withdrawalId} succeeded on attempt ${attempt}`);
            return; // success — webhook will handle status update
        }
        catch (err) {
            console.error(`[Retry] Withdrawal ${withdrawalId} attempt ${attempt} failed:`, err);
        }
    }
    // All retries exhausted — refund and mark failed
    console.log(`[Retry] Withdrawal ${withdrawalId} exhausted all retries. Issuing refund.`);
    await refundWithdrawal(withdrawal);
}
/**
 * Refund a failed withdrawal: credit wallet, set status="failed", write Ledger entry, notify user.
 * Requirements: 7.2, 7.3, 7.4
 */
async function refundWithdrawal(withdrawal) {
    const dbClient = await pool_1.pool.connect();
    try {
        await dbClient.query('BEGIN');
        // Credit wallet back (also writes ledger entry via walletService.credit)
        await (0, walletService_1.credit)(withdrawal.userId, withdrawal.amountUsdc, withdrawal.id, dbClient);
        // Set withdrawal status to "failed"
        await dbClient.query(`UPDATE withdrawals SET status = 'failed', updated_at = NOW() WHERE id = $1`, [withdrawal.id]);
        await dbClient.query('COMMIT');
    }
    catch (err) {
        await dbClient.query('ROLLBACK');
        throw err;
    }
    finally {
        dbClient.release();
    }
    // Notify user outside the DB transaction (non-critical)
    await sendUserEmailNotification(withdrawal.userId, 'Withdrawal Failed — Funds Returned', `Your withdrawal of ${withdrawal.amountUsdc} USDC has failed after multiple attempts. ` +
        `The full amount has been returned to your wallet.`);
}
/**
 * Handle Flutterwave webhook: verify signature, update status, write Ledger entry.
 * Requirements: 5.5
 */
async function handleFlutterwaveWebhook(signature, body) {
    // Verify webhook signature using HMAC SHA-256
    const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
    const expectedHash = crypto
        .createHmac('sha256', env_1.config.flutterwaveWebhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');
    if (signature !== expectedHash) {
        throw Object.assign(new Error('Invalid webhook signature'), { statusCode: 401 });
    }
    const event = body;
    if (event.event !== 'transfer.completed') {
        // Not a transfer completion event — ignore
        return;
    }
    const reference = event.data?.reference;
    if (!reference)
        return;
    // Extract withdrawal ID from reference (format: "offramp-{uuid}")
    const withdrawalId = reference.replace(/^offramp-/, '');
    const withdrawalResult = await pool_1.pool.query(`SELECT id, user_id, amount_usdc, status FROM withdrawals WHERE id = $1`, [withdrawalId]);
    if (withdrawalResult.rows.length === 0)
        return;
    const withdrawal = withdrawalResult.rows[0];
    if (withdrawal.status === 'completed')
        return; // already processed
    const dbClient = await pool_1.pool.connect();
    try {
        await dbClient.query('BEGIN');
        await dbClient.query(`UPDATE withdrawals SET status = 'completed', updated_at = NOW() WHERE id = $1`, [withdrawalId]);
        // Get current balance for ledger
        const walletResult = await dbClient.query(`SELECT balance FROM wallets WHERE user_id = $1 AND asset = 'USDC' FOR UPDATE`, [withdrawal.user_id]);
        const balanceAfter = walletResult.rows[0]?.balance ?? '0';
        await dbClient.query(`INSERT INTO ledger (user_id, event_type, amount, asset, reference_id, balance_after)
       VALUES ($1, 'debit', $2, 'USDC', $3, $4)`, [withdrawal.user_id, withdrawal.amount_usdc, withdrawalId, balanceAfter]);
        await dbClient.query('COMMIT');
    }
    catch (err) {
        await dbClient.query('ROLLBACK');
        throw err;
    }
    finally {
        dbClient.release();
    }
}
/**
 * Get a withdrawal record by ID for the authenticated user.
 * Requirements: 5.6
 */
async function getWithdrawal(withdrawalId, userId) {
    const result = await pool_1.pool.query(`SELECT
       id, user_id AS "userId", amount_usdc AS "amountUsdc", amount_ngn AS "amountNgn",
       fx_rate AS "fxRate", bank_code AS "bankCode", account_number AS "accountNumber",
       account_name AS "accountName", status, flutterwave_ref AS "flutterwaveRef",
       retry_count AS "retryCount", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM withdrawals WHERE id = $1`, [withdrawalId]);
    if (result.rows.length === 0) {
        throw Object.assign(new Error('Withdrawal not found'), { statusCode: 404 });
    }
    const withdrawal = result.rows[0];
    if (withdrawal.userId !== userId) {
        throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }
    return withdrawal;
}
//# sourceMappingURL=withdrawalService.js.map