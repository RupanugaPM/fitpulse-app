import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getWorkoutById } from '../data/workoutRegistry';
import type { PlanExerciseInput, Workout, WorkoutCategory, Difficulty } from '../types';
import './PlanEditorPage.css';

const emptyExercise = (): PlanExerciseInput => ({
  name: '',
  reps: 10,
  durationSec: 45,
  description: '',
});

function planToWorkout(
  id: string,
  name: string,
  description: string,
  category: WorkoutCategory,
  difficulty: Difficulty,
  exercises: PlanExerciseInput[],
  isDefaultPlan?: boolean
): Workout {
  const valid = exercises.filter((e) => e.name.trim());
  const durationMin = Math.max(1, Math.ceil(valid.reduce((a, e) => a + e.durationSec, 0) / 60));
  return {
    id,
    name: name.trim() || 'My plan',
    description: description.trim() || 'Custom workout plan',
    category,
    difficulty,
    durationMin,
    caloriesEstimate: Math.round(durationMin * 8),
    tags: ['my-plan'],
    isCustom: true,
    isDefaultPlan,
    exercises: valid.map((e, i) => ({
      id: `${id}-ex-${i}`,
      name: e.name.trim(),
      description: e.description?.trim() || `${e.reps} reps`,
      durationSec: e.durationSec,
      reps: e.reps,
      tips: e.tips,
    })),
  };
}

export function PlanEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const existing = !isNew && id ? getWorkoutById(id) : undefined;
  const addWorkoutPlan = useAppStore((s) => s.addWorkoutPlan);
  const updateWorkoutPlan = useAppStore((s) => s.updateWorkoutPlan);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WorkoutCategory>('strength');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [exercises, setExercises] = useState<PlanExerciseInput[]>([emptyExercise()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing?.isCustom) {
      setName(existing.name);
      setDescription(existing.description);
      setCategory(existing.category);
      setDifficulty(existing.difficulty);
      setExercises(
        existing.exercises.map((e) => ({
          name: e.name,
          reps: e.reps ?? 10,
          durationSec: e.durationSec,
          description: e.description,
          tips: e.tips,
        }))
      );
    } else if (isNew) {
      setExercises([
        { name: 'Push-ups', reps: 10, durationSec: 50, description: '10 push-ups' },
        { name: 'Sit-ups', reps: 10, durationSec: 45, description: '10 sit-ups' },
        { name: 'Squats', reps: 10, durationSec: 50, description: '10 squats' },
        { name: 'Pull-ups', reps: 10, durationSec: 50, description: '10 pull-ups' },
      ]);
      setName('My custom plan');
    }
  }, [existing, isNew]);

  const updateEx = (index: number, patch: Partial<PlanExerciseInput>) => {
    setExercises((list) => list.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const save = () => {
    setError(null);
    if (!name.trim()) {
      setError('Plan name is required');
      return;
    }
    if (exercises.every((e) => !e.name.trim())) {
      setError('Add at least one exercise');
      return;
    }

    const planId = isNew ? `plan-${crypto.randomUUID().slice(0, 8)}` : id!;
    const workout = planToWorkout(
      planId,
      name,
      description,
      category,
      difficulty,
      exercises,
      existing?.isDefaultPlan
    );

    if (isNew) addWorkoutPlan(workout);
    else updateWorkoutPlan(planId, workout);

    navigate('/plans');
  };

  return (
    <div className="page plan-editor-page">
      <Link to="/plans" className="back-link">
        ← My plans
      </Link>
      <h1>{isNew ? 'Create plan' : 'Edit plan'}</h1>

      <div className="card editor-section">
        <label>
          Plan name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning routine" />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What this plan is for"
          />
        </label>
        <div className="row-2">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as WorkoutCategory)}>
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="core">Core</option>
              <option value="desk">Desk</option>
              <option value="stretch">Stretch</option>
              <option value="mobility">Mobility</option>
              <option value="yoga">Yoga</option>
            </select>
          </label>
          <label>
            Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>
      </div>

      <h2 className="section-title">Exercises</h2>
      <p className="hint">Set reps and time per exercise block (timer during workout).</p>

      <div className="exercise-list">
        {exercises.map((ex, i) => (
          <div key={i} className="card exercise-row">
            <GripVertical size={16} className="grip" aria-hidden />
            <div className="ex-fields">
              <input
                placeholder="Exercise name"
                value={ex.name}
                onChange={(e) => updateEx(i, { name: e.target.value })}
              />
              <input
                placeholder="Notes (optional)"
                value={ex.description ?? ''}
                onChange={(e) => updateEx(i, { description: e.target.value })}
              />
              <div className="ex-numbers">
                <label>
                  Reps
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={ex.reps}
                    onChange={(e) => updateEx(i, { reps: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Timer (sec)
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={ex.durationSec}
                    onChange={(e) => updateEx(i, { durationSec: Number(e.target.value) })}
                  />
                </label>
              </div>
            </div>
            {exercises.length > 1 && (
              <button
                type="button"
                className="btn-icon"
                onClick={() => setExercises((list) => list.filter((_, j) => j !== i))}
                aria-label="Remove exercise"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={() => setExercises((list) => [...list, emptyExercise()])}
      >
        <Plus size={18} /> Add exercise
      </button>

      {error && <p className="editor-error">{error}</p>}

      <button type="button" className="btn btn-primary btn-block save-btn" onClick={save}>
        Save plan
      </button>
    </div>
  );
}
