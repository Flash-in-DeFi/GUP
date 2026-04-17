import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as StellarSdk from '@stellar/stellar-sdk';
import { pool } from '../db/pool';
import { config } from '../config/env';

const BCRYPT_COST = 12;

export interface SignupResult {
  userId: string;
  email: string;
  memoId: string;
  stellarAddress: string;
}

export interface LoginResult {
  token: string;
  userId: string;
  email: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function signup(email: string, password: string): Promise<SignupResult> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const keypair = StellarSdk.Keypair.random();
  const stellarAddress = keypair.publicKey();
  const memoId = uuidv4();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query<{ id: string; email: string; memo_id: string; stellar_address: string }>(
      `INSERT INTO users (email, password_hash, stellar_address, memo_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, memo_id, stellar_address`,
      [email, passwordHash, stellarAddress, memoId]
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO wallets (user_id, asset, balance) VALUES ($1, 'USDC', 0)`,
      [user.id]
    );

    await client.query('COMMIT');

    return {
      userId: user.id,
      email: user.email,
      memoId: user.memo_id,
      stellarAddress: user.stellar_address,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await pool.query<{ id: string; email: string; password_hash: string }>(
    `SELECT id, email, password_hash FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const payload: JwtPayload = { userId: user.id, email: user.email };
  const token = jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256', expiresIn: '24h' });

  return { token, userId: user.id, email: user.email };
}
