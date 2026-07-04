import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { useTrackerStore } from '../store/useTrackerStore';
import { calculateDrillReadinessScore, calculateMatchReadinessScore } from '../utils/matchSimulator';
import type { MatchSimulatorPressureLevel } from '../types/tracker';

const archetypes = ['Aggressive breaker', 'Safety grinder', 'Counter-puncher', 'Unknown'] as const;

export default function MatchSimulator() {
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const sessions = useTrackerStore((s) => s.matchSimSessions);
  const addMatchSimSession = useTrackerStore((s) => s.addMatchSimSession);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [opponentArchetype, setOpponentArchetype] = useState<string>(archetypes[0]);
  const [raceTo, setRaceTo] = useState(7);
  const [inningsPlayed, setInningsPlayed] = useState(12);
  const [breaksMade, setBreaksMade] = useState(8);
  const [breakAndRuns, setBreakAndRuns] = useState(3);
  const [safetyWins, setSafetyWins] = useState(4);
  const [pressureLevel, setPressureLevel] = useState<MatchSimulatorPressureLevel>('high');
  const [pressureShotsMade, setPressureShotsMade] = useState(5);
  const [pressureShotsAttempted, setPressureShotsAttempted] = useState(8);
  const [hillHillResult, setHillHillResult] = useState<'Win' | 'Loss' | 'N/A'>('N/A');
  const [result, setResult] = useState<'Win' | 'Loss'>('Win');
  const [notes, setNotes] = useState('');

  const drillReadinessScore = useMemo(() => calculateDrillReadinessScore(logs), [logs]);

  const projectedScore = useMemo(
    () =>
      calculateMatchReadinessScore({
        raceTo,
        inningsPlayed,
        breaksMade,
        breakAndRuns,
        safetyWins,
        pressureShotsMade,
        pressureShotsAttempted,
        hillHillResult,
        result,
        pressureLevel,
      }),
    [
      raceTo,
      inningsPlayed,
      breaksMade,
      breakAndRuns,
      safetyWins,
      pressureShotsMade,
      pressureShotsAttempted,
      hillHillResult,
      result,
      pressureLevel,
    ],
  );

  function saveSimulation(): void {
    addMatchSimSession({
      id: `match-sim-${Date.now()}`,
      date,
      opponentArchetype,
      raceTo,
      inningsPlayed,
      breaksMade,
      breakAndRuns,
      safetyWins,
      pressureLevel,
      pressureShotsMade,
      pressureShotsAttempted,
      hillHillResult,
      result,
      matchReadinessScore: projectedScore,
      drillReadinessScore,
      notes,
      createdAt: new Date().toISOString(),
    });
    setNotes('');
  }

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [sessions],
  );

  const latest = sortedSessions[0];

  return (
    <PageWrapper title="Match Simulator">
      <Card className="mb-4" title="Simulation Input">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <select
            value={opponentArchetype}
            onChange={(event) => setOpponentArchetype(event.target.value)}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            {archetypes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <input
            type="number"
            min={3}
            max={15}
            value={raceTo}
            onChange={(event) => setRaceTo(Math.max(3, Number(event.target.value) || 3))}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            placeholder="Race to"
          />
          <input
            type="number"
            min={1}
            value={inningsPlayed}
            onChange={(event) => setInningsPlayed(Math.max(1, Number(event.target.value) || 1))}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            placeholder="Innings"
          />
          <input
            type="number"
            min={0}
            value={breaksMade}
            onChange={(event) => setBreaksMade(Math.max(0, Number(event.target.value) || 0))}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            placeholder="Breaks made"
          />
          <input
            type="number"
            min={0}
            value={breakAndRuns}
            onChange={(event) => setBreakAndRuns(Math.max(0, Number(event.target.value) || 0))}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            placeholder="Break and runs"
          />
          <input
            type="number"
            min={0}
            value={safetyWins}
            onChange={(event) => setSafetyWins(Math.max(0, Number(event.target.value) || 0))}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            placeholder="Safety exchanges won"
          />
          <select
            value={pressureLevel}
            onChange={(event) => setPressureLevel(event.target.value as MatchSimulatorPressureLevel)}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            <option value="low">Low pressure</option>
            <option value="medium">Medium pressure</option>
            <option value="high">High pressure</option>
          </select>
          <input
            type="number"
            min={0}
            value={pressureShotsMade}
            onChange={(event) => setPressureShotsMade(Math.max(0, Number(event.target.value) || 0))}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            placeholder="Pressure shots made"
          />
          <input
            type="number"
            min={0}
            value={pressureShotsAttempted}
            onChange={(event) => setPressureShotsAttempted(Math.max(0, Number(event.target.value) || 0))}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            placeholder="Pressure shots attempted"
          />
          <select
            value={hillHillResult}
            onChange={(event) => setHillHillResult(event.target.value as 'Win' | 'Loss' | 'N/A')}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            <option value="N/A">No hill-hill rack</option>
            <option value="Win">Won hill-hill rack</option>
            <option value="Loss">Lost hill-hill rack</option>
          </select>
          <select
            value={result}
            onChange={(event) => setResult(event.target.value as 'Win' | 'Loss')}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
          </select>
        </div>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Pressure moments, tactical misses, and what to refine next"
          className="mt-2 min-h-24 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />

        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <p className="text-chalk-300">Projected Match Readiness</p>
          <p className="text-right text-ivory-100">{projectedScore}</p>
          <p className="text-chalk-300">Current Drill Readiness</p>
          <p className="text-right text-ivory-100">{drillReadinessScore}</p>
        </div>

        <Button className="mt-3 w-full" onClick={saveSimulation}>
          Save Match Simulation
        </Button>
      </Card>

      {latest ? (
        <Card className="mb-4" title="Latest Simulation Snapshot">
          <p className="text-sm text-ivory-100">{latest.date} · {latest.opponentArchetype} · Race to {latest.raceTo}</p>
          <p className="text-xs text-chalk-300">Match readiness {latest.matchReadinessScore} vs drill readiness {latest.drillReadinessScore}</p>
          <p className="text-xs text-chalk-300">Break and run: {latest.breakAndRuns}/{latest.breaksMade} · Pressure: {latest.pressureShotsMade}/{latest.pressureShotsAttempted}</p>
          <Link to="/tournament">
            <Button className="mt-3" variant="secondary">Apply Insights To Tournament Prep</Button>
          </Link>
        </Card>
      ) : null}

      <Card title="Simulation History">
        <div className="space-y-2">
          {sortedSessions.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-3 text-sm">
              <p className="text-ivory-100">{entry.date} · {entry.result} · Race to {entry.raceTo}</p>
              <p className="text-chalk-300">{entry.opponentArchetype} · Readiness {entry.matchReadinessScore}/{entry.drillReadinessScore}</p>
              <p className="text-chalk-300">Innings {entry.inningsPlayed} · Safety wins {entry.safetyWins}</p>
              {entry.notes ? <p className="text-ivory-200">{entry.notes}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </PageWrapper>
  );
}
