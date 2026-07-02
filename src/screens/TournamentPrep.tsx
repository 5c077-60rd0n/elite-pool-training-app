import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { useProgressStore } from '../store/useProgressStore';
import type { PrepChecklist, TournamentPrep } from '../types/models';
import { drills } from '../data/drills';

function prepStartDate(date: string): string {
  const target = new Date(`${date}T00:00:00`);
  target.setDate(target.getDate() - 14);
  return target.toISOString().slice(0, 10);
}

function buildChecklist(): PrepChecklist[] {
  const steps: Array<{ label: string; daysOut: number }> = [
    { label: 'Finalize break and opening pattern plan', daysOut: 14 },
    { label: 'Review safety response trees', daysOut: 7 },
    { label: 'Play race simulation set', daysOut: 4 },
    { label: 'Light technical tune-up only', daysOut: 3 },
    { label: 'Equipment and travel checklist', daysOut: 2 },
    { label: 'Mental routine walkthrough', daysOut: 1 },
    { label: 'Event-day warm-up protocol', daysOut: 0 },
  ];

  return steps.map((step) => ({
    id: `prep-${step.daysOut}`,
    label: step.label,
    daysOut: step.daysOut,
    completed: false,
  }));
}

export default function TournamentPrep() {
  const tournamentPreps = useProgressStore((s) => s.tournamentPreps);
  const upsertTournamentPrep = useProgressStore((s) => s.upsertTournamentPrep);

  const [tournamentName, setTournamentName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState('Race to 7');
  const [location, setLocation] = useState('');
  const [bestDecisions, setBestDecisions] = useState('');
  const [weakestDecisions, setWeakestDecisions] = useState('');
  const [primarySkillGap, setPrimarySkillGap] = useState('');
  const [linkedDrillId, setLinkedDrillId] = useState('');
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');

  const latest = tournamentPreps[0];
  const eventReached = latest ? new Date(`${latest.date}T23:59:59`).getTime() <= Date.now() : false;

  const completionPercent = useMemo(() => {
    if (!latest || latest.checklistItems.length === 0) return 0;
    const done = latest.checklistItems.filter((item) => item.completed).length;
    return Math.round((done / latest.checklistItems.length) * 100);
  }, [latest]);

  function createPrep(): void {
    const entry: TournamentPrep = {
      id: `tp-${Date.now()}`,
      tournamentName,
      date,
      format,
      location,
      prepStartDate: prepStartDate(date),
      currentStep: 1,
      checklistItems: buildChecklist(),
    };
    upsertTournamentPrep(entry);
  }

  function toggleChecklist(itemId: string): void {
    if (!latest) return;
    const checklistItems = latest.checklistItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    );
    const completed = checklistItems.filter((item) => item.completed).length;
    upsertTournamentPrep({
      ...latest,
      checklistItems,
      currentStep: Math.min(checklistItems.length, completed + 1),
    });
  }

  function savePostEventAnalysis(): void {
    if (!latest) return;
    upsertTournamentPrep({
      ...latest,
      postEventAnalysis: {
        result,
        bestDecisions: bestDecisions.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 3),
        weakestDecisions: weakestDecisions.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 3),
        primarySkillGap,
        linkedDrillId: linkedDrillId || undefined,
        notes,
      },
    });
  }

  return (
    <PageWrapper title="Tournament Prep">
      <Card className="mb-4" title="Create Tournament Plan">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={tournamentName}
            onChange={(event) => setTournamentName(event.target.value)}
            placeholder="Tournament name"
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <input
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            placeholder="Format"
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
        </div>
        <Button className="mt-3 w-full" onClick={createPrep} disabled={!tournamentName || !location}>
          Create 14-Day Prep Plan
        </Button>
      </Card>

      {latest ? (
        <Card className="mb-4" title="Active Prep Timeline">
          <p className="text-sm text-chalk-300">{latest.tournamentName} · {latest.date} · {latest.location}</p>
          <p className="mb-2 text-sm text-ivory-200">Prep starts: {latest.prepStartDate} · Current step: {latest.currentStep}/{latest.checklistItems.length}</p>
          <div className="mb-3 h-3 rounded-full bg-felt-800">
            <div className="h-3 rounded-full bg-cue-500" style={{ width: `${completionPercent}%` }} />
          </div>

          <div className="space-y-2">
            {latest.checklistItems.map((item) => (
              <label key={item.id} className="flex min-h-11 items-center justify-between rounded-lg bg-felt-800 p-2 text-sm text-ivory-100">
                <span>D-{item.daysOut}: {item.label}</span>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleChecklist(item.id)}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
        </Card>
      ) : null}

      {latest && eventReached ? (
        <Card title="Post-Event Analysis">
          <input
            value={result}
            onChange={(event) => setResult(event.target.value)}
            placeholder="Result summary"
            className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <textarea
            value={bestDecisions}
            onChange={(event) => setBestDecisions(event.target.value)}
            placeholder="Best decisions (one per line, up to 3)"
            className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
          />
          <textarea
            value={weakestDecisions}
            onChange={(event) => setWeakestDecisions(event.target.value)}
            placeholder="Weakest decisions (one per line, up to 3)"
            className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
          />
          <input
            value={primarySkillGap}
            onChange={(event) => setPrimarySkillGap(event.target.value)}
            placeholder="Primary skill gap"
            className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <select
            value={linkedDrillId}
            onChange={(event) => setLinkedDrillId(event.target.value)}
            className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            <option value="">Link recovery drill</option>
            {drills.map((drill) => (
              <option key={drill.id} value={drill.id}>{drill.name}</option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
            className="mb-3 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
          />
          <Button className="w-full" onClick={savePostEventAnalysis}>Save Analysis</Button>
        </Card>
      ) : null}
    </PageWrapper>
  );
}
