import { Link } from 'react-router-dom';
import { Plus, Pencil, Play, Star } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DEFAULT_PLAN_ID } from '../data/defaultPlan';
import './PlansPage.css';

export function PlansPage() {
  const plans = useAppStore((s) => s.workoutPlans);
  const removeWorkoutPlan = useAppStore((s) => s.removeWorkoutPlan);

  return (
    <div className="page plans-page">
      <header className="plans-header">
        <div>
          <h1>My workout plans</h1>
          <p className="page-sub">Build custom rep-based routines. Default: 10×4 circuit.</p>
        </div>
        <Link to="/plans/new" className="btn btn-primary">
          <Plus size={18} /> New plan
        </Link>
      </header>

      <ul className="plans-list">
        {plans.map((plan) => (
          <li key={plan.id} className="card plan-card">
            <div className="plan-card-top">
              {plan.isDefaultPlan && (
                <span className="default-badge">
                  <Star size={12} /> Default
                </span>
              )}
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <ul className="plan-ex-summary">
                {plan.exercises.map((e) => (
                  <li key={e.id}>
                    {e.reps ? `${e.reps}× ` : ''}
                    {e.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="plan-actions">
              <Link to={`/workout/${plan.id}`} className="btn btn-primary">
                <Play size={16} /> Start
              </Link>
              <Link to={`/plans/${plan.id}/edit`} className="btn btn-secondary">
                <Pencil size={16} /> Edit
              </Link>
              {!plan.isDefaultPlan && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (confirm(`Delete "${plan.name}"?`)) removeWorkoutPlan(plan.id);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {plans.length === 0 && (
        <p className="empty-state">
          No plans yet.{' '}
          <Link to="/plans/new">Create your first plan</Link>
        </p>
      )}

      <p className="plans-foot">
        Tip: Add your default plan ({DEFAULT_PLAN_ID}) to reminders under{' '}
        <Link to="/reminders">Reminders</Link>.
      </p>
    </div>
  );
}
