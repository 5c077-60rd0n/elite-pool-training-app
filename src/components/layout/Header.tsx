import { Circle } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-felt-600 bg-felt-900/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div>
          <p className="text-sm text-chalk-300">Fargo Climb</p>
          <p className="text-xs text-ivory-200">Elite Pool Training</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ivory-200" aria-label="sync status">
          <Circle className="h-3 w-3 fill-emerald-400 text-emerald-400" />
          Synced
        </div>
      </div>
    </header>
  );
}
