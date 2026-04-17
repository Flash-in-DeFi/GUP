/**
 * Start the Stellar Horizon SSE stream listener.
 * Streams all payment operations for the platform address.
 * Persists the cursor on each event for restart recovery.
 */
export declare function startTransactionListener(): Promise<() => void>;
//# sourceMappingURL=transactionListener.d.ts.map