import { Router } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';

const router = Router();

/** Integration status for Google Fit, etc. */
router.get('/status', requireAuth, (req: AuthedRequest, res) => {
  const rows = getDb()
    .prepare(`SELECT provider, created_at, expires_at FROM integration_tokens WHERE user_id = ?`)
    .all(req.user!.id) as { provider: string; created_at: string; expires_at: string | null }[];

  res.json({
    googleFit: {
      available: Boolean(process.env.GOOGLE_FIT_CLIENT_ID),
      connected: rows.some((r) => r.provider === 'google_fit'),
    },
    appleHealth: {
      available: true,
      connected: rows.some((r) => r.provider === 'apple_health'),
      note: 'Use the FitPulse iOS companion or Apple Watch pairing in Devices',
    },
    fitbit: { available: false, connected: false, comingSoon: true },
    garmin: { available: false, connected: false, comingSoon: true },
  });
});

/** Placeholder: Google Fit OAuth (configure GOOGLE_FIT_CLIENT_ID in .env) */
router.get('/google-fit/connect', requireAuth, (req: AuthedRequest, res) => {
  if (!process.env.GOOGLE_FIT_CLIENT_ID) {
    res.status(503).json({
      error: 'Google Fit not configured',
      hint: 'Add GOOGLE_FIT_CLIENT_ID to server/.env',
    });
    return;
  }
  const redirect = encodeURIComponent(
    process.env.GOOGLE_FIT_CALLBACK_URL ??
      'http://localhost:3001/api/integrations/google-fit/callback'
  );
  const scope = encodeURIComponent('https://www.googleapis.com/auth/fitness.activity.write');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_FIT_CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  res.json({ authUrl: url });
});

router.get('/google-fit/callback', (_req, res) => {
  res.redirect(`${process.env.CLIENT_URL ?? 'http://localhost:5173'}/devices?google=connected`);
});

export default router;
