/**
 * Redis key constants and TTL values.
 */

export const REDIS_KEYS = {
  /** Current USDC/NGN market rate. TTL: 60s */
  FX_RATE: 'rate:usdc_ngn',

  /** Locked FX rate for a specific withdrawal. TTL: 45s */
  RATE_LOCK: (lockId: string) => `rate_lock:${lockId}`,

  /** Stellar Horizon SSE cursor (paging_token) */
  LISTENER_CURSOR: 'listener:cursor',
} as const;

export const REDIS_TTL = {
  /** FX rate cache TTL in seconds */
  FX_RATE: 60,

  /** Rate lock TTL in seconds (within 30–60s requirement) */
  RATE_LOCK: 45,
} as const;
