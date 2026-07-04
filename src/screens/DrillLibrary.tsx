import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { drills } from '../data/drills';
import { Button } from '../components/ui/Button';
import { useSettingsStore } from '../store/useSettingsStore';
import type { DrillCategory } from '../types/models';

const categories: Array<{ label: string; value: 'all' | DrillCategory }> = [
  { label: 'All', value: 'all' },
  { label: 'Stroke', value: 'stroke-mechanics' },
  { label: 'Aiming', value: 'aiming-systems' },
  { label: 'CB Control', value: 'cue-ball-control' },
  { label: 'Pattern', value: 'pattern-play' },
  { label: 'Safety', value: 'safety' },
  { label: 'Break', value: 'break-optimization' },
  { label: 'Banking', value: 'banking-kicking' },
  { label: 'Mental', value: 'mental-game' },
  { label: 'Straight', value: 'straight-pool' },
];

export default function DrillLibrary() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | DrillCategory>('all');
  const [phaseOnly, setPhaseOnly] = useState(false);
  const currentPhaseRaw = useSettingsStore((s) => s.profile.currentPhase);
  const currentPhase = useMemo(() => {
    const parsed = Number(currentPhaseRaw);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(5, Math.max(1, Math.round(parsed)));
  }, [currentPhaseRaw]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drills.filter((drill) => {
      const matchesQuery = !q || `${drill.name} ${drill.description}`.toLowerCase().includes(q);
      const matchesCategory = category === 'all' || drill.category === category;
      const effectivePhase = currentPhase > 4 ? 4 : currentPhase;
      const matchesPhase = !phaseOnly || drill.applicablePhases.includes(effectivePhase);
      return matchesQuery && matchesCategory && matchesPhase;
    });
  }, [category, currentPhase, phaseOnly, query]);

  return (
    <PageWrapper title="Drill Library">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search drills"
        className="mb-4 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {categories.map((entry) => (
          <Button
            key={entry.value}
            variant={category === entry.value ? 'primary' : 'secondary'}
            className="px-3 py-1 text-sm"
            onClick={() => setCategory(entry.value)}
          >
            {entry.label}
          </Button>
        ))}
      </div>
      <label className="mb-4 flex min-h-11 items-center gap-2 text-sm text-ivory-200">
        <input type="checkbox" checked={phaseOnly} onChange={(event) => setPhaseOnly(event.target.checked)} className="h-4 w-4" />
        Show drills for current phase only
      </label>
      <p className="mb-3 text-xs uppercase tracking-wide text-chalk-300">
        Showing {filtered.length} of {drills.length} drills{phaseOnly ? ` · Phase ${currentPhase}` : ''}
      </p>
      <div className="space-y-3">
        {filtered.map((drill) => (
          <Link key={drill.id} to={`/drills/${drill.id}`}>
            <Card>
              <p className="text-sm text-chalk-300">{drill.category}</p>
              <p className="text-lg text-ivory-100">{drill.name}</p>
              <p className="text-sm text-ivory-200">Difficulty {drill.difficulty}/5 · {drill.durationMinutes} min</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}
