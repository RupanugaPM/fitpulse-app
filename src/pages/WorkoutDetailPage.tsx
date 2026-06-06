import { useParams, Navigate } from 'react-router-dom';
import { Clock, Flame, List } from 'lucide-react';
import { CATEGORY_LABELS } from '../data/workouts';
import { getWorkoutById } from '../data/workoutRegistry';
import { SessionPlayer } from '../components/SessionPlayer';
import { useState } from 'react';
import './WorkoutDetailPage.css';

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const workout = id ? getWorkoutById(id) : undefined;
  const [started, setStarted] = useState(false);

  if (!workout) return <Navigate to="/workouts" replace />;

  if (started) return <SessionPlayer workout={workout} />;

  return (
    <div className="page workout-detail">
      <span className={`badge cat-${workout.category}`}>
        {CATEGORY_LABELS[workout.category]}
      </span>
      <h1>{workout.name}</h1>
      <p className="detail-desc">{workout.description}</p>

      <div className="detail-meta card">
        <span>
          <Clock size={18} /> {workout.durationMin} minutes
        </span>
        <span>
          <Flame size={18} /> ~{workout.caloriesEstimate} calories
        </span>
        <span className="badge">{workout.difficulty}</span>
      </div>

      <section>
        <h2 className="section-title">
          <List size={14} style={{ display: 'inline', marginRight: 4 }} />
          Exercises ({workout.exercises.length})
        </h2>
        <ol className="exercise-list">
          {workout.exercises.map((e, i) => (
            <li key={e.id} className="card">
              <span className="ex-num">{i + 1}</span>
              <div>
                <strong>{e.name}</strong>
                <p>{e.description}</p>
                <span className="ex-duration">
                  {e.durationSec}s{e.reps ? ` · ${e.reps} reps` : ''}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <button type="button" className="btn btn-primary btn-block start-btn" onClick={() => setStarted(true)}>
        Begin workout
      </button>
    </div>
  );
}
