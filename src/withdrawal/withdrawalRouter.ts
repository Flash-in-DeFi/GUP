import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth/authMiddleware';
import {
  initiateWithdrawal,
  getWithdrawal,
  handleFlutterwaveWebhook,
  WithdrawRequest,
} from './withdrawalService';

export const withdrawalRouter = Router();

/**
 * POST /withdrawal/webhook/flutterwave
 * Flutterwave webhook handler — verifies signature, updates status, writes Ledger entry.
 * Registered first so it takes precedence over /:id param route.
 * Requirements: 5.5
 */
withdrawalRouter.post('/webhook/flutterwave', async (req: Request, res: Response) => {
  const signature = req.headers['verif-hash'] as string;

  if (!signature) {
    res.status(401).json({ error: 'Missing webhook signature' });
    return;
  }

  try {
    await handleFlutterwaveWebhook(signature, req.body as Record<string, unknown>);
    res.status(200).json({ status: 'ok' });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    const status = error.statusCode ?? 500;
    res.status(status).json({ error: error.message ?? 'Internal server error' });
  }
});

/**
 * POST /withdraw
 * Validate, debit wallet, create Withdrawal record, enqueue Flutterwave payout.
 * Requirements: 5.3
 */
withdrawalRouter.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { amountUsdc, lockId, bankCode, accountNumber, accountName } = req.body as WithdrawRequest;

  if (!amountUsdc || !lockId || !bankCode || !accountNumber || !accountName) {
    res.status(400).json({ error: 'amountUsdc, lockId, bankCode, accountNumber, and accountName are required' });
    return;
  }

  try {
    const withdrawal = await initiateWithdrawal(userId, {
      amountUsdc,
      lockId,
      bankCode,
      accountNumber,
      accountName,
    });
    res.status(201).json(withdrawal);
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    const status = error.statusCode ?? 500;
    res.status(status).json({ error: error.message ?? 'Internal server error' });
  }
});

/**
 * GET /withdrawal/:id
 * Return withdrawal record for authenticated user.
 * Requirements: 5.6
 */
withdrawalRouter.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const withdrawal = await getWithdrawal(id, userId);
    res.json(withdrawal);
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    const status = error.statusCode ?? 500;
    res.status(status).json({ error: error.message ?? 'Internal server error' });
  }
});
