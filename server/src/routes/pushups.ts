import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import type { AuthedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import type { PushupSessionRow } from '../db/index.js';
import { addXpAndPushups, sanitizeUser } from '../services/users.js';
import { xpForPushups, xpToNextLevel } from '../services/xp.js';

const router = Router();

const logSchema = z.object({
  reps: z.number().int().min(1).max(500),
  durationSec: z.number().int().min(0).max(7200).optional(),
  avgConfidence: z.number().min(0).max(1).optional(),
});

router.post('/sessions', requireAuth, (req: AuthedRequest, res) => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { reps, durationSec = 0, avgConfidence } = parsed.data;
  const userId = req.user!.id;
  const xpEarned = xpForPushups(reps);
  const sessionId = uuid();
  const db = getDb();

  db.prepare(
    `INSERT INTO pushup_sessions (id, user_id, reps, xp_earned, duration_sec, avg_confidence)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(sessionId, userId, reps, xpEarned, durationSec, avgConfidence ?? null);

  const updatedUser = addXpAndPushups(
    userId,
    xpEarned,
    reps,
    'pushup_session',
    sessionId
  );

  const levelInfo = xpToNextLevel(updatedUser.total_xp);

  res.status(201).json({
    session: {
      id: sessionId,
      reps,
      xpEarned,
      durationSec,
      createdAt: new Date().toISOString(),
    },
    user: sanitizeUser(updatedUser),
    levelProgress: levelInfo,
  });
});

router.get('/sessions', requireAuth, (req: AuthedRequest, res) => {
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const db = getDb();
  const sessions = db
    .prepare(
      `SELECT * FROM pushup_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(req.user!.id, limit) as PushupSessionRow[];

  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      reps: s.reps,
      xpEarned: s.xp_earned,
      durationSec: s.duration_sec,
      avgConfidence: s.avg_confidence,
      createdAt: s.created_at,
    })),
  });
});

router.get('/stats', requireAuth, (req: AuthedRequest, res) => {
  const user = req.user!;
  const db = getDb();

  const today = db
    .prepare(
      `SELECT COALESCE(SUM(reps), 0) as reps, COALESCE(SUM(xp_earned), 0) as xp
       FROM pushup_sessions WHERE user_id = ? AND date(created_at) = date('now')`
    )
    .get(user.id) as { reps: number; xp: number };

  const week = db
    .prepare(
      `SELECT COALESCE(SUM(reps), 0) as reps FROM pushup_sessions
       WHERE user_id = ? AND created_at >= datetime('now', '-7 days')`
    )
    .get(user.id) as { reps: number };

  const levelInfo = xpToNextLevel(user.total_xp);

  res.json({
    totalPushups: user.total_pushups,
    totalXp: user.total_xp,
    level: user.level,
    todayReps: today.reps,
    todayXp: today.xp,
    weekReps: week.reps,
    levelProgress: levelInfo,
  });
});

router.get('/xp-history', requireAuth, (req: AuthedRequest, res) => {
  const db = getDb();
  const events = db
    .prepare(
      `SELECT id, amount, reason, reference_id, created_at FROM xp_events
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`
    )
    .all(req.user!.id) as {
    id: string;
    amount: number;
    reason: string;
    reference_id: string | null;
    created_at: string;
  }[];

  res.json({
    events: events.map((e) => ({
      id: e.id,
      amount: e.amount,
      reason: e.reason,
      referenceId: e.reference_id,
      createdAt: e.created_at,
    })),
  });
});

export default router;
