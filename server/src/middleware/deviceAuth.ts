import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/index.js';

export interface DeviceRow {
  id: string;
  user_id: string;
  platform: string;
  device_name: string | null;
  device_token: string;
  last_sync_at: string | null;
  is_active: number;
  metadata: string | null;
}

export interface DeviceRequest extends Request {
  device?: DeviceRow;
}

export function requireDeviceAuth(req: DeviceRequest, res: Response, next: NextFunction) {
  const token =
    req.headers['x-device-token'] ??
    (req.headers.authorization?.startsWith('Device ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Device token required (X-Device-Token header)' });
    return;
  }

  const row = getDb()
    .prepare(
      `SELECT id, user_id, platform, device_name, device_token, last_sync_at, is_active, metadata
       FROM wearable_devices WHERE device_token = ? AND is_active = 1`
    )
    .get(token) as DeviceRow | undefined;

  if (!row) {
    res.status(401).json({ error: 'Invalid device token' });
    return;
  }

  req.device = row;
  next();
}
