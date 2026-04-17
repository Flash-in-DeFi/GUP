import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth/authMiddleware';
import { pool } from '../db/pool';

export const transactionRouter = Router();

export interface TransactionRecord {
  id: string;
  type: string;
  amount: string;
  asset: string;
  status: string;
  txHash: string | null;
  createdAt: Date;
}

/**
 * GET /transactions
 * Returns paginated transaction history for the authenticated user, ordered by created_at DESC.
 * Query params: page (default 1), limit (default 20)
 * Requirements: 9.1, 9.2
 */
transactionRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10) || 20));
  const offset = (page - 1) * limit;

  try {
    const [dataResult, countResult] = await Promise.all([
      pool.query<TransactionRecord>(
        `SELECT
           id,
           type,
           amount,
           asset,
           status,
           tx_hash AS "txHash",
           created_at AS "createdAt"
         FROM transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM transactions WHERE user_id = $1`,
        [userId]
      ),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('[Transactions] Error fetching transactions:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});
