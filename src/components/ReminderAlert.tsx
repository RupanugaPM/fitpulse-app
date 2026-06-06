import { useNavigate } from 'react-router-dom';
import { X, Play, Clock } from 'lucide-react';
import type { Workout } from '../types';
import { useAppStore } from '../store/useAppStore';
import './ReminderAlert.css';

interface Props {
  workout: Workout | null;
  onDismiss: () => void;
  onSnooze: () => void;
}

export function ReminderAlert({ workout, onDismiss, onSnooze }: Props) {
  const navigate = useNavigate();
  const logReminderResponse = useAppStore((s) => s.logReminderResponse);

  const startNow = () => {
    logReminderResponse();
    onDismiss();
    if (workout) navigate(`/workout/${workout.id}`);
    else navigate('/workouts');
  };

  return (
    <div className="reminder-overlay" role="dialog" aria-modal="true" aria-labelledby="reminder-title">
      <div className="reminder-modal card">
        <button type="button" className="reminder-close" onClick={onDismiss} aria-label="Dismiss">
          <X size={20} />
        </button>
        <div className="reminder-pulse" aria-hidden />
        <h2 id="reminder-title">Time to move!</h2>
        <p className="reminder-sub">
          {workout
            ? `Suggested: ${workout.name} (${workout.durationMin} min)`
            : 'Take a quick active break to stay energized.'}
        </p>
        <div className="reminder-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={startNow}>
            <Play size={18} /> Start now
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onSnooze}>
            <Clock size={18} /> Snooze 10 min
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={onDismiss}>
            Skip this time
          </button>
        </div>
      </div>
    </div>
  );
}
