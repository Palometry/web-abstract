import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const [rows] = await db.query(
    'SELECT id, email, password_hash, full_name, phone, is_active FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  const user = Array.isArray(rows) ? rows[0] : undefined;
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const [roleRows] = await db.query(
    'SELECT r.name FROM roles r INNER JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?',
    [user.id]
  );
  const roles = Array.isArray(roleRows) ? roleRows.map((row: any) => row.name) : [];

  const secret = process.env['JWT_SECRET'] || 'change_me';
  const expiresIn = process.env['JWT_EXPIRES_IN'] || '12h';
  const token = jwt.sign({ id: user.id, email: user.email, roles }, secret, { expiresIn });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      roles
    }
  });
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const [rows] = await db.query(
    'SELECT id, email, full_name, phone, is_active FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const user = Array.isArray(rows) ? rows[0] : undefined;
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  const [roleRows] = await db.query(
    'SELECT r.name FROM roles r INNER JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?',
    [userId]
  );
  const roles = Array.isArray(roleRows) ? roleRows.map((row: any) => row.name) : [];

  return res.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    isActive: !!user.is_active,
    roles
  });
});
