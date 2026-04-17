"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawalRouter = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../auth/authMiddleware");
const withdrawalService_1 = require("./withdrawalService");
exports.withdrawalRouter = (0, express_1.Router)();
/**
 * POST /withdrawal/webhook/flutterwave
 * Flutterwave webhook handler — verifies signature, updates status, writes Ledger entry.
 * Registered first so it takes precedence over /:id param route.
 * Requirements: 5.5
 */
exports.withdrawalRouter.post('/webhook/flutterwave', async (req, res) => {
    const signature = req.headers['verif-hash'];
    if (!signature) {
        res.status(401).json({ error: 'Missing webhook signature' });
        return;
    }
    try {
        await (0, withdrawalService_1.handleFlutterwaveWebhook)(signature, req.body);
        res.status(200).json({ status: 'ok' });
    }
    catch (err) {
        const error = err;
        const status = error.statusCode ?? 500;
        res.status(status).json({ error: error.message ?? 'Internal server error' });
    }
});
/**
 * POST /withdraw
 * Validate, debit wallet, create Withdrawal record, enqueue Flutterwave payout.
 * Requirements: 5.3
 */
exports.withdrawalRouter.post('/', authMiddleware_1.authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const { amountUsdc, lockId, bankCode, accountNumber, accountName } = req.body;
    if (!amountUsdc || !lockId || !bankCode || !accountNumber || !accountName) {
        res.status(400).json({ error: 'amountUsdc, lockId, bankCode, accountNumber, and accountName are required' });
        return;
    }
    try {
        const withdrawal = await (0, withdrawalService_1.initiateWithdrawal)(userId, {
            amountUsdc,
            lockId,
            bankCode,
            accountNumber,
            accountName,
        });
        res.status(201).json(withdrawal);
    }
    catch (err) {
        const error = err;
        const status = error.statusCode ?? 500;
        res.status(status).json({ error: error.message ?? 'Internal server error' });
    }
});
/**
 * GET /withdrawal/:id
 * Return withdrawal record for authenticated user.
 * Requirements: 5.6
 */
exports.withdrawalRouter.get('/:id', authMiddleware_1.authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
        const withdrawal = await (0, withdrawalService_1.getWithdrawal)(id, userId);
        res.json(withdrawal);
    }
    catch (err) {
        const error = err;
        const status = error.statusCode ?? 500;
        res.status(status).json({ error: error.message ?? 'Internal server error' });
    }
});
//# sourceMappingURL=withdrawalRouter.js.map