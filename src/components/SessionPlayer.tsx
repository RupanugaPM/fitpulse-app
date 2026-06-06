import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Play, SkipForward, X, Check } from 'lucide-react';
import type { Workout } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatCountdown } from '../utils/format';
import './SessionPlayer.css';

type Phase = 'exercise' | 'rest' | 'complete';

interface Props {
  workout: Workout;
}

export function SessionPlayer({ workout }: Props) {
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const logSession = useAppStore((s) => s.logSession);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('exercise');
  const [timeLeft, setTimeLeft] = useState(workout.exercises[0]?.durationSec ?? 30);
  const [paused, setPaused] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [startedAt] = useState(() => Date.now());

  const exercise = workout.exercises[exerciseIndex];
  const progress =
    workout.exercises.length > 0
      ? ((exerciseIndex + (phase === 'rest' ? 0.5 : 1)) / workout.exercises.length) * 100
      : 0;

  const goNext = useCallback(() => {
    if (exerciseIndex >= workout.exercises.length - 1) {
      setPhase('complete');
      return;
    }
    if (settings.autoStartRest && phase === 'exercise') {
      setPhase('rest');
      setTimeLeft(settings.restTimerDefaultSec);
    } else {
      const next = exerciseIndex + 1;
      setExerciseIndex(next);
      setPhase('exercise');
      setTimeLeft(workout.exercises[next].durationSec);
    }
  }, [exerciseIndex, workout, phase, settings]);

  useEffect(() => {
    if (paused || phase === 'complete') return;
    if (timeLeft <= 0) {
      if (phase === 'rest') {
        const next = exerciseIndex + 1;
        setExerciseIndex(next);
        setPhase('exercise');
        setTimeLeft(workout.exercises[next].durationSec);
      } else {
        goNext();
      }
      return;
    }
    const t = setInterval(() => {
      setTimeLeft((s) => s - 1);
      setTotalElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, paused, phase, goNext, exerciseIndex, workout.exercises]);

  const skipExercise = () => {
    if (exerciseIndex >= workout.exercises.length - 1) {
      setPhase('complete');
    } else {
      const next = exerciseIndex + 1;
      setExerciseIndex(next);
      setPhase('exercise');
      setTimeLeft(workout.exercises[next].durationSec);
    }
  };

  const finish = () => {
    const durationSec = Math.round((Date.now() - startedAt) / 1000);
    logSession({
      workoutId: workout.id,
      workoutName: workout.name,
      completedAt: new Date().toISOString(),
      durationSec,
      caloriesBurned: workout.caloriesEstimate,
      exercisesCompleted: exerciseIndex + 1,
    });
    navigate('/progress', { state: { justCompleted: workout.name } });
  };

  const quit = () => {
    if (confirm('End workout early? Progress won’t be saved.')) navigate(-1);
  };

  if (phase === 'complete') {
    return (
      <div className="session-player complete">
        <div className="complete-icon">
          <Check size={48} />
        </div>
        <h1>Workout complete!</h1>
        <p>You finished {workout.name}</p>
        <p className="session-stat">{formatCountdown(totalElapsed)} total time</p>
        <button type="button" className="btn btn-primary btn-block" onClick={finish}>
          Save & view progress
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="session-player">
      <header className="session-header">
        <button type="button" onClick={quit} aria-label="Quit">
          <X size={22} />
        </button>
        <span>
          {exerciseIndex + 1} / {workout.exercises.length}
        </span>
        <button type="button" onClick={() => setPaused((p) => !p)}>
          {paused ? <Play size={22} /> : <Pause size={22} />}
        </button>
      </header>

      <div className="session-progress progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="session-timer-ring">
        <span className="timer-display">{formatCountdown(timeLeft)}</span>
        <span className="timer-phase">{phase === 'rest' ? 'Rest' : 'Go!'}</span>
      </div>

      {exercise && (
        <div className="session-exercise card">
          <h2>{exercise.name}</h2>
          <p>{exercise.description}</p>
          {exercise.reps && (
            <p className="reps-hint">{exercise.reps} reps suggested</p>
          )}
          {exercise.tips && <p className="exercise-tip">💡 {exercise.tips}</p>}
        </div>
      )}

      <div className="session-controls">
        <button type="button" className="btn btn-secondary" onClick={skipExercise}>
          <SkipForward size={18} /> Skip
        </button>
        {phase === 'exercise' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (settings.autoStartRest && exerciseIndex < workout.exercises.length - 1) {
                setPhase('rest');
                setTimeLeft(settings.restTimerDefaultSec);
              } else goNext();
            }}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
