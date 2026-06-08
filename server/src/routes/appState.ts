import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const router = Router();

const syncableStateSchema = z.object({
  settings: z.record(z.unknown()),
  reminder: z.record(z.unknown()),
  hydration: z.record(z.unknown()),
  goals: z.record(z.unknown()),
  customRoutines: z.array(z.record(z.unknown())),
  workoutPlans: z.array(z.record(z.unknown())),
  history: z.array(z.record(z.unknown())),
  dailyStats: z.array(z.record(z.unknown())),
  waterLogMl: z.record(z.number()),
  favoriteWorkoutIds: z.array(z.string()),
});

router.get('/', requireAuth, (req: AuthedRequest, res: Response) => {
  const db = getDb();
  const row = db
    .prepare('SELECT state_json, updated_at FROM user_app_state WHERE user_id = ?')
    .get(req.user!.id) as { state_json: string; updated_at: string } | undefined;

  if (!row) {
    res.json({ state: null, updatedAt: null });
    return;
  }

  try {
    const state = JSON.parse(row.state_json);
    res.json({ state, updatedAt: row.updated_at });
  } catch {
    res.status(500).json({ error: 'Corrupt app state on server' });
  }
});

router.put('/', requireAuth, (req: AuthedRequest, res: Response) => {
  const parsed = syncableStateSchema.safeParse(req.body?.state);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid app state payload' });
    return;
  }

  const db = getDb();
  const json = JSON.stringify(parsed.data);
  db.prepare(
    `INSERT INTO user_app_state (user_id, state_json, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       state_json = excluded.state_json,
       updated_at = datetime('now')`
  ).run(req.user!.id, json);

  const row = db
    .prepare('SELECT updated_at FROM user_app_state WHERE user_id = ?')
    .get(req.user!.id) as { updated_at: string };

  res.json({ ok: true, updatedAt: row.updated_at });
});

export default router;
