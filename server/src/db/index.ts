import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = process.env.DATABASE_PATH
    ? dirname(process.env.DATABASE_PATH)
    : join(__dirname, '../../../data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const dbPath = process.env.DATABASE_PATH ?? join(dataDir, 'fitpulse.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  return db;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string;
  avatar_url: string | null;
  auth_provider: string;
  provider_id: string | null;
  total_xp: number;
  level: number;
  total_pushups: number;
  created_at: string;
  updated_at: string;
}

export interface PushupSessionRow {
  id: string;
  user_id: string;
  reps: number;
  xp_earned: number;
  duration_sec: number;
  avg_confidence: number | null;
  source: string;
  created_at: string;
}
