import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/', requireRole(['admin', 'editor_user_manager']), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.full_name, u.phone, u.is_active,
            GROUP_CONCAT(r.name) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id
     ORDER BY u.id DESC`
  );

  const users = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        active: !!row.is_active,
        roles: row.roles ? String(row.roles).split(',') : []
      }))
    : [];

  return res.json(users);
});

usersRouter.post('/', requireRole(['admin', 'editor_user_manager']), async (req, res) => {
  const { fullName, email, password, roles } = req.body as {
    fullName?: string;
    email?: string;
    password?: string;
    roles?: string[];
  };

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const [existingRows] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  const existing = Array.isArray(existingRows) ? existingRows[0] : undefined;
  if (existing) {
    return res.status(409).json({ error: 'Email already exists.' });
  }

  const [roleRows] = await db.query('SELECT id, name FROM roles');
  const roleMap = new Map<string, number>();
  if (Array.isArray(roleRows)) {
    roleRows.forEach((row: any) => roleMap.set(row.name, row.id));
  }

  const roleList = Array.isArray(roles) && roles.length ? roles : ['client'];
  const roleIds = roleList.map((role) => roleMap.get(role)).filter(Boolean) as number[];
  if (!roleIds.length) {
    return res.status(400).json({ error: 'Invalid roles.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO users (email, password_hash, full_name, is_active) VALUES (?, ?, ?, 1)',
      [email, passwordHash, fullName]
    );
    const userId = (result as any).insertId as number;

    for (const roleId of roleIds) {
      await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [
        userId,
        roleId
      ]);
    }
    await connection.commit();
    return res.status(201).json({ id: userId });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to create user.' });
  } finally {
    connection.release();
  }
});

usersRouter.patch('/:id/status', requireRole(['admin', 'editor_user_manager']), async (req, res) => {
  const { active } = req.body as { active?: boolean };
  const userId = Number(req.params['id']);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  if (active === false) {
    const [adminRows] = await db.query(
      `SELECT 1
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.name = 'admin'
       LIMIT 1`,
      [userId]
    );
    const isAdmin = Array.isArray(adminRows) && adminRows.length > 0;
    if (isAdmin) {
      const [countRows] = await db.query(
        `SELECT COUNT(DISTINCT u.id) AS total
         FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE r.name = 'admin' AND u.is_active = 1 AND u.id <> ?`,
        [userId]
      );
      const totalAdmins = Array.isArray(countRows) ? Number(countRows[0]?.total ?? 0) : 0;
      if (totalAdmins === 0) {
        return res
          .status(409)
          .json({ error: 'Debe existir al menos un admin activo.' });
      }
    }
  }

  const [result] = await db.query('UPDATE users SET is_active = ? WHERE id = ?', [
    active ? 1 : 0,
    userId
  ]);
  if ((result as any).affectedRows === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json({ ok: true });
});
