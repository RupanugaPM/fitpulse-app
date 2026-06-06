import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import type { UserRow } from '../db/index.js';
import { getDb } from '../db/index.js';
import { levelFromXp } from './xp.js';

export function sanitizeUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    authProvider: user.auth_provider,
    totalXp: user.total_xp,
    level: user.level,
    totalPushups: user.total_pushups,
    createdAt: user.created_at,
  };
}

export function findUserByEmail(email: string): UserRow | undefined {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function findUserByProvider(
  provider: string,
  providerId: string
): UserRow | undefined {
  return getDb()
    .prepare('SELECT * FROM users WHERE auth_provider = ? AND provider_id = ?')
    .get(provider, providerId) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export async function createLocalUser(
  email: string,
  password: string,
  displayName: string
): Promise<UserRow> {
  const hash = await bcrypt.hash(password, 12);
  const id = uuid();
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, display_name, auth_provider)
     VALUES (?, ?, ?, ?, 'local')`
  ).run(id, email.toLowerCase(), hash, displayName);
  return findUserById(id)!;
}

export function findOrCreateOAuthUser(opts: {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}): UserRow {
  const existing = findUserByProvider(opts.provider, opts.providerId);
  if (existing) return existing;

  const byEmail = findUserByEmail(opts.email.toLowerCase());
  if (byEmail) {
    const db = getDb();
    db.prepare(
      `UPDATE users SET auth_provider = ?, provider_id = ?, avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?`
    ).run(opts.provider, opts.providerId, opts.avatarUrl ?? null, byEmail.id);
    return findUserById(byEmail.id)!;
  }

  const id = uuid();
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, email, display_name, avatar_url, auth_provider, provider_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    opts.email.toLowerCase(),
    opts.displayName,
    opts.avatarUrl ?? null,
    opts.provider,
    opts.providerId
  );

  db.prepare(
    `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id) VALUES (?, ?, ?, ?)`
  ).run(uuid(), id, opts.provider, opts.providerId);

  return findUserById(id)!;
}

export function addXpAndPushups(
  userId: string,
  xpAmount: number,
  pushups: number,
  reason: string,
  referenceId?: string
): UserRow {
  const db = getDb();
  const user = findUserById(userId)!;
  const newXp = user.total_xp + xpAmount;
  const newLevel = levelFromXp(newXp);
  const newPushups = user.total_pushups + pushups;

  db.prepare(
    `UPDATE users SET total_xp = ?, level = ?, total_pushups = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(newXp, newLevel, newPushups, userId);

  db.prepare(
    `INSERT INTO xp_events (id, user_id, amount, reason, reference_id) VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), userId, xpAmount, reason, referenceId ?? null);

  return findUserById(userId)!;
}
