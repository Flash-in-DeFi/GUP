export interface FXRate {
    marketRate: string;
    platformRate: string;
    spread: number;
    fetchedAt: Date;
}
export interface LockedRate {
    lockId: string;
    userId: string;
    platformRate: string;
    amountUsdc: string;
    amountNgn: string;
    expiresAt: Date;
}
/**
 * Get the current FX rate (market + platform rate with spread applied).
 * Caches in Redis for 60s.
 * Requirements: 4.1, 4.2
 */
export declare function getCurrentRate(): Promise<FXRate>;
/**
 * Lock the current FX rate for a user's withdrawal.
 * Stores in Redis with 45s TTL.
 * amountNgn = floor(amountUsdc * platformRate * 100) / 100
 * Requirements: 4.3, 4.5
 */
export declare function lockRate(userId: string, amountUsdc: string): Promise<LockedRate>;
/**
 * Retrieve a locked rate by lockId. Returns null if expired or not found.
 */
export declare function getLockedRate(lockId: string): Promise<LockedRate | null>;
//# sourceMappingURL=fxEngine.d.ts.map