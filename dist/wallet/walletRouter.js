"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depositAddressRouter = exports.walletRouter = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../auth/authMiddleware");
const walletService_1 = require("./walletService");
const env_1 = require("../config/env");
const pool_1 = require("../db/pool");
exports.walletRouter = (0, express_1.Router)();
exports.depositAddressRouter = (0, express_1.Router)();
/**
 * GET /wallet
 * Returns the authenticated user's USDC balance.
 * Requirements: 2.4
 */
exports.walletRouter.get('/', authMiddleware_1.authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const balance = await (0, walletService_1.getBalance)(userId);
    res.json(balance);
});
/**
 * GET /deposit-address
 * Returns the shared platform Stellar address and the user's unique memo_id.
 * Requirements: 2.2
 */
exports.depositAddressRouter.get('/', authMiddleware_1.authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const result = await pool_1.pool.query(`SELECT memo_id FROM users WHERE id = $1`, [userId]);
    if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json({
        platformStellarAddress: env_1.config.platformStellarAddress,
        memoId: result.rows[0].memo_id,
    });
});
//# sourceMappingURL=walletRouter.js.map