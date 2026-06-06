import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRow } from '../db/index.js';
import { getDb } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthedRequest extends Request {
  user?: UserRow;
  auth?: AuthPayload;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = req.cookies?.fitpulse_token as string | undefined;
  const token = bearer ?? cookieToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const db = getDb();
  const user = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(payload.userId) as UserRow | undefined;

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.auth = payload;
  req.user = user;
  next();
}

export function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = req.cookies?.fitpulse_token as string | undefined;
  const token = bearer ?? cookieToken;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const db = getDb();
      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(payload.userId) as UserRow | undefined;
      if (user) {
        req.auth = payload;
        req.user = user;
      }
    }
  }
  next();
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie('fitpulse_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export { JWT_SECRET };
