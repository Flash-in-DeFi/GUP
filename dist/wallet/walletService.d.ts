import { PoolClient } from 'pg';
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
export declare function credit(userId: string, amount: string, referenceId: string, dbClient: PoolClient): Promise<void>;
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
export declare function debit(userId: string, amount: string, referenceId: string, dbClient: PoolClient): Promise<void>;
/**
 * Get the current USDC balance for a user.
 */
export declare function getBalance(userId: string): Promise<WalletBalance>;
//# sourceMappingURL=walletService.d.ts.map