import express from 'express';
import { config } from './config/env';
import authRouter from './auth/authRouter';
import { walletRouter, depositAddressRouter } from './wallet/walletRouter';
import { fxRouter } from './fx/fxRouter';
import { withdrawalRouter } from './withdrawal/withdrawalRouter';
import { transactionRouter } from './transactions/transactionRouter';
import { startTransactionListener } from './listener/transactionListener';
import { startLiquidityQueueProcessor } from './liquidity/liquidityManager';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.use('/auth', authRouter);

// Wallet routes
app.use('/wallet', walletRouter);
app.use('/deposit-address', depositAddressRouter);

// FX routes
app.use('/rates', fxRouter);

// Withdrawal routes
app.use('/withdrawal', withdrawalRouter);

// Transaction history routes
app.use('/transactions', transactionRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start the Stellar transaction listener as a background service
  startTransactionListener().catch((err) => {
    console.error('[TransactionListener] Failed to start:', err);
  });
  // Start the NGN liquidity queue processor
  startLiquidityQueueProcessor();
});

export default app;
