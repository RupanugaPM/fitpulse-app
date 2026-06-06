import { Link } from 'react-router-dom';
import { Clock, Flame, Star } from 'lucide-react';
import type { Workout } from '../types';
import { CATEGORY_LABELS } from '../data/workouts';
import { useAppStore } from '../store/useAppStore';
import './WorkoutCard.css';

interface Props {
  workout: Workout;
  compact?: boolean;
}

export function WorkoutCard({ workout, compact }: Props) {
  const favorites = useAppStore((s) => s.favoriteWorkoutIds);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const isFav = favorites.includes(workout.id);

  return (
    <article className={`workout-card card ${compact ? 'compact' : ''}`}>
      <div className="workout-card-top">
        <span className={`badge cat-${workout.category}`}>
          {CATEGORY_LABELS[workout.category]}
        </span>
        <button
          type="button"
          className={`fav-btn ${isFav ? 'on' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(workout.id);
          }}
          aria-label={isFav ? 'Remove favorite' : 'Add favorite'}
        >
          <Star size={18} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h3>{workout.name}</h3>
      {!compact && <p className="workout-desc">{workout.description}</p>}
      <div className="workout-meta">
        <span>
          <Clock size={14} /> {workout.durationMin} min
        </span>
        <span>
          <Flame size={14} /> ~{workout.caloriesEstimate} cal
        </span>
        <span className="badge">{workout.difficulty}</span>
      </div>
      <Link to={`/workout/${workout.id}`} className="btn btn-primary btn-block">
        Start workout
      </Link>
    </article>
  );
}
