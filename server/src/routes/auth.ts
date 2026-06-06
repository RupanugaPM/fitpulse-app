import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import type { AuthedRequest } from '../middleware/auth.js';
import { requireAuth, signToken, setAuthCookie } from '../middleware/auth.js';
import {
  findUserByEmail,
  createLocalUser,
  findOrCreateOAuthUser,
  sanitizeUser as toPublicUser,
} from '../services/users.js';

const router = Router();
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

function redirectWithToken(res: import('express').Response, token: string) {
  setAuthCookie(res, token);
  res.redirect(`${CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}`);
}

function configurePassport() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/api/auth/google/callback',
        },
        (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('Google account has no email'));
            const user = findOrCreateOAuthUser({
              provider: 'google',
              providerId: profile.id,
              email,
              displayName: profile.displayName || email.split('@')[0],
              avatarUrl: profile.photos?.[0]?.value,
            });
            done(null, user);
          } catch (e) {
            done(e as Error);
          }
        }
      )
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL ?? 'http://localhost:3001/api/auth/github/callback',
          scope: ['user:email'],
        },
        (_accessToken: string, _refreshToken: string, profile: passport.Profile, done: (err: Error | null, user?: unknown) => void) => {
          try {
            const email =
              (profile.emails?.[0]?.value as string | undefined) ??
              `${profile.username}@github.local`;
            const user = findOrCreateOAuthUser({
              provider: 'github',
              providerId: profile.id,
              email,
              displayName: profile.displayName || profile.username || 'GitHub User',
              avatarUrl: profile.photos?.[0]?.value,
            });
            done(null, user);
          } catch (e) {
            done(e as Error);
          }
        }
      )
    );
  }
}

configurePassport();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(64),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, displayName } = parsed.data;
  if (findUserByEmail(email)) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const user = await createLocalUser(email, password, displayName);
  const token = signToken({ userId: user.id, email: user.email });
  setAuthCookie(res, token);
  res.status(201).json({ token, user: toPublicUser(user) });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const user = findUserByEmail(email);
  if (!user?.password_hash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const token = signToken({ userId: user.id, email: user.email });
  setAuthCookie(res, token);
  res.json({ token, user: toPublicUser(user) });
});

router.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: toPublicUser(req.user!) });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('fitpulse_token', { path: '/' });
  res.json({ ok: true });
});

router.get('/providers', (_req, res) => {
  res.json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID),
    github: Boolean(process.env.GITHUB_CLIENT_ID),
    email: true,
  });
});

if (process.env.GOOGLE_CLIENT_ID) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  );
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=google` }),
    (req, res) => {
      const user = req.user as import('../db/index.js').UserRow;
      const token = signToken({ userId: user.id, email: user.email });
      redirectWithToken(res, token);
    }
  );
} else {
  router.get('/google', (_req, res) => {
    res.status(503).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
  });
}

if (process.env.GITHUB_CLIENT_ID) {
  router.get(
    '/github',
    passport.authenticate('github', { scope: ['user:email'], session: false })
  );
  router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: `${CLIENT_URL}/login?error=github` }),
    (req, res) => {
      const user = req.user as import('../db/index.js').UserRow;
      const token = signToken({ userId: user.id, email: user.email });
      redirectWithToken(res, token);
    }
  );
} else {
  router.get('/github', (_req, res) => {
    res.status(503).json({ error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' });
  });
}

export default router;
