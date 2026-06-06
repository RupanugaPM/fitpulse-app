import { useState } from 'react';
import { Bell, Clock, Calendar } from 'lucide-react';
import { getAllWorkouts } from '../data/workoutRegistry';
import { DEFAULT_PLAN_ID } from '../data/defaultPlan';
import { useAppStore } from '../store/useAppStore';
import { requestNotificationPermission } from '../hooks/useReminderEngine';
import { formatHour } from '../utils/format';
import {
  clampReminderMinutes,
  formatReminderInterval,
  REMINDER_PRESETS,
} from '../utils/reminderInterval';
import {
  formatNextReminderAt,
  isReminderSlot,
} from '../utils/reminderSchedule';
import './RemindersPage.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RemindersPage() {
  const reminder = useAppStore((s) => s.reminder);
  const updateReminder = useAppStore((s) => s.updateReminder);
  const nextReminderAt = useAppStore((s) => s.nextReminderAt);
  const [notifStatus, setNotifStatus] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState(String(reminder.intervalMinutes));

  const applyCustomInterval = () => {
    const parsed = clampReminderMinutes(Number(customMinutes));
    if (!Number.isFinite(Number(customMinutes))) return;
    setCustomMinutes(String(parsed));
    updateReminder({ intervalMinutes: parsed });
  };

  const suggestedWorkouts = getAllWorkouts()
    .filter((w) => w.isCustom || w.durationMin <= 10)
    .sort((a, b) => {
      if (a.id === DEFAULT_PLAN_ID) return -1;
      if (b.id === DEFAULT_PLAN_ID) return 1;
      return a.name.localeCompare(b.name);
    });

  const toggleDay = (day: number) => {
    const days = reminder.activeDays.includes(day)
      ? reminder.activeDays.filter((d) => d !== day)
      : [...reminder.activeDays, day].sort();
    updateReminder({ activeDays: days });
  };

  const now = new Date();
  const outsideActiveWindow =
    reminder.enabled && nextReminderAt != null && !isReminderSlot(now, reminder);

  const enableReminders = async () => {
    if (reminder.desktopNotifications) {
      const ok = await requestNotificationPermission();
      setNotifStatus(ok ? 'Notifications enabled' : 'Permission denied — enable in browser settings');
    }
    updateReminder({ enabled: true });
  };

  return (
    <div className="page reminders-page">
      <h1>Workout reminders</h1>
      <p className="page-sub">
        Get nudged on any interval you choose — presets or a custom number of minutes.
      </p>

      <div className="reminder-hero card">
        <div className="reminder-toggle-row">
          <div>
            <Bell size={24} className="accent-icon" />
            <strong>Active break reminders</strong>
            <span>{reminder.enabled ? 'On' : 'Off'}</span>
          </div>
          <button
            type="button"
            className={`toggle ${reminder.enabled ? 'on' : ''}`}
            onClick={() =>
              reminder.enabled
                ? updateReminder({ enabled: false })
                : enableReminders()
            }
            aria-pressed={reminder.enabled}
          >
            <span className="toggle-knob" />
          </button>
        </div>
        {nextReminderAt && reminder.enabled && (
          <p className="next-reminder">
            Next reminder: <strong>{formatNextReminderAt(nextReminderAt)}</strong>
            {outsideActiveWindow && (
              <span className="next-reminder-note">
                {' '}
                — outside active hours until then
              </span>
            )}
          </p>
        )}
      </div>

      <section className="settings-section">
        <h2 className="section-title">
          <Clock size={14} /> Interval
        </h2>
        <div className="interval-grid">
          {REMINDER_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              className={`interval-btn ${reminder.intervalMinutes === value ? 'active' : ''}`}
              onClick={() => {
                setCustomMinutes(String(value));
                updateReminder({ intervalMinutes: value });
              }}
            >
              {formatReminderInterval(value)}
            </button>
          ))}
        </div>
        <div className="custom-interval card">
          <label htmlFor="custom-interval-min">Custom interval (5–480 min)</label>
          <div className="custom-interval-row">
            <input
              id="custom-interval-min"
              type="number"
              min={5}
              max={480}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyCustomInterval()}
            />
            <button type="button" className="btn btn-secondary" onClick={applyCustomInterval}>
              Apply
            </button>
          </div>
          <p className="hint">
            Current: every <strong>{formatReminderInterval(reminder.intervalMinutes)}</strong>
          </p>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">
          <Calendar size={14} /> Active hours
        </h2>
        <div className="hours-row card">
          <label>
            From
            <select
              value={reminder.activeHoursStart}
              onChange={(e) =>
                updateReminder({ activeHoursStart: Number(e.target.value) })
              }
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {formatHour(i)}
                </option>
              ))}
            </select>
          </label>
          <label>
            To
            <select
              value={reminder.activeHoursEnd}
              onChange={(e) =>
                updateReminder({ activeHoursEnd: Number(e.target.value) })
              }
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {formatHour(i + 1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="days-row">
          {DAYS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`day-btn ${reminder.activeDays.includes(i) ? 'on' : ''}`}
              onClick={() => toggleDay(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">Suggested workouts</h2>
        <p className="hint">
          <strong>Daily 10×4</strong> (push-ups, sit-ups, squats, pull-ups) is the default break
          when selected. Uncheck it to use other routines instead.
        </p>
        <div className="pref-workouts">
          {suggestedWorkouts.map((w) => {
            const selected = reminder.preferredWorkoutIds.includes(w.id);
            return (
              <button
                key={w.id}
                type="button"
                className={`pref-chip ${selected ? 'on' : ''}`}
                onClick={() => {
                  const ids = selected
                    ? reminder.preferredWorkoutIds.filter((id) => id !== w.id)
                    : [...reminder.preferredWorkoutIds, w.id];
                  updateReminder({
                    preferredWorkoutIds: ids.length ? ids : [w.id],
                  });
                }}
              >
                {w.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="settings-section card toggles-list">
        <div className="toggle-row">
          <span>Desktop notifications</span>
          <button
            type="button"
            className={`toggle ${reminder.desktopNotifications ? 'on' : ''}`}
            onClick={async () => {
              const next = !reminder.desktopNotifications;
              if (next) await requestNotificationPermission();
              updateReminder({ desktopNotifications: next });
            }}
          >
            <span className="toggle-knob" />
          </button>
        </div>
        <div className="toggle-row">
          <span>Reminder sound</span>
          <button
            type="button"
            className={`toggle ${reminder.soundEnabled ? 'on' : ''}`}
            onClick={() => updateReminder({ soundEnabled: !reminder.soundEnabled })}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </section>

      {notifStatus && <p className="notif-status">{notifStatus}</p>}

      <div className="tip-card card">
        <strong>💡 Tip</strong>
        <p>
          Keep this tab open or install FitPulse as an app (Add to Home Screen) for
          reliable reminders while you work.
        </p>
      </div>
    </div>
  );
}
