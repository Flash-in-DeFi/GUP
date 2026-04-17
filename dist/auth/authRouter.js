"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("./authService");
const router = (0, express_1.Router)();
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
    }
    try {
        const result = await (0, authService_1.signup)(email, password);
        res.status(201).json(result);
    }
    catch (err) {
        const error = err;
        if (error.code === '23505') {
            // Unique constraint violation — duplicate email
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        throw err;
    }
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
    }
    try {
        const result = await (0, authService_1.login)(email, password);
        res.status(200).json(result);
    }
    catch (err) {
        const error = err;
        if (error.message === 'INVALID_CREDENTIALS') {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        throw err;
    }
});
exports.default = router;
//# sourceMappingURL=authRouter.js.map