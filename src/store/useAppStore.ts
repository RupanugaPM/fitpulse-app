import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, startOfDay, isToday, parseISO, differenceInCalendarDays } from 'date-fns';
import type {
  AppState,
  CompletedSession,
  CustomRoutine,
  DailyStats,
  Workout,
} from '../types';
import { createDefaultPlan, DEFAULT_PLAN_ID } from '../data/defaultPlan';
import { normalizePreferredWorkoutIds } from '../utils/reminderWorkout';

const defaultReminder = {
  enabled: false,
  intervalMinutes: 30,
  activeHoursStart: 9,
  activeHoursEnd: 18,
  activeDays: [1, 2, 3, 4, 5],
  preferredWorkoutIds: [DEFAULT_PLAN_ID],
  soundEnabled: true,
  desktopNotifications: true,
};

const defaultState: AppState = {
  settings: {
    theme: 'dark',
    restTimerDefaultSec: 30,
    autoStartRest: true,
    showCalories: true,
    units: 'metric',
    onboardingComplete: false,
  },
  reminder: defaultReminder,
  hydration: {
    enabled: false,
    intervalMinutes: 90,
    dailyGoalMl: 2000,
  },
  goals: {
    dailySessions: 3,
    weeklyMinutes: 90,
    dailyCalories: 150,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
  },
  customRoutines: [],
  workoutPlans: [createDefaultPlan()],
  history: [],
  dailyStats: [],
  waterLogMl: {},
  favoriteWorkoutIds: [],
  lastReminderAt: null,
  nextReminderAt: null,
  snoozeUntil: null,
};

function todayKey() {
  return format(new Date(), 'yyyy-MM-dd');
}

function upsertDaily(
  stats: DailyStats[],
  patch: Partial<DailyStats> & { date: string }
): DailyStats[] {
  const idx = stats.findIndex((s) => s.date === patch.date);
  const existing = idx >= 0 ? stats[idx] : null;
  const { date, ...rest } = patch;
  const base: DailyStats = {
    sessions: 0,
    minutes: 0,
    calories: 0,
    remindersResponded: 0,
    ...existing,
    date,
    ...rest,
  };
  if (idx >= 0) {
    const next = [...stats];
    next[idx] = base;
    return next;
  }
  return [...stats, base].slice(-90);
}

interface AppActions {
  completeOnboarding: () => void;
  updateSettings: (patch: Partial<AppState['settings']>) => void;
  updateReminder: (patch: Partial<AppState['reminder']>) => void;
  updateHydration: (patch: Partial<AppState['hydration']>) => void;
  updateGoals: (patch: Partial<AppState['goals']>) => void;
  toggleFavorite: (workoutId: string) => void;
  addCustomRoutine: (routine: Omit<CustomRoutine, 'id' | 'createdAt'>) => void;
  removeCustomRoutine: (id: string) => void;
  addWorkoutPlan: (plan: Workout) => void;
  updateWorkoutPlan: (id: string, plan: Workout) => void;
  removeWorkoutPlan: (id: string) => void;
  logSession: (session: Omit<CompletedSession, 'id'>) => void;
  logReminderResponse: () => void;
  addWater: (ml: number) => void;
  setWaterForToday: (ml: number) => void;
  setLastReminder: (iso: string | null) => void;
  setNextReminder: (iso: string | null) => void;
  setSnoozeUntil: (iso: string | null) => void;
  updateStreak: () => void;
  resetProgress: () => void;
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...defaultState,

      completeOnboarding: () =>
        set((s) => ({
          settings: { ...s.settings, onboardingComplete: true },
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      updateReminder: (patch) =>
        set((s) => {
          const next = { ...s.reminder, ...patch };
          if (patch.intervalMinutes != null) {
            next.intervalMinutes = Math.min(480, Math.max(5, Math.round(patch.intervalMinutes)));
          }
          return { reminder: next };
        }),

      updateHydration: (patch) =>
        set((s) => ({ hydration: { ...s.hydration, ...patch } })),

      updateGoals: (patch) =>
        set((s) => ({ goals: { ...s.goals, ...patch } })),

      toggleFavorite: (workoutId) =>
        set((s) => {
          const fav = s.favoriteWorkoutIds.includes(workoutId)
            ? s.favoriteWorkoutIds.filter((id) => id !== workoutId)
            : [...s.favoriteWorkoutIds, workoutId];
          return { favoriteWorkoutIds: fav };
        }),

      addCustomRoutine: (routine) =>
        set((s) => ({
          customRoutines: [
            ...s.customRoutines,
            {
              ...routine,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removeCustomRoutine: (id) =>
        set((s) => ({
          customRoutines: s.customRoutines.filter((r) => r.id !== id),
        })),

      addWorkoutPlan: (plan) =>
        set((s) => ({
          workoutPlans: [...s.workoutPlans.filter((p) => p.id !== plan.id), plan],
        })),

      updateWorkoutPlan: (id, plan) =>
        set((s) => ({
          workoutPlans: s.workoutPlans.map((p) => (p.id === id ? { ...plan, id } : p)),
        })),

      removeWorkoutPlan: (id) =>
        set((s) => ({
          workoutPlans: s.workoutPlans.filter((p) => p.id !== id || p.isDefaultPlan),
        })),

      logSession: (session) => {
        const entry: CompletedSession = {
          ...session,
          id: crypto.randomUUID(),
        };
        const date = format(parseISO(entry.completedAt), 'yyyy-MM-dd');
        const minutes = Math.round(entry.durationSec / 60);
        set((s) => {
          const daily = upsertDaily(s.dailyStats, {
            date,
            sessions: (s.dailyStats.find((d) => d.date === date)?.sessions ?? 0) + 1,
            minutes:
              (s.dailyStats.find((d) => d.date === date)?.minutes ?? 0) + minutes,
            calories:
              (s.dailyStats.find((d) => d.date === date)?.calories ?? 0) +
              entry.caloriesBurned,
          });
          return {
            history: [entry, ...s.history].slice(0, 200),
            dailyStats: daily,
          };
        });
        get().updateStreak();
      },

      logReminderResponse: () => {
        const date = todayKey();
        set((s) => ({
          dailyStats: upsertDaily(s.dailyStats, {
            date,
            remindersResponded:
              (s.dailyStats.find((d) => d.date === date)?.remindersResponded ?? 0) + 1,
          }),
        }));
      },

      addWater: (ml) => {
        const key = todayKey();
        set((s) => ({
          waterLogMl: {
            ...s.waterLogMl,
            [key]: (s.waterLogMl[key] ?? 0) + ml,
          },
        }));
      },

      setWaterForToday: (ml) => {
        const key = todayKey();
        set((s) => ({
          waterLogMl: { ...s.waterLogMl, [key]: ml },
        }));
      },

      setLastReminder: (iso) => set({ lastReminderAt: iso }),
      setNextReminder: (iso) => set({ nextReminderAt: iso }),
      setSnoozeUntil: (iso) => set({ snoozeUntil: iso }),

      updateStreak: () => {
        const today = todayKey();
        set((s) => {
          const { goals } = s;
          let streak = goals.currentStreak;
          if (goals.lastActiveDate === today) return s;
          if (goals.lastActiveDate) {
            const diff = differenceInCalendarDays(
              startOfDay(new Date()),
              startOfDay(parseISO(goals.lastActiveDate))
            );
            streak = diff === 1 ? streak + 1 : 1;
          } else {
            streak = 1;
          }
          return {
            goals: {
              ...goals,
              currentStreak: streak,
              longestStreak: Math.max(goals.longestStreak, streak),
              lastActiveDate: today,
            },
          };
        });
      },

      resetProgress: () =>
        set({
          history: [],
          dailyStats: [],
          waterLogMl: {},
          goals: { ...defaultState.goals },
        }),
    }),
    {
      name: 'fitpulse-storage',
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<AppState>) };
        if (!merged.workoutPlans?.length) {
          merged.workoutPlans = [createDefaultPlan()];
        } else if (!merged.workoutPlans.some((p) => p.id === DEFAULT_PLAN_ID)) {
          merged.workoutPlans = [createDefaultPlan(), ...merged.workoutPlans];
        }
        if (merged.reminder) {
          merged.reminder = {
            ...merged.reminder,
            preferredWorkoutIds: normalizePreferredWorkoutIds(
              merged.reminder.preferredWorkoutIds
            ),
          };
        }
        return merged;
      },
    }
  )
);

export function useTodayStats() {
  const dailyStats = useAppStore((s) => s.dailyStats);
  const key = todayKey();
  return (
    dailyStats.find((d) => d.date === key) ?? {
      date: key,
      sessions: 0,
      minutes: 0,
      calories: 0,
      remindersResponded: 0,
    }
  );
}

export function useTodayWater() {
  const waterLogMl = useAppStore((s) => s.waterLogMl);
  return waterLogMl[todayKey()] ?? 0;
}

export function useWeeklyMinutes() {
  const dailyStats = useAppStore((s) => s.dailyStats);
  const now = new Date();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = format(d, 'yyyy-MM-dd');
    total += dailyStats.find((s) => s.date === key)?.minutes ?? 0;
  }
  return total;
}

export function hasWorkedOutToday() {
  const last = useAppStore.getState().goals.lastActiveDate;
  return last ? isToday(parseISO(last)) : false;
}
