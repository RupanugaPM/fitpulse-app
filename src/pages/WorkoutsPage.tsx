import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ListChecks } from 'lucide-react';
import { WORKOUTS, CATEGORY_LABELS } from '../data/workouts';
import { useAppStore } from '../store/useAppStore';
import { WorkoutCard } from '../components/WorkoutCard';
import type { WorkoutCategory } from '../types';
import './WorkoutsPage.css';

const categories: (WorkoutCategory | 'all')[] = [
  'all',
  'desk',
  'cardio',
  'stretch',
  'strength',
  'core',
  'mobility',
  'yoga',
];

export function WorkoutsPage() {
  const plans = useAppStore((s) => s.workoutPlans);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<WorkoutCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return WORKOUTS.filter((w) => {
      if (category !== 'all' && w.category !== category) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.tags.some((t) => t.includes(q))
      );
    });
  }, [search, category]);

  const filteredPlans = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return plans;
    return plans.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.exercises.some((e) => e.name.toLowerCase().includes(q))
    );
  }, [search, plans]);

  return (
    <div className="page workouts-page">
      <header className="workouts-header">
        <div>
          <h1>Workouts</h1>
          <p className="page-sub">Your plans + guided library</p>
        </div>
        <Link to="/plans/new" className="btn btn-primary btn-sm">
          <Plus size={16} /> New plan
        </Link>
      </header>

      <section className="my-plans-section">
        <div className="section-head">
          <h2 className="section-title">
            <ListChecks size={14} /> My plans
          </h2>
          <Link to="/plans" className="link-muted">
            Manage
          </Link>
        </div>
        <div className="workout-list compact">
          {filteredPlans.length === 0 ? (
            <p className="empty-state small">
              No plans match. <Link to="/plans/new">Create one</Link>
            </p>
          ) : (
            filteredPlans.map((w) => <WorkoutCard key={w.id} workout={w} />)
          )}
        </div>
      </section>

      <h2 className="section-title library-title">Library</h2>

      <div className="search-box">
        <Search size={18} />
        <input
          type="search"
          placeholder="Search workouts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="category-chips" role="tablist">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={category === cat}
            className={`chip ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="workout-list">
        {filtered.length === 0 ? (
          <p className="empty-state">No workouts match your search.</p>
        ) : (
          filtered.map((w) => <WorkoutCard key={w.id} workout={w} />)
        )}
      </div>
    </div>
  );
}
