import { Router, Request, Response } from 'express';
import { signup, login } from './authService';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const result = await signup(email, password);
    res.status(201).json(result);
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === '23505') {
      // Unique constraint violation — duplicate email
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    throw err;
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const result = await login(email, password);
    res.status(200).json(result);
  } catch (err: unknown) {
    const error = err as { message?: string };
    if (error.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    throw err;
  }
});

export default router;
