import { Circle, Flame } from 'lucide-react';
import { useMemo } from 'react';
import { useProgressStore } from '../../store/useProgressStore';
import { getTrainingStreak } from '../../utils/streak';

export function Header() {
  const logs = useProgressStore((s) => s.logs);
  const streak = useMemo(() => getTrainingStreak(logs.map((log) => log.date)), [logs]);

  return (
    <header className="sticky top-0 z-20 border-b border-flash-600/50 bg-felt-900/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/brand/flash-gordon-logo.png" alt="Flash Gordon Pool" className="h-8 w-auto" loading="eager" />
          <p className="hidden text-[11px] uppercase tracking-[0.22em] text-chalk-300 sm:block">Fargo Climb Training Console</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-cue-600/50 bg-felt-800/80 px-2 py-1 text-xs uppercase tracking-wide text-cue-400" aria-label="training streak">
            <Flame className="h-3 w-3" />
            {streak}d
          </div>
          <div className="flex items-center gap-2 rounded-full border border-flash-600/40 bg-felt-800/80 px-2 py-1 text-xs uppercase tracking-wide text-ivory-200" aria-label="sync status">
            <Circle className="h-3 w-3 fill-emerald-400 text-emerald-400" />
            Synced
          </div>
        </div>
      </div>
    </header>
  );
}
