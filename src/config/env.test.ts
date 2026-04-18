/**
 * Smoke test: verify config loader throws on missing required vars
 * and returns defaults for optional vars.
 */

describe('config/env', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when a required env var is missing', () => {
    delete process.env.DATABASE_URL;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(() => require('./env')).toThrow('Missing required environment variable: DATABASE_URL');
  });

  it('loads successfully when all required vars are set', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = 'test-secret';
    process.env.PLATFORM_STELLAR_ADDRESS = 'GABC';
    process.env.PLATFORM_STELLAR_SECRET = 'SABC';
    process.env.GAS_SPONSOR_ADDRESS = 'GDEF';
    process.env.GAS_SPONSOR_SECRET = 'SDEF';
    process.env.USDC_ISSUER = 'GISSUER';
    process.env.FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK-test';
    process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK-test';
    process.env.FLUTTERWAVE_ENCRYPTION_KEY = 'enc-key';
    process.env.FLUTTERWAVE_WEBHOOK_SECRET = 'webhook-secret';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { config } = require('./env');
    expect(config.databaseUrl).toBe('postgresql://localhost/test');
    expect(config.fxSpread).toBe(0.01); // default
    expect(config.minXlmReserve).toBe(100); // default
  });
});
