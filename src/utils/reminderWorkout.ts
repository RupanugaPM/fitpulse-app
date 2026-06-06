import { DEFAULT_PLAN_ID, createDefaultPlan } from '../data/defaultPlan';
import { getAllWorkouts, getUserPlans } from '../data/workoutRegistry';
import type { Workout } from '../types';

/** Old built-in IDs that were auto-selected before custom plans existed. */
export const LEGACY_REMINDER_WORKOUT_IDS = ['desk-reset-5', 'micro-2'] as const;

export function getDefaultReminderWorkout(): Workout {
  const plans = getUserPlans();
  return plans.find((p) => p.id === DEFAULT_PLAN_ID) ?? createDefaultPlan();
}

/**
 * Pick the workout shown when a reminder fires.
 * When the default 10×4 plan is selected, it always wins (not random library routines).
 */
export function pickReminderWorkout(preferredWorkoutIds: string[]): Workout {
  const defaultPlan = getDefaultReminderWorkout();

  if (preferredWorkoutIds.includes(DEFAULT_PLAN_ID)) {
    return defaultPlan;
  }

  const all = getAllWorkouts();
  const preferred = all.filter((w) => preferredWorkoutIds.includes(w.id));
  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)];
  }

  return defaultPlan;
}

/** Normalize persisted reminder preferences after app updates. */
export function normalizePreferredWorkoutIds(ids: string[] | undefined): string[] {
  const list = ids?.length ? [...ids] : [DEFAULT_PLAN_ID];

  if (!list.includes(DEFAULT_PLAN_ID)) {
    return [DEFAULT_PLAN_ID, ...list];
  }

  const hasLegacy = LEGACY_REMINDER_WORKOUT_IDS.some((id) => list.includes(id));
  if (hasLegacy && list.length > 1) {
    return [DEFAULT_PLAN_ID];
  }

  return list;
}
