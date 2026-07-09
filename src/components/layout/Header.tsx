import { Circle, Flame } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTrackerStore } from '../../store/useTrackerStore';
import { getTrainingStreak } from '../../utils/streak';

export function Header() {
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const syncState = useTrackerStore((s) => s.syncState);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const streak = useMemo(() => getTrainingStreak(logs.map((log) => log.date)), [logs]);
  const pendingSyncCount = syncState.pendingLogIds.length;
  const conflictCount = syncState.conflicts?.length ?? 0;
  const syncLabel = !isOnline
    ? 'Offline'
    : conflictCount
      ? `Conflicts ${conflictCount}`
      : pendingSyncCount
        ? `Sync ${pendingSyncCount}`
        : 'Synced';
  const syncToneClass = !isOnline
    ? 'fill-cue-400 text-cue-400'
    : conflictCount
      ? 'fill-rose-400 text-rose-400'
      : pendingSyncCount
      ? 'fill-flash-400 text-flash-400'
      : 'fill-emerald-400 text-emerald-400';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-flash-600/50 bg-felt-900/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/brand/flash-gordon-logo.png" alt="Flash Gordon Pool" width={320} height={135} className="h-8 w-auto" loading="eager" />
          <p className="hidden text-[11px] uppercase tracking-[0.22em] text-chalk-300 sm:block">Fargo Climb Training Console</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-cue-600/50 bg-felt-800/80 px-2 py-1 text-xs uppercase tracking-wide text-cue-400" aria-label="training streak">
            <Flame className="h-3 w-3" />
            {streak}d
          </div>
          <div className="flex items-center gap-2 rounded-full border border-flash-600/40 bg-felt-800/80 px-2 py-1 text-xs uppercase tracking-wide text-ivory-200" aria-label="sync status">
            <Circle className={`h-3 w-3 ${syncToneClass}`} />
            {syncLabel}
          </div>
        </div>
      </div>
    </header>
  );
}
