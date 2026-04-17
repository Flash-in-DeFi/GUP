/**
 * Environment configuration loader.
 * Reads and validates all required environment variables.
 */
export declare const config: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly databaseUrl: string;
    readonly redisUrl: string;
    readonly jwtSecret: string;
    readonly jwtExpiresIn: string;
    readonly stellarNetwork: string;
    readonly stellarHorizonUrl: string;
    readonly platformStellarAddress: string;
    readonly platformStellarSecret: string;
    readonly gasSponsorAddress: string;
    readonly gasSponsorSecret: string;
    readonly usdcIssuer: string;
    readonly flutterwavePublicKey: string;
    readonly flutterwaveSecretKey: string;
    readonly flutterwaveEncryptionKey: string;
    readonly flutterwaveWebhookSecret: string;
    readonly fxSpread: number;
    readonly minXlmReserve: number;
    readonly fraudWithdrawalCountThreshold: number;
    readonly fraudWithdrawalAmountThreshold: number;
    readonly fraudSuspensionMinutes: number;
    readonly ngnLiquidityPool: number;
};
export type Config = typeof config;
//# sourceMappingURL=env.d.ts.map