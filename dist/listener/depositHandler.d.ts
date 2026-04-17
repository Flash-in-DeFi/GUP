import { Horizon } from '@stellar/stellar-sdk';
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
export declare function handleDepositEvent(payment: Horizon.ServerApi.PaymentOperationRecord): Promise<void>;
//# sourceMappingURL=depositHandler.d.ts.map