import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Dumbbell, BarChart3, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { requestNotificationPermission } from '../hooks/useReminderEngine';
import {
  clampReminderMinutes,
  formatReminderInterval,
  REMINDER_PRESETS,
} from '../utils/reminderInterval';
import './OnboardingPage.css';

const slides = [
  {
    icon: Dumbbell,
    title: 'Move more, sit less',
    text: 'FitPulse helps you break up long sitting sessions with quick, effective workouts — right at your desk.',
  },
  {
    icon: Bell,
    title: 'Smart reminders',
    text: 'Set any interval from 5 minutes to 8 hours. Default plan: 10 push-ups, sit-ups, squats, and pull-ups.',
  },
  {
    icon: BarChart3,
    title: 'Track your wins',
    text: 'Build streaks, hit daily goals, and see your active minutes grow over time.',
  },
];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [interval, setInterval] = useState(30);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('45');
  const navigate = useNavigate();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const updateReminder = useAppStore((s) => s.updateReminder);

  const resolvedInterval = customMode
    ? clampReminderMinutes(Number(customInput) || 30)
    : interval;

  const finish = async () => {
    await requestNotificationPermission();
    updateReminder({
      enabled: true,
      intervalMinutes: resolvedInterval,
      activeDays: [1, 2, 3, 4, 5],
      activeHoursStart: 9,
      activeHoursEnd: 18,
    });
    completeOnboarding();
    navigate('/');
  };

  const skip = () => {
    completeOnboarding();
    navigate('/');
  };

  if (step < slides.length) {
    const { icon: Icon, title, text } = slides[step];
    return (
      <div className="onboarding">
        <button type="button" className="skip-btn" onClick={skip}>
          Skip
        </button>
        <div className="onboarding-icon">
          <Icon size={48} />
        </div>
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="dots">
          {slides.map((_, i) => (
            <span key={i} className={i === step ? 'active' : ''} />
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setStep((s) => s + 1)}
        >
          Continue <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="onboarding setup">
      <h1>Set your reminder</h1>
      <p>How often should we nudge you to move?</p>
      <div className="interval-pick">
        {REMINDER_PRESETS.slice(0, 4).map((mins) => (
          <button
            key={mins}
            type="button"
            className={`card interval-card ${!customMode && interval === mins ? 'selected' : ''}`}
            onClick={() => {
              setCustomMode(false);
              setInterval(mins);
            }}
          >
            <strong>Every {formatReminderInterval(mins)}</strong>
          </button>
        ))}
        <button
          type="button"
          className={`card interval-card ${customMode ? 'selected' : ''}`}
          onClick={() => setCustomMode(true)}
        >
          <strong>Custom interval</strong>
          <span>Enter any time between 5 and 480 minutes</span>
        </button>
      </div>
      {customMode && (
        <div className="onboarding-custom card">
          <label htmlFor="onboard-custom-min">Minutes</label>
          <input
            id="onboard-custom-min"
            type="number"
            min={5}
            max={480}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
          />
          <p className="hint">
            Reminder every {formatReminderInterval(resolvedInterval)}
          </p>
        </div>
      )}
      <button type="button" className="btn btn-primary btn-block" onClick={finish}>
        Enable reminders & start
      </button>
      <button type="button" className="btn btn-ghost btn-block" onClick={skip}>
        Set up later
      </button>
    </div>
  );
}
