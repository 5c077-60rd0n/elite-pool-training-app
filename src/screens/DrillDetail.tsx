import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { PoolPhysicsDiagram } from '../components/diagrams/PoolPhysicsDiagram';
import { drills } from '../data/drills';
import { useProgressStore } from '../store/useProgressStore';
import { Button } from '../components/ui/Button';

const breakZones: Array<{ id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; x: number; y: number }> = [
  { id: 'A', x: 16, y: 24 },
  { id: 'B', x: 42, y: 24 },
  { id: 'C', x: 68, y: 24 },
  { id: 'D', x: 16, y: 62 },
  { id: 'E', x: 42, y: 62 },
  { id: 'F', x: 68, y: 62 },
];

export default function DrillDetail() {
  const params = useParams();
  const drill = useMemo(() => drills.find((entry) => entry.id === params.drillId), [params.drillId]);
  const breakChartEntries = useProgressStore((s) => s.breakChartEntries);
  const addBreakChartEntry = useProgressStore((s) => s.addBreakChartEntry);
  const [ballMade, setBallMade] = useState(false);
  const [ballsScattered, setBallsScattered] = useState(4);

  const breakEntriesForDrill = useMemo(
    () => breakChartEntries.filter((entry) => entry.game === '9-ball'),
    [breakChartEntries],
  );

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    breakEntriesForDrill.forEach((entry) => {
      counts[entry.cbZone] += 1;
    });
    return counts;
  }, [breakEntriesForDrill]);

  const targetPct = useMemo(() => {
    if (breakEntriesForDrill.length === 0) return 0;
    const target = breakEntriesForDrill.filter((entry) => entry.cbZone === 'B' || entry.cbZone === 'C').length;
    return Math.round((target / breakEntriesForDrill.length) * 100);
  }, [breakEntriesForDrill]);

  function logZone(zone: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'): void {
    addBreakChartEntry({
      date: new Date().toISOString().slice(0, 10),
      game: '9-ball',
      position: 'side-pocket',
      ballMade,
      cbZone: zone,
      ballsScattered,
      notes: '',
    });
  }

  if (!drill) {
    return (
      <PageWrapper title="Drill Detail">
        <Card>
          <p className="text-ivory-100">Drill not found.</p>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={drill.name}>
      <Card className="mb-4">
        <p className="text-sm text-chalk-300">{drill.category}</p>
        <p className="text-ivory-100">{drill.description}</p>
      </Card>
      <Card title="Setup" className="mb-4">
        <p className="text-ivory-100">{drill.setup}</p>
      </Card>
      <Card title="Table Layout" className="mb-4">
        <PoolPhysicsDiagram drill={drill} />
        <pre className="whitespace-pre-wrap rounded-lg bg-felt-800 p-3 text-sm text-ivory-200">{drill.tableLayoutDescription}</pre>
      </Card>
      <Card title="Instructions">
        <ol className="list-decimal space-y-2 pl-5 text-ivory-100">
          {drill.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Card>
      <Card title="Scoring" className="mt-4">
        <p className="mb-2 text-sm text-ivory-200">Method: {drill.scoringMethod.type} ({drill.scoringMethod.unit})</p>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-ivory-200">
          {drill.scoringMethod.trackingFields.map((field) => (
            <li key={field.id}>{field.label}</li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="rounded-lg bg-felt-800 p-2 text-ivory-100">Phase 1: {drill.targetScore.phase1}</p>
          <p className="rounded-lg bg-felt-800 p-2 text-ivory-100">Phase 2: {drill.targetScore.phase2}</p>
          <p className="rounded-lg bg-felt-800 p-2 text-ivory-100">Phase 3: {drill.targetScore.phase3}</p>
          <p className="rounded-lg bg-felt-800 p-2 text-ivory-100">Phase 4: {drill.targetScore.phase4}</p>
        </div>
      </Card>
      <Card title="Pro Tip" className="mt-4">
        <p className="text-ivory-100">{drill.proTip}</p>
      </Card>

      {drill.id === '9-ball-break-zone-chart' ? (
        <Card title="Break Zone Chart" className="mt-4">
          <p className="mb-2 text-sm text-ivory-200">Tap the zone where your cue ball finished.</p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="flex min-h-11 items-center gap-2 text-sm text-ivory-200">
              <input type="checkbox" checked={ballMade} onChange={(event) => setBallMade(event.target.checked)} className="h-4 w-4" />
              Ball made on break
            </label>
            <label className="text-sm text-chalk-300">
              Balls Scattered
              <input
                type="number"
                min={0}
                max={9}
                value={ballsScattered}
                onChange={(event) => setBallsScattered(Number(event.target.value))}
                className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
              />
            </label>
          </div>

          <svg viewBox="0 0 100 100" className="w-full rounded-xl border border-felt-600 bg-felt-900 p-2" aria-label="Break zone table">
            <rect x="4" y="4" width="92" height="92" rx="4" fill="#0a1628" stroke="#0097cc" />
            {breakZones.map((zone) => {
              const count = zoneCounts[zone.id] ?? 0;
              const heatOpacity = breakEntriesForDrill.length >= 10 ? Math.min(0.85, 0.12 + count * 0.08) : 0.16;
              return (
                <g key={zone.id}>
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width="20"
                    height="12"
                    rx="2"
                    fill={`rgba(201, 168, 76, ${heatOpacity})`}
                    stroke="#e8e8e8"
                    className="cursor-pointer"
                    onClick={() => logZone(zone.id)}
                  />
                  <text x={zone.x + 10} y={zone.y + 8} textAnchor="middle" fontSize="6" fill="#e8e8e8">
                    {zone.id}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-ivory-200">
            <p className="rounded-lg bg-felt-800 p-2">Entries: {breakEntriesForDrill.length}</p>
            <p className="rounded-lg bg-felt-800 p-2">Target Zone B/C: {targetPct}%</p>
          </div>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setBallMade(false)}>
            Reset Ball-Made Toggle
          </Button>
        </Card>
      ) : null}
    </PageWrapper>
  );
}
