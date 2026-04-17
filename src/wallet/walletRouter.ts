import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth/authMiddleware';
import { getBalance } from './walletService';
import { config } from '../config/env';
import { pool } from '../db/pool';

export const walletRouter = Router();
export const depositAddressRouter = Router();

/**
 * GET /wallet
 * Returns the authenticated user's USDC balance.
 * Requirements: 2.4
 */
walletRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const balance = await getBalance(userId);
  res.json(balance);
});

/**
 * GET /deposit-address
 * Returns the shared platform Stellar address and the user's unique memo_id.
 * Requirements: 2.2
 */
depositAddressRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  const result = await pool.query<{ memo_id: string }>(
    `SELECT memo_id FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    platformStellarAddress: config.platformStellarAddress,
    memoId: result.rows[0].memo_id,
  });
});
