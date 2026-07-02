import { ChartLine, Grid3x3, House, Target, Timer } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: House },
  { to: '/session/today', label: 'Today', icon: Timer },
  { to: '/drills', label: 'Drills', icon: Target },
  { to: '/progress', label: 'Progress', icon: ChartLine },
  { to: '/more', label: 'More', icon: Grid3x3 },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-felt-600 bg-felt-800/95 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur">
      <ul className="mx-auto grid w-full max-w-5xl grid-cols-5 gap-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-11 flex-col items-center justify-center rounded-xl text-xs ${
                    isActive ? 'text-cue-400' : 'text-chalk-400/60'
                  }`
                }
                aria-label={item.label}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
