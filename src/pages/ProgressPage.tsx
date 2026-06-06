import { useMemo, useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { Trophy, History, Sparkles } from 'lucide-react';
import { useAppStore, useWeeklyMinutes } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { pushupApi, type PushupStats } from '../api/client';
import { formatDuration } from '../utils/format';
import './ProgressPage.css';

export function ProgressPage() {
  const history = useAppStore((s) => s.history);
  const dailyStats = useAppStore((s) => s.dailyStats);
  const goals = useAppStore((s) => s.goals);
  const weeklyMin = useWeeklyMinutes();
  const location = useLocation();
  const justCompleted = (location.state as { justCompleted?: string })?.justCompleted;
  const user = useAuthStore((s) => s.user);
  const [pushupStats, setPushupStats] = useState<PushupStats | null>(null);

  useEffect(() => {
    if (!user) return;
    pushupApi.stats().then(setPushupStats).catch(() => setPushupStats(null));
  }, [user]);

  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = format(d, 'yyyy-MM-dd');
      const stat = dailyStats.find((s) => s.date === key);
      return {
        day: format(d, 'EEE'),
        minutes: stat?.minutes ?? 0,
        sessions: stat?.sessions ?? 0,
      };
    });
  }, [dailyStats]);

  const totalSessions = history.length;
  const totalMinutes = history.reduce((a, h) => a + Math.round(h.durationSec / 60), 0);

  return (
    <div className="page progress-page">
      <h1>Your progress</h1>

      {justCompleted && (
        <div className="celebration-banner card">
          <Trophy size={22} />
          Great job completing {justCompleted}!
        </div>
      )}

      {pushupStats && user && (
        <div className="card pushup-progress-banner">
          <Sparkles size={20} className="accent-icon" />
          <div>
            <strong>Push-up XP — Level {pushupStats.level}</strong>
            <span>
              Today: {pushupStats.todayReps} reps (+{pushupStats.todayXp} XP) · Week:{' '}
              {pushupStats.weekReps} reps
            </span>
            <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
              <div
                className="progress-bar-fill"
                style={{ width: `${pushupStats.levelProgress.progress}%` }}
              />
            </div>
          </div>
          <Link to="/pushups">Track</Link>
        </div>
      )}

      <div className="progress-highlights">
        <div className="card highlight">
          <span className="hl-value">{goals.currentStreak}</span>
          <span className="hl-label">Day streak</span>
        </div>
        <div className="card highlight">
          <span className="hl-value">{goals.longestStreak}</span>
          <span className="hl-label">Best streak</span>
        </div>
        <div className="card highlight">
          <span className="hl-value">{weeklyMin}</span>
          <span className="hl-label">Min this week</span>
        </div>
        <div className="card highlight">
          <span className="hl-value">{totalSessions}</span>
          <span className="hl-label">Total workouts</span>
        </div>
      </div>

      <section className="chart-section card">
        <h2 className="section-title">Last 7 days (minutes)</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={28} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="minutes" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <p className="lifetime-stat">
        Lifetime: {totalMinutes} active minutes across {totalSessions} sessions
      </p>

      <section>
        <h2 className="section-title">
          <History size={14} style={{ display: 'inline', marginRight: 4 }} />
          Recent history
        </h2>
        {history.length === 0 ? (
          <p className="empty-state">Complete a workout to see history here.</p>
        ) : (
          <ul className="history-list">
            {history.slice(0, 15).map((h) => (
              <li key={h.id} className="card history-item">
                <div>
                  <strong>{h.workoutName}</strong>
                  <span>{format(parseISO(h.completedAt), 'MMM d, h:mm a')}</span>
                </div>
                <span className="history-meta">
                  {formatDuration(h.durationSec)} · ~{h.caloriesBurned} cal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
