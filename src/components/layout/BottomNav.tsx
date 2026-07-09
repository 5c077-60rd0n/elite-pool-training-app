import { ChartLine, Compass, Grid3x3, House, Timer } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: House },
  { to: '/session/today', label: 'Today', icon: Timer },
  { to: '/navigate', label: 'Navigate', icon: Compass },
  { to: '/progress', label: 'Progress', icon: ChartLine },
  { to: '/more', label: 'Settings', icon: Grid3x3 },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-flash-600/45 bg-felt-900/95 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur sm:pb-[max(env(safe-area-inset-bottom),10px)] sm:pt-2.5">
      <ul className="mx-auto grid w-full max-w-5xl grid-cols-5 gap-1.5 px-2 sm:px-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-12 flex-col items-center justify-center rounded-xl border text-[11px] uppercase tracking-wide sm:min-h-12 sm:text-xs ${
                    isActive
                      ? 'border-flash-500/70 bg-felt-700/90 text-flash-400'
                      : 'border-transparent text-chalk-400/70 hover:border-felt-600 hover:bg-felt-800/80'
                  }`
                }
                aria-label={item.label}
              >
                <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
