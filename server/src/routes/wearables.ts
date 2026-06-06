import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import type { AuthedRequest } from '../middleware/auth.js';
import type { DeviceRequest } from '../middleware/deviceAuth.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDeviceAuth } from '../middleware/deviceAuth.js';
import { getDb } from '../db/index.js';
import { addXpAndPushups, sanitizeUser } from '../services/users.js';
import { xpForPushups } from '../services/xp.js';

const router = Router();

const PLATFORMS = ['apple_watch', 'apple_health', 'google_fit', 'fitbit', 'garmin'] as const;

function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Web app: start pairing — show code on screen */
router.post('/pair/start', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const id = uuid();

  const pendingToken = `pending_${uuid()}`;
  getDb()
    .prepare(
      `INSERT INTO wearable_devices (id, user_id, platform, pairing_code, device_token, is_active, metadata)
       VALUES (?, ?, 'apple_watch', ?, ?, 0, ?)`
    )
    .run(id, userId, code, pendingToken, JSON.stringify({ expiresAt, pending: true }));

  res.json({
    pairingId: id,
    pairingCode: code,
    expiresAt,
    expiresInMinutes: 10,
  });
});

/** iOS / Watch companion: confirm pairing with code from web */
router.post('/pair/confirm', (req, res) => {
  const schema = z.object({
    pairingCode: z.string().length(6),
    platform: z.enum(PLATFORMS).default('apple_watch'),
    deviceName: z.string().min(1).max(64).default('Apple Watch'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { pairingCode, platform, deviceName } = parsed.data;
  const db = getDb();
  const pending = db
    .prepare(
      `SELECT * FROM wearable_devices WHERE pairing_code = ? AND is_active = 0`
    )
    .get(pairingCode) as {
    id: string;
    user_id: string;
    metadata: string | null;
  } | undefined;

  if (!pending) {
    res.status(404).json({ error: 'Invalid or expired pairing code' });
    return;
  }

  if (pending.metadata) {
    try {
      const meta = JSON.parse(pending.metadata) as { expiresAt?: string };
      if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
        res.status(410).json({ error: 'Pairing code expired' });
        return;
      }
    } catch {
      /* ignore */
    }
  }

  const deviceToken = generateDeviceToken();
  db.prepare(
    `UPDATE wearable_devices SET platform = ?, device_name = ?, device_token = ?,
     pairing_code = NULL, is_active = 1, metadata = NULL WHERE id = ?`
  ).run(platform, deviceName, deviceToken, pending.id);

  res.json({
    deviceToken,
    deviceId: pending.id,
    userId: pending.user_id,
    message: 'Device paired successfully',
  });
});

/** List connected devices (web) */
router.get('/devices', requireAuth, (req: AuthedRequest, res) => {
  const rows = getDb()
    .prepare(
      `SELECT id, platform, device_name, last_sync_at, created_at, is_active
       FROM wearable_devices WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC`
    )
    .all(req.user!.id) as {
    id: string;
    platform: string;
    device_name: string | null;
    last_sync_at: string | null;
    created_at: string;
  }[];

  res.json({
    devices: rows.map((d) => ({
      id: d.id,
      platform: d.platform,
      deviceName: d.device_name,
      lastSyncAt: d.last_sync_at,
      createdAt: d.created_at,
    })),
    supportedPlatforms: PLATFORMS,
    comingSoon: ['google_fit', 'fitbit', 'garmin'],
  });
});

/** Disconnect device */
router.delete('/devices/:id', requireAuth, (req: AuthedRequest, res) => {
  const result = getDb()
    .prepare(
      `UPDATE wearable_devices SET is_active = 0 WHERE id = ? AND user_id = ?`
    )
    .run(req.params.id, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }
  res.json({ ok: true });
});

const syncSchema = z.object({
  pushups: z
    .object({
      reps: z.number().int().min(1).max(500),
      durationSec: z.number().int().min(0).optional(),
      heartRateAvg: z.number().min(30).max(220).optional(),
      calories: z.number().min(0).optional(),
    })
    .optional(),
  workout: z
    .object({
      type: z.string().max(64),
      durationSec: z.number().int().min(0),
      calories: z.number().min(0).optional(),
      heartRateAvg: z.number().optional(),
    })
    .optional(),
  metrics: z
    .object({
      steps: z.number().int().optional(),
      activeCalories: z.number().optional(),
      standHours: z.number().optional(),
    })
    .optional(),
});

/** Apple Watch / iOS companion sync endpoint */
router.post('/sync', requireDeviceAuth, (req: DeviceRequest, res) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const device = req.device!;
  const userId = device.user_id;
  const data = parsed.data;
  const results: Record<string, unknown> = {};

  db.prepare(`UPDATE wearable_devices SET last_sync_at = datetime('now') WHERE id = ?`).run(
    device.id
  );

  db.prepare(
    `INSERT INTO wearable_sync_log (id, user_id, device_id, event_type, payload)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), userId, device.id, 'sync', JSON.stringify(data));

  if (data.pushups) {
    const { reps, durationSec = 0 } = data.pushups;
    const xpEarned = xpForPushups(reps);
    const sessionId = uuid();

    db.prepare(
      `INSERT INTO pushup_sessions (id, user_id, reps, xp_earned, duration_sec, source)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(sessionId, userId, reps, xpEarned, durationSec, device.platform);

    const updatedUser = addXpAndPushups(
      userId,
      xpEarned,
      reps,
      `${device.platform}_sync`,
      sessionId
    );

    results.pushups = {
      sessionId,
      reps,
      xpEarned,
      user: sanitizeUser(updatedUser),
    };
  }

  if (data.workout) {
    results.workout = { logged: true, ...data.workout };
  }

  if (data.metrics) {
    results.metrics = { logged: true, ...data.metrics };
  }

  res.json({
    ok: true,
    syncedAt: new Date().toISOString(),
    ...results,
  });
});

/** Device ping / health check */
router.get('/ping', requireDeviceAuth, (req: DeviceRequest, res) => {
  res.json({
    ok: true,
    deviceId: req.device!.id,
    platform: req.device!.platform,
    serverTime: new Date().toISOString(),
  });
});

export default router;
