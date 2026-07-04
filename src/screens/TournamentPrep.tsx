import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { useProgressStore } from '../store/useProgressStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { trackerKpis } from '../data/trackerKpis';
import { calculateDrillReadinessScore } from '../utils/matchSimulator';
import type { PrepChecklist, TournamentPrep } from '../types/models';

function prepStartDate(date: string): string {
  const target = new Date(`${date}T00:00:00`);
  target.setDate(target.getDate() - 14);
  return target.toISOString().slice(0, 10);
}

function buildChecklist(): PrepChecklist[] {
  const steps: Array<{ label: string; daysOut: number }> = [
    { label: 'Lock event goals and match format strategy', daysOut: 14 },
    { label: 'Set break plan and first-inning options', daysOut: 10 },
    { label: 'Pressure-set simulation (race format)', daysOut: 7 },
    { label: 'Safety and kick response rehearsal', daysOut: 5 },
    { label: 'Refine weakest KPI block under timer', daysOut: 3 },
    { label: 'Equipment, logistics, and nutrition prep', daysOut: 2 },
    { label: 'Mental reset routine and visualization', daysOut: 1 },
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
  const addCompetitionLog = useTrackerStore((s) => s.addCompetitionLog);
  const matchSimSessions = useTrackerStore((s) => s.matchSimSessions);
  const logs = useTrackerStore((s) => s.dailySessionLogs);

  const [activePrepId, setActivePrepId] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState('Race to 7');
  const [location, setLocation] = useState('');
  const [result, setResult] = useState('Win');
  const [bestDecisions, setBestDecisions] = useState('');
  const [weakestDecisions, setWeakestDecisions] = useState('');
  const [primarySkillGap, setPrimarySkillGap] = useState('');
  const [focusAreaId, setFocusAreaId] = useState('');
  const [notes, setNotes] = useState('');

  const sortedPreps = useMemo(
    () => [...tournamentPreps].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [tournamentPreps],
  );

  const activePrep = useMemo(
    () => sortedPreps.find((entry) => entry.id === activePrepId) ?? sortedPreps[0],
    [activePrepId, sortedPreps],
  );

  const eventReached = activePrep ? new Date(`${activePrep.date}T23:59:59`).getTime() <= Date.now() : false;

  useEffect(() => {
    if (!activePrep) {
      setResult('Win');
      setBestDecisions('');
      setWeakestDecisions('');
      setPrimarySkillGap('');
      setFocusAreaId('');
      setNotes('');
      return;
    }

    const analysis = activePrep.postEventAnalysis;
    setResult(analysis?.result ?? 'Win');
    setBestDecisions((analysis?.bestDecisions ?? []).join('\n'));
    setWeakestDecisions((analysis?.weakestDecisions ?? []).join('\n'));
    setPrimarySkillGap(analysis?.primarySkillGap ?? '');
    setFocusAreaId(analysis?.linkedFocusAreaId ?? analysis?.linkedDrillId ?? '');
    setNotes(analysis?.notes ?? '');
  }, [activePrep]);

  const completionPercent = useMemo(() => {
    if (!activePrep || activePrep.checklistItems.length === 0) return 0;
    const done = activePrep.checklistItems.filter((item) => item.completed).length;
    return Math.round((done / activePrep.checklistItems.length) * 100);
  }, [activePrep]);

  const latestMatchSimulation = useMemo(
    () => [...matchSimSessions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0],
    [matchSimSessions],
  );
  const drillReadinessScore = useMemo(() => calculateDrillReadinessScore(logs), [logs]);

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
    setActivePrepId(entry.id);
    setTournamentName('');
    setLocation('');
  }

  function toggleChecklist(itemId: string): void {
    if (!activePrep) return;
    const checklistItems = activePrep.checklistItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    );
    const completed = checklistItems.filter((item) => item.completed).length;
    upsertTournamentPrep({
      ...activePrep,
      checklistItems,
      currentStep: Math.min(checklistItems.length, completed + 1),
    });
  }

  function savePostEventAnalysis(): void {
    if (!activePrep) return;

    const best = bestDecisions
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
    const weakest = weakestDecisions
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
    const focusLabel = trackerKpis.find((kpi) => kpi.id === focusAreaId)?.name;

    upsertTournamentPrep({
      ...activePrep,
      postEventAnalysis: {
        result,
        bestDecisions: best,
        weakestDecisions: weakest,
        primarySkillGap,
        linkedFocusAreaId: focusAreaId || undefined,
        linkedDrillId: focusAreaId || undefined,
        notes,
      },
    });

    addCompetitionLog({
      id: `competition-${activePrep.id}`,
      date: activePrep.date,
      eventName: activePrep.tournamentName,
      format: activePrep.format,
      result,
      notes: [
        notes.trim(),
        primarySkillGap ? `Primary skill gap: ${primarySkillGap}` : '',
        focusLabel ? `Recovery focus: ${focusLabel}` : '',
      ]
        .filter(Boolean)
        .join(' | '),
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

      <Card className="mb-4" title="Match Simulator Signal">
        {latestMatchSimulation ? (
          <>
            <p className="text-sm text-ivory-100">Last simulation: {latestMatchSimulation.date} · {latestMatchSimulation.opponentArchetype}</p>
            <p className="text-xs text-chalk-300">Match readiness {latestMatchSimulation.matchReadinessScore} vs drill readiness {drillReadinessScore}</p>
            <p className="text-xs text-chalk-300">Pressure execution {latestMatchSimulation.pressureShotsMade}/{latestMatchSimulation.pressureShotsAttempted} · Safety wins {latestMatchSimulation.safetyWins}</p>
          </>
        ) : (
          <p className="text-sm text-chalk-300">No simulation data yet. Run a race-format simulation before your next event prep cycle.</p>
        )}
        <Link to="/match-simulator">
          <Button className="mt-3" variant="secondary">Run Simulation</Button>
        </Link>
      </Card>

      {sortedPreps.length ? (
        <Card className="mb-4" title="Tournament Plans">
          <div className="space-y-2">
            {sortedPreps.map((entry) => {
              const done = entry.checklistItems.filter((item) => item.completed).length;
              const pct = entry.checklistItems.length
                ? Math.round((done / entry.checklistItems.length) * 100)
                : 0;

              return (
                <div
                  key={entry.id}
                  className={`rounded-lg border p-3 text-sm ${
                    activePrep?.id === entry.id
                      ? 'border-cue-500 bg-felt-700/70'
                      : 'border-felt-600 bg-felt-800/60'
                  }`}
                >
                  <p className="text-ivory-100">{entry.tournamentName}</p>
                  <p className="text-chalk-300">{entry.date} · {entry.location} · {entry.format}</p>
                  <p className="text-chalk-300">Progress: {pct}%</p>
                  <Button className="mt-2" variant="secondary" onClick={() => setActivePrepId(entry.id)}>
                    Open Plan
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {activePrep ? (
        <Card className="mb-4" title="Active Prep Timeline">
          <p className="text-sm text-chalk-300">{activePrep.tournamentName} · {activePrep.date} · {activePrep.location}</p>
          <p className="mb-2 text-sm text-ivory-200">Prep starts: {activePrep.prepStartDate} · Current step: {activePrep.currentStep}/{activePrep.checklistItems.length}</p>
          <div className="mb-3 h-3 rounded-full bg-felt-800">
            <div className="h-3 rounded-full bg-cue-500" style={{ width: `${completionPercent}%` }} />
          </div>

          <div className="space-y-2">
            {activePrep.checklistItems.map((item) => (
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

      {activePrep && eventReached ? (
        <Card title="Post-Event Analysis">
          <select
            value={result}
            onChange={(event) => setResult(event.target.value)}
            className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
            <option value="Mixed">Mixed</option>
          </select>
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
            value={focusAreaId}
            onChange={(event) => setFocusAreaId(event.target.value)}
            className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            <option value="">Select recovery KPI focus</option>
            {trackerKpis.map((kpi) => (
              <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes (saved to tournament prep and competition log)"
            className="mb-3 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
          />
          <Button className="w-full" onClick={savePostEventAnalysis}>Save Analysis + Update Competition Log</Button>
        </Card>
      ) : null}
    </PageWrapper>
  );
}
