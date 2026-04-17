/**
 * Environment configuration loader.
 * Reads and validates all required environment variables.
 */
import * as dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function optionalNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be a number`);
  return parsed;
}

export const config = {
  // App
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  // Database
  databaseUrl: required('DATABASE_URL'),

  // Redis
  redisUrl: required('REDIS_URL'),

  // JWT
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '24h'),

  // Stellar
  stellarNetwork: optional('STELLAR_NETWORK', 'testnet'),
  stellarHorizonUrl: optional('STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org'),
  platformStellarAddress: required('PLATFORM_STELLAR_ADDRESS'),
  platformStellarSecret: required('PLATFORM_STELLAR_SECRET'),
  gasSponsorAddress: required('GAS_SPONSOR_ADDRESS'),
  gasSponsorSecret: required('GAS_SPONSOR_SECRET'),
  usdcIssuer: required('USDC_ISSUER'),

  // Flutterwave
  flutterwavePublicKey: required('FLUTTERWAVE_PUBLIC_KEY'),
  flutterwaveSecretKey: required('FLUTTERWAVE_SECRET_KEY'),
  flutterwaveEncryptionKey: required('FLUTTERWAVE_ENCRYPTION_KEY'),
  flutterwaveWebhookSecret: required('FLUTTERWAVE_WEBHOOK_SECRET'),

  // FX
  fxSpread: optionalNumber('FX_SPREAD', 0.01),

  // Gas Sponsor
  minXlmReserve: optionalNumber('MIN_XLM_RESERVE', 100),

  // Fraud Detection
  fraudWithdrawalCountThreshold: optionalNumber('FRAUD_WITHDRAWAL_COUNT_THRESHOLD', 5),
  fraudWithdrawalAmountThreshold: optionalNumber('FRAUD_WITHDRAWAL_AMOUNT_THRESHOLD', 500),
  fraudSuspensionMinutes: optionalNumber('FRAUD_SUSPENSION_MINUTES', 60),

  // Liquidity
  ngnLiquidityPool: optionalNumber('NGN_LIQUIDITY_POOL', 10_000_000),
} as const;

export type Config = typeof config;
