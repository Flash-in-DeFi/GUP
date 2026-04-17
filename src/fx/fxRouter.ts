import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth/authMiddleware';
import { getCurrentRate } from './fxEngine';

export const fxRouter = Router();

/**
 * GET /rates
 * Returns the current platform FX rate (USDC → NGN) inclusive of spread.
 * Requirements: 4.1, 4.2
 */
fxRouter.get('/', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const rate = await getCurrentRate();
    res.json(rate);
  } catch (err) {
    console.error('[FXEngine] Failed to fetch rate:', err);
    res.status(503).json({ error: 'FX rate unavailable, please try again shortly' });
  }
});
