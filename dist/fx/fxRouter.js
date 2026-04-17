"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fxRouter = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../auth/authMiddleware");
const fxEngine_1 = require("./fxEngine");
exports.fxRouter = (0, express_1.Router)();
/**
 * GET /rates
 * Returns the current platform FX rate (USDC → NGN) inclusive of spread.
 * Requirements: 4.1, 4.2
 */
exports.fxRouter.get('/', authMiddleware_1.authMiddleware, async (_req, res) => {
    try {
        const rate = await (0, fxEngine_1.getCurrentRate)();
        res.json(rate);
    }
    catch (err) {
        console.error('[FXEngine] Failed to fetch rate:', err);
        res.status(503).json({ error: 'FX rate unavailable, please try again shortly' });
    }
});
//# sourceMappingURL=fxRouter.js.map