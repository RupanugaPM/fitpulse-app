import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { migrateLocalDataToSql } from '../hooks/useAppStateSync';
import { countLocalData, pickSyncableState } from '../utils/appStateSync';
import { Droplets, Target, Trash2, LogOut, User, Watch, CloudUpload } from 'lucide-react';
import './SettingsPage.css';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const settings = useAppStore((s) => s.settings);
  const hydration = useAppStore((s) => s.hydration);
  const goals = useAppStore((s) => s.goals);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateHydration = useAppStore((s) => s.updateHydration);
  const updateGoals = useAppStore((s) => s.updateGoals);
  const resetProgress = useAppStore((s) => s.resetProgress);
  const [migrateStatus, setMigrateStatus] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);

  const localCounts = countLocalData(pickSyncableState(useAppStore.getState()));

  const runMigration = async () => {
    setMigrating(true);
    setMigrateStatus(null);
    try {
      const result = await migrateLocalDataToSql();
      setMigrateStatus(
        result.ok
          ? `${result.message} (${result.counts.sessions} sessions, ${result.counts.plans} custom plans, ${result.counts.statsDays} stat days)`
          : result.message
      );
    } catch {
      setMigrateStatus('Upload failed — is the API server running on port 3001?');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="page settings-page">
      <h1>Settings</h1>

      <section className="settings-section card account-section">
        <h2 className="section-title">
          <User size={14} /> Account
        </h2>
        {user ? (
          <>
            <div className="account-info">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="avatar" />
              ) : (
                <div className="avatar placeholder">{user.displayName[0]}</div>
              )}
              <div>
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
                <span className="xp-line">
                  Level {user.level} · {user.totalXp.toLocaleString()} XP ·{' '}
                  {user.totalPushups} push-ups
                </span>
              </div>
            </div>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => logout()}>
              <LogOut size={18} /> Sign out
            </button>
            <div className="sync-block">
              <p className="account-hint">
                This device: {localCounts.sessions} sessions, {localCounts.plans} custom plans,{' '}
                {localCounts.statsDays} days of stats in local storage.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={migrating}
                onClick={runMigration}
              >
                <CloudUpload size={18} /> Upload local data to SQL
              </button>
              {migrateStatus && <p className="migrate-status">{migrateStatus}</p>}
            </div>
          </>
        ) : (
          <>
            <p className="account-hint">
              Sign in to sync reminders, workout plans, progress, XP, and push-ups across browsers.
            </p>
            <Link to="/login" className="btn btn-primary btn-block">
              Sign in / Register
            </Link>
          </>
        )}
      </section>

      <Link to="/devices" className="btn btn-secondary btn-block devices-link" style={{ marginBottom: '0.5rem' }}>
        <Watch size={18} /> Devices &amp; Apple Watch
      </Link>

      <Link to="/reminders" className="btn btn-secondary btn-block" style={{ marginBottom: '1rem' }}>
        Workout reminder schedule
      </Link>

      <section className="settings-section">
        <h2 className="section-title">Appearance</h2>
        <div className="theme-picker">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`theme-btn ${settings.theme === t ? 'active' : ''}`}
              onClick={() => updateSettings({ theme: t })}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section card toggles-list">
        <h2 className="section-title">Workout session</h2>
        <div className="toggle-row">
          <span>Auto-start rest timer</span>
          <button
            type="button"
            className={`toggle ${settings.autoStartRest ? 'on' : ''}`}
            onClick={() => updateSettings({ autoStartRest: !settings.autoStartRest })}
          >
            <span className="toggle-knob" />
          </button>
        </div>
        <label className="setting-label">
          Default rest (seconds)
          <input
            type="number"
            min={10}
            max={120}
            value={settings.restTimerDefaultSec}
            onChange={(e) =>
              updateSettings({ restTimerDefaultSec: Number(e.target.value) })
            }
          />
        </label>
        <div className="toggle-row">
          <span>Show calorie estimates</span>
          <button
            type="button"
            className={`toggle ${settings.showCalories ? 'on' : ''}`}
            onClick={() => updateSettings({ showCalories: !settings.showCalories })}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </section>

      <section className="settings-section card">
        <h2 className="section-title">
          <Droplets size={14} /> Hydration reminders
        </h2>
        <div className="toggle-row">
          <span>Enable water tracking</span>
          <button
            type="button"
            className={`toggle ${hydration.enabled ? 'on' : ''}`}
            onClick={() => updateHydration({ enabled: !hydration.enabled })}
          >
            <span className="toggle-knob" />
          </button>
        </div>
        {hydration.enabled && (
          <label className="setting-label">
            Daily goal (ml)
            <input
              type="number"
              step={250}
              min={500}
              max={5000}
              value={hydration.dailyGoalMl}
              onChange={(e) =>
                updateHydration({ dailyGoalMl: Number(e.target.value) })
              }
            />
          </label>
        )}
      </section>

      <section className="settings-section card">
        <h2 className="section-title">
          <Target size={14} /> Daily goals
        </h2>
        <label className="setting-label">
          Sessions per day
          <input
            type="number"
            min={1}
            max={12}
            value={goals.dailySessions}
            onChange={(e) => updateGoals({ dailySessions: Number(e.target.value) })}
          />
        </label>
        <label className="setting-label">
          Weekly minutes target
          <input
            type="number"
            min={30}
            max={600}
            step={15}
            value={goals.weeklyMinutes}
            onChange={(e) => updateGoals({ weeklyMinutes: Number(e.target.value) })}
          />
        </label>
      </section>

      <section className="settings-section">
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={() => {
            if (confirm('Reset all progress, history, and streaks? This cannot be undone.')) {
              resetProgress();
            }
          }}
        >
          <Trash2 size={18} /> Reset all progress
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ marginTop: '0.5rem' }}
          onClick={() => {
            updateSettings({ onboardingComplete: false });
            window.location.reload();
          }}
        >
          Replay onboarding
        </button>
      </section>

      <p className="app-version">FitPulse v1.0 · Built for active breaks</p>
    </div>
  );
}
