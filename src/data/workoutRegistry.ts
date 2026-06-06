import type { Workout } from '../types';
import { WORKOUTS } from './workouts';
import { useAppStore } from '../store/useAppStore';

export function getUserPlans(): Workout[] {
  return useAppStore.getState().workoutPlans;
}

export function getAllWorkouts(): Workout[] {
  const plans = getUserPlans();
  const planIds = new Set(plans.map((p) => p.id));
  const library = WORKOUTS.filter((w) => !planIds.has(w.id));
  return [...plans, ...library];
}

export function getWorkoutById(id: string): Workout | undefined {
  const plan = getUserPlans().find((p) => p.id === id);
  if (plan) return plan;
  return WORKOUTS.find((w) => w.id === id);
}
