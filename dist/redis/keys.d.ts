/**
 * Redis key constants and TTL values.
 */
export declare const REDIS_KEYS: {
    /** Current USDC/NGN market rate. TTL: 60s */
    readonly FX_RATE: "rate:usdc_ngn";
    /** Locked FX rate for a specific withdrawal. TTL: 45s */
    readonly RATE_LOCK: (lockId: string) => string;
    /** Stellar Horizon SSE cursor (paging_token) */
    readonly LISTENER_CURSOR: "listener:cursor";
};
export declare const REDIS_TTL: {
    /** FX rate cache TTL in seconds */
    readonly FX_RATE: 60;
    /** Rate lock TTL in seconds (within 30–60s requirement) */
    readonly RATE_LOCK: 45;
};
//# sourceMappingURL=keys.d.ts.map