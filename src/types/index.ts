export type WorkoutCategory =
  | 'stretch'
  | 'strength'
  | 'cardio'
  | 'mobility'
  | 'desk'
  | 'core'
  | 'yoga';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/** Reminder interval in minutes (5–480) */
export type ReminderInterval = number;

export interface Exercise {
  id: string;
  name: string;
  description: string;
  durationSec: number;
  reps?: number;
  tips?: string;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  category: WorkoutCategory;
  difficulty: Difficulty;
  durationMin: number;
  caloriesEstimate: number;
  exercises: Exercise[];
  tags: string[];
  isCustom?: boolean;
  isDefaultPlan?: boolean;
}

/** User-defined rep-based plan (stored as Workout) */
export interface PlanExerciseInput {
  name: string;
  reps: number;
  durationSec: number;
  description?: string;
  tips?: string;
}

export interface CustomRoutine {
  id: string;
  name: string;
  exerciseIds: string[];
  createdAt: string;
}

export interface CompletedSession {
  id: string;
  workoutId: string;
  workoutName: string;
  completedAt: string;
  durationSec: number;
  caloriesBurned: number;
  exercisesCompleted: number;
}

export interface DailyStats {
  date: string;
  sessions: number;
  minutes: number;
  calories: number;
  remindersResponded: number;
}

export interface ReminderSettings {
  enabled: boolean;
  intervalMinutes: ReminderInterval;
  activeHoursStart: number;
  activeHoursEnd: number;
  activeDays: number[];
  preferredWorkoutIds: string[];
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

export interface HydrationSettings {
  enabled: boolean;
  intervalMinutes: 60 | 90 | 120;
  dailyGoalMl: number;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  restTimerDefaultSec: number;
  autoStartRest: boolean;
  showCalories: boolean;
  units: 'metric' | 'imperial';
  onboardingComplete: boolean;
}

export interface UserGoals {
  dailySessions: number;
  weeklyMinutes: number;
  dailyCalories: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface AppState {
  settings: AppSettings;
  reminder: ReminderSettings;
  hydration: HydrationSettings;
  goals: UserGoals;
  customRoutines: CustomRoutine[];
  workoutPlans: Workout[];
  history: CompletedSession[];
  dailyStats: DailyStats[];
  waterLogMl: Record<string, number>;
  favoriteWorkoutIds: string[];
  lastReminderAt: string | null;
  nextReminderAt: string | null;
  snoozeUntil: string | null;
}
