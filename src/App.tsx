import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { ReminderAlert } from './components/ReminderAlert';
import { HomePage } from './pages/HomePage';
import { WorkoutsPage } from './pages/WorkoutsPage';
import { WorkoutDetailPage } from './pages/WorkoutDetailPage';
import { RemindersPage } from './pages/RemindersPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { DevicesPage } from './pages/DevicesPage';
import { PlansPage } from './pages/PlansPage';
import { PlanEditorPage } from './pages/PlanEditorPage';
const PushupTrackerPage = lazy(() =>
  import('./pages/PushupTrackerPage').then((m) => ({ default: m.PushupTrackerPage }))
);
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import { useReminderEngine } from './hooks/useReminderEngine';
import { useTheme } from './hooks/useTheme';
import { pickReminderWorkout } from './utils/reminderWorkout';
import type { Workout } from './types';

const AUTH_ROUTES = ['/login', '/auth/callback'];

function AppRoutes() {
  const location = useLocation();
  const onboardingComplete = useAppStore((s) => s.settings.onboardingComplete);
  const setSnoozeUntil = useAppStore((s) => s.setSnoozeUntil);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [alertWorkout, setAlertWorkout] = useState<Workout | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const hideNav =
    AUTH_ROUTES.some((p) => location.pathname.startsWith(p)) ||
    location.pathname.startsWith('/workout/');

  const onReminderFire = useCallback(() => {
    const reminder = useAppStore.getState().reminder;
    const workout = pickReminderWorkout(reminder.preferredWorkoutIds);
    setAlertWorkout(workout);
    setShowAlert(true);
  }, []);

  const { scheduleNext } = useReminderEngine(onReminderFire);

  if (!onboardingComplete && !AUTH_ROUTES.includes(location.pathname)) {
    return <OnboardingPage />;
  }

  return (
    <>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/pushups"
            element={
              <Suspense fallback={<div className="page">Loading AI tracker…</div>}>
                <PushupTrackerPage />
              </Suspense>
            }
          />
          <Route path="/workouts" element={<WorkoutsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/new" element={<PlanEditorPage />} />
          <Route path="/plans/:id/edit" element={<PlanEditorPage />} />
          <Route path="/workout/:id" element={<WorkoutDetailPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!hideNav && <BottomNav />}
      {showAlert && (
        <ReminderAlert
          workout={alertWorkout}
          onDismiss={() => setShowAlert(false)}
          onSnooze={() => {
            setSnoozeUntil(new Date(Date.now() + 10 * 60 * 1000).toISOString());
            setShowAlert(false);
            scheduleNext();
          }}
        />
      )}
    </>
  );
}

export default function App() {
  useTheme();
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
