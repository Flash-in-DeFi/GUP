"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const StellarSdk = __importStar(require("@stellar/stellar-sdk"));
const pool_1 = require("../db/pool");
const env_1 = require("../config/env");
const BCRYPT_COST = 12;
async function signup(email, password) {
    const passwordHash = await bcrypt_1.default.hash(password, BCRYPT_COST);
    const keypair = StellarSdk.Keypair.random();
    const stellarAddress = keypair.publicKey();
    const memoId = (0, uuid_1.v4)();
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        const userResult = await client.query(`INSERT INTO users (email, password_hash, stellar_address, memo_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, memo_id, stellar_address`, [email, passwordHash, stellarAddress, memoId]);
        const user = userResult.rows[0];
        await client.query(`INSERT INTO wallets (user_id, asset, balance) VALUES ($1, 'USDC', 0)`, [user.id]);
        await client.query('COMMIT');
        return {
            userId: user.id,
            email: user.email,
            memoId: user.memo_id,
            stellarAddress: user.stellar_address,
        };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
async function login(email, password) {
    const result = await pool_1.pool.query(`SELECT id, email, password_hash FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user) {
        throw new Error('INVALID_CREDENTIALS');
    }
    const valid = await bcrypt_1.default.compare(password, user.password_hash);
    if (!valid) {
        throw new Error('INVALID_CREDENTIALS');
    }
    const payload = { userId: user.id, email: user.email };
    const token = jsonwebtoken_1.default.sign(payload, env_1.config.jwtSecret, { algorithm: 'HS256', expiresIn: '24h' });
    return { token, userId: user.id, email: user.email };
}
//# sourceMappingURL=authService.js.map