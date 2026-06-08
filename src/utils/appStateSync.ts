import type { AppState, CompletedSession, DailyStats } from '../types';
import { createDefaultPlan, DEFAULT_PLAN_ID } from '../data/defaultPlan';
import { normalizePreferredWorkoutIds } from './reminderWorkout';

/** Fields synced to SQLite when the user is signed in. */
export type SyncableAppState = Pick<
  AppState,
  | 'settings'
  | 'reminder'
  | 'hydration'
  | 'goals'
  | 'customRoutines'
  | 'workoutPlans'
  | 'history'
  | 'dailyStats'
  | 'waterLogMl'
  | 'favoriteWorkoutIds'
>;

export function pickSyncableState(state: AppState): SyncableAppState {
  return {
    settings: state.settings,
    reminder: state.reminder,
    hydration: state.hydration,
    goals: state.goals,
    customRoutines: state.customRoutines,
    workoutPlans: state.workoutPlans,
    history: state.history,
    dailyStats: state.dailyStats,
    waterLogMl: state.waterLogMl,
    favoriteWorkoutIds: state.favoriteWorkoutIds,
  };
}

export function normalizeSyncableState(state: SyncableAppState): SyncableAppState {
  const workoutPlans = state.workoutPlans?.length
    ? state.workoutPlans.some((p) => p.id === DEFAULT_PLAN_ID)
      ? state.workoutPlans
      : [createDefaultPlan(), ...state.workoutPlans]
    : [createDefaultPlan()];

  return {
    ...state,
    workoutPlans,
    reminder: {
      ...state.reminder,
      preferredWorkoutIds: normalizePreferredWorkoutIds(
        state.reminder?.preferredWorkoutIds
      ),
    },
  };
}

export function applySyncableState(patch: SyncableAppState): SyncableAppState {
  return normalizeSyncableState(patch);
}

function mergeHistory(a: CompletedSession[], b: CompletedSession[]): CompletedSession[] {
  const map = new Map<string, CompletedSession>();
  for (const entry of [...a, ...b]) map.set(entry.id, entry);
  return [...map.values()]
    .sort((x, y) => y.completedAt.localeCompare(x.completedAt))
    .slice(0, 200);
}

function mergeDailyStats(a: DailyStats[], b: DailyStats[]): DailyStats[] {
  const map = new Map<string, DailyStats>();
  for (const entry of [...a, ...b]) {
    const existing = map.get(entry.date);
    if (!existing) {
      map.set(entry.date, { ...entry });
      continue;
    }
    map.set(entry.date, {
      date: entry.date,
      sessions: Math.max(existing.sessions, entry.sessions),
      minutes: Math.max(existing.minutes, entry.minutes),
      calories: Math.max(existing.calories, entry.calories),
      remindersResponded: Math.max(existing.remindersResponded, entry.remindersResponded),
    });
  }
  return [...map.values()].sort((x, y) => y.date.localeCompare(x.date)).slice(-90);
}

function mergeWater(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Record<string, number> = {};
  for (const key of keys) {
    out[key] = Math.max(a[key] ?? 0, b[key] ?? 0);
  }
  return out;
}

function pickLaterDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function mergeById<T extends { id: string }>(a: T[], b: T[], prefer: 'local' | 'remote'): T[] {
  const map = new Map<string, T>();
  const first = prefer === 'local' ? b : a;
  const second = prefer === 'local' ? a : b;
  for (const item of first) map.set(item.id, item);
  for (const item of second) map.set(item.id, item);
  return [...map.values()];
}

/** Combine local browser data with server data (keeps the richer progress). */
export function mergeAppStates(
  local: SyncableAppState,
  remote: SyncableAppState
): SyncableAppState {
  const localRicher = local.history.length >= remote.history.length;

  return normalizeSyncableState({
    settings: localRicher ? local.settings : remote.settings,
    reminder: localRicher ? local.reminder : remote.reminder,
    hydration: localRicher ? local.hydration : remote.hydration,
    goals: {
      dailySessions: localRicher ? local.goals.dailySessions : remote.goals.dailySessions,
      weeklyMinutes: localRicher ? local.goals.weeklyMinutes : remote.goals.weeklyMinutes,
      dailyCalories: localRicher ? local.goals.dailyCalories : remote.goals.dailyCalories,
      currentStreak: Math.max(local.goals.currentStreak, remote.goals.currentStreak),
      longestStreak: Math.max(local.goals.longestStreak, remote.goals.longestStreak),
      lastActiveDate: pickLaterDate(local.goals.lastActiveDate, remote.goals.lastActiveDate),
    },
    customRoutines: mergeById(local.customRoutines, remote.customRoutines, 'local'),
    workoutPlans: mergeById(local.workoutPlans, remote.workoutPlans, 'local'),
    history: mergeHistory(local.history, remote.history),
    dailyStats: mergeDailyStats(local.dailyStats, remote.dailyStats),
    waterLogMl: mergeWater(local.waterLogMl, remote.waterLogMl),
    favoriteWorkoutIds: [
      ...new Set([...local.favoriteWorkoutIds, ...remote.favoriteWorkoutIds]),
    ],
  });
}

export function countLocalData(state: SyncableAppState): {
  sessions: number;
  plans: number;
  statsDays: number;
} {
  return {
    sessions: state.history.length,
    plans: state.workoutPlans.filter((p) => !p.isDefaultPlan).length,
    statsDays: state.dailyStats.length,
  };
}
