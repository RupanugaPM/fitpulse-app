-- FitPulse SQL schema (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  provider_id TEXT,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  total_pushups INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(auth_provider, provider_id);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS pushup_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reps INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  avg_confidence REAL,
  source TEXT NOT NULL DEFAULT 'camera_ai',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pushup_sessions_user ON pushup_sessions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Wearables: Apple Watch, Apple Health bridge, Google Fit, etc.
CREATE TABLE IF NOT EXISTS wearable_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  device_name TEXT,
  device_token TEXT NOT NULL UNIQUE,
  pairing_code TEXT,
  last_sync_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wearable_devices_user ON wearable_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_token ON wearable_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_pairing ON wearable_devices(pairing_code);

CREATE TABLE IF NOT EXISTS wearable_sync_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES wearable_devices(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wearable_sync_user ON wearable_sync_log(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS integration_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  scopes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, provider)
);
