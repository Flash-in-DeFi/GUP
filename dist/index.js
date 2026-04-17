"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const authRouter_1 = __importDefault(require("./auth/authRouter"));
const walletRouter_1 = require("./wallet/walletRouter");
const fxRouter_1 = require("./fx/fxRouter");
const withdrawalRouter_1 = require("./withdrawal/withdrawalRouter");
const transactionListener_1 = require("./listener/transactionListener");
const liquidityManager_1 = require("./liquidity/liquidityManager");
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Auth routes
app.use('/auth', authRouter_1.default);
// Wallet routes
app.use('/wallet', walletRouter_1.walletRouter);
app.use('/deposit-address', walletRouter_1.depositAddressRouter);
// FX routes
app.use('/rates', fxRouter_1.fxRouter);
// Withdrawal routes
app.use('/withdrawal', withdrawalRouter_1.withdrawalRouter);
// Global error handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});
const PORT = env_1.config.port;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Start the Stellar transaction listener as a background service
    (0, transactionListener_1.startTransactionListener)().catch((err) => {
        console.error('[TransactionListener] Failed to start:', err);
    });
    // Start the NGN liquidity queue processor
    (0, liquidityManager_1.startLiquidityQueueProcessor)();
});
exports.default = app;
//# sourceMappingURL=index.js.map