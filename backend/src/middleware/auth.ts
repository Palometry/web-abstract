import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtUser } from '../types';

export type AuthRequest = Request & { user?: JwtUser };

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const secret = process.env['JWT_SECRET'] || 'change_me';
    const payload = jwt.verify(token, secret) as JwtUser;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const hasRole = roles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
};
