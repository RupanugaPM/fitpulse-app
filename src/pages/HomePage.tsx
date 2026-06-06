import { Link } from 'react-router-dom';
import { Bell, Droplets, Flame, Target, Zap, ChevronRight, Camera, Sparkles, Watch } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { formatNextReminderAt } from '../utils/reminderSchedule';
import { getAllWorkouts } from '../data/workoutRegistry';
import { getDefaultReminderWorkout } from '../utils/reminderWorkout';
import { WorkoutCard } from '../components/WorkoutCard';
import {
  useAppStore,
  useTodayStats,
  useTodayWater,
  useWeeklyMinutes,
} from '../store/useAppStore';
import './HomePage.css';

export function HomePage() {
  const goals = useAppStore((s) => s.goals);
  const reminder = useAppStore((s) => s.reminder);
  const hydration = useAppStore((s) => s.hydration);
  const nextReminderAt = useAppStore((s) => s.nextReminderAt);
  const favorites = useAppStore((s) => s.favoriteWorkoutIds);
  const addWater = useAppStore((s) => s.addWater);
  const today = useTodayStats();
  const waterMl = useTodayWater();
  const weeklyMin = useWeeklyMinutes();
  const user = useAuthStore((s) => s.user);

  const favWorkouts = getAllWorkouts().filter((w) => favorites.includes(w.id));
  const defaultPlan = getDefaultReminderWorkout();
  const quickPick = [defaultPlan];

  const sessionProgress = Math.min(100, (today.sessions / goals.dailySessions) * 100);
  const weeklyProgress = Math.min(100, (weeklyMin / goals.weeklyMinutes) * 100);

  return (
    <div className="page home-page">
      <header className="home-hero">
        <div>
          <p className="home-greeting">FitPulse</p>
          <h1>Stay active,<br />stay sharp</h1>
        </div>
        {goals.currentStreak > 0 && (
          <div className="streak-pill">
            <Flame size={18} /> {goals.currentStreak} day streak
          </div>
        )}
      </header>

      <Link to="/pushups" className="ai-pushup-banner card">
        <Camera size={28} className="accent-icon" />
        <div>
          <strong>AI Push-Up Tracker</strong>
          <span>Camera counts reps · earn XP per push-up</span>
        </div>
        <ChevronRight size={18} />
      </Link>

      {user && (
        <Link to="/devices" className="watch-banner card">
          <Watch size={22} className="accent-icon" />
          <div>
            <strong>Apple Watch &amp; devices</strong>
            <span>Sync push-ups and XP from your wrist</span>
          </div>
          <ChevronRight size={18} />
        </Link>
      )}

      {user && (
        <div className="xp-profile card">
          <Sparkles size={22} className="accent-icon" />
          <div>
            <strong>Level {user.level}</strong>
            <span>{user.totalXp.toLocaleString()} XP · {user.totalPushups} push-ups logged</span>
          </div>
          <Link to="/settings" className="profile-link">Profile</Link>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card card">
          <Target size={20} />
          <span className="stat-value">{today.sessions}/{goals.dailySessions}</span>
          <span className="stat-label">Sessions today</span>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${sessionProgress}%` }} />
          </div>
        </div>
        <div className="stat-card card">
          <Zap size={20} />
          <span className="stat-value">{today.minutes}m</span>
          <span className="stat-label">Active minutes</span>
        </div>
        <div className="stat-card card">
          <Flame size={20} />
          <span className="stat-value">{today.calories}</span>
          <span className="stat-label">Cal burned (est.)</span>
        </div>
        <div className="stat-card card wide">
          <span className="stat-label">Weekly goal — {weeklyMin}/{goals.weeklyMinutes} min</span>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${weeklyProgress}%` }} />
          </div>
        </div>
      </div>

      {reminder.enabled ? (
        <Link to="/reminders" className="reminder-status card">
          <Bell size={22} className="accent-icon" />
          <div>
            <strong>Reminders on</strong>
            <span>Every {reminder.intervalMinutes} min</span>
            {nextReminderAt && (
              <span className="next-in">
                Next: {formatNextReminderAt(nextReminderAt)}
              </span>
            )}
          </div>
          <ChevronRight size={18} />
        </Link>
      ) : (
        <Link to="/reminders" className="reminder-status card off">
          <Bell size={22} />
          <div>
            <strong>Enable workout reminders</strong>
            <span>30 min or 1 hour intervals</span>
          </div>
          <ChevronRight size={18} />
        </Link>
      )}

      {hydration.enabled && (
        <div className="hydration-widget card">
          <div className="hydration-header">
            <Droplets size={22} className="accent-icon" />
            <div>
              <strong>Hydration</strong>
              <span>
                {waterMl} / {hydration.dailyGoalMl} ml today
              </span>
            </div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill water"
              style={{
                width: `${Math.min(100, (waterMl / hydration.dailyGoalMl) * 100)}%`,
              }}
            />
          </div>
          <div className="water-btns">
            {[250, 500].map((ml) => (
              <button key={ml} type="button" className="btn btn-secondary" onClick={() => addWater(ml)}>
                +{ml} ml
              </button>
            ))}
          </div>
        </div>
      )}

      <section>
        <div className="section-header">
          <h2 className="section-title">Quick starts</h2>
          <Link to="/workouts">See all</Link>
        </div>
        <div className="quick-scroll">
          {(favWorkouts.length > 0 ? favWorkouts : quickPick).map((w) => (
            <div key={w.id} className="quick-card-wrap">
              <WorkoutCard workout={w} compact />
            </div>
          ))}
        </div>
      </section>

      <p className="home-date">{format(new Date(), 'EEEE, MMMM d')}</p>
    </div>
  );
}
