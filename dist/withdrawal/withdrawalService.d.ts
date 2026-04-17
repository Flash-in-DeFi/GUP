import { LockedRate } from '../fx/fxEngine';
export interface WithdrawRequest {
    amountUsdc: string;
    lockId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
}
export interface WithdrawalRecord {
    id: string;
    userId: string;
    amountUsdc: string;
    amountNgn: string;
    fxRate: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    status: 'pending' | 'queued' | 'completed' | 'failed';
    flutterwaveRef: string | null;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Validate a withdrawal request.
 * Checks KYC, daily limit, locked rate, and balance.
 * Requirements: 5.1, 5.7, 5.8, 10.1
 */
export declare function validateWithdrawal(userId: string, req: WithdrawRequest): Promise<LockedRate>;
/**
 * Initiate a withdrawal: validate, debit wallet, create Withdrawal + Ledger records.
 * Enqueues async Flutterwave payout.
 * Requirements: 5.3
 */
export declare function initiateWithdrawal(userId: string, req: WithdrawRequest): Promise<WithdrawalRecord>;
/**
 * Submit payout to Flutterwave Transfer API.
 * Stores flutterwave_ref on the Withdrawal record.
 * Requirements: 5.4
 */
export declare function submitFlutterwavePayout(withdrawal: WithdrawalRecord): Promise<void>;
/**
 * Send a simple email notification to the user.
 * Uses nodemailer if configured, otherwise logs to console.
 * Requirements: 7.4, 8.3
 */
export declare function sendUserEmailNotification(userId: string, subject: string, message: string): Promise<void>;
/**
 * Retry a failed Flutterwave payout with exponential backoff.
 * Delays: 1s, 2s, 4s (3 attempts total).
 * After all retries fail: refund wallet, set status="failed", write Ledger entry, notify user.
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export declare function retryWithdrawal(withdrawalId: string): Promise<void>;
/**
 * Refund a failed withdrawal: credit wallet, set status="failed", write Ledger entry, notify user.
 * Requirements: 7.2, 7.3, 7.4
 */
export declare function refundWithdrawal(withdrawal: WithdrawalRecord): Promise<void>;
/**
 * Handle Flutterwave webhook: verify signature, update status, write Ledger entry.
 * Requirements: 5.5
 */
export declare function handleFlutterwaveWebhook(signature: string, body: Record<string, unknown>): Promise<void>;
/**
 * Get a withdrawal record by ID for the authenticated user.
 * Requirements: 5.6
 */
export declare function getWithdrawal(withdrawalId: string, userId: string): Promise<WithdrawalRecord>;
//# sourceMappingURL=withdrawalService.d.ts.map