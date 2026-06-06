import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Camera, BarChart3, Settings } from 'lucide-react';
import './BottomNav.css';

const links = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/pushups', icon: Camera, label: 'Pushups' },
  { to: '/workouts', icon: Dumbbell, label: 'Workouts' },
  { to: '/progress', icon: BarChart3, label: 'Progress' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `bottom-nav-link ${isActive ? 'active' : ''}`
          }
        >
          <Icon size={22} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
