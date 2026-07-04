import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { useTrackerStore } from '../store/useTrackerStore';
import { trackerKpis } from '../data/trackerKpis';
import type {
  BreakOptimizationEntry,
  OpponentPatternIntel,
  PreShotRoutineLog,
  PressureScenarioResult,
  RackPatternReview,
  ReadinessEntry,
  ShotDecisionEntry,
  TournamentAutopsy,
} from '../types/tracker';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function EliteLab() {
  const eliteLab = useTrackerStore((s) => s.eliteLab);
  const setEliteLab = useTrackerStore((s) => s.setEliteLab);
  const promoteEliteActionToAdaptivePlan = useTrackerStore((s) => s.promoteEliteActionToAdaptivePlan);
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const confidence = useTrackerStore((s) => s.confidenceIndexHistory[0]);

  const [decisionScenario, setDecisionScenario] = useState('');
  const [decisionOptions, setDecisionOptions] = useState('');
  const [decisionChoice, setDecisionChoice] = useState('');
  const [decisionResult, setDecisionResult] = useState<'success' | 'partial' | 'fail'>('partial');
  const [decisionNotes, setDecisionNotes] = useState('');

  const [pressureType, setPressureType] = useState<'hill-hill' | 'shot-clock' | 'bad-leave' | 'crowd-noise'>('hill-hill');
  const [pressureAttempts, setPressureAttempts] = useState(10);
  const [pressureConversions, setPressureConversions] = useState(6);
  const [pressureNotes, setPressureNotes] = useState('');

  const [opponentName, setOpponentName] = useState('');
  const [opponentArchetype, setOpponentArchetype] = useState('');
  const [breakTendency, setBreakTendency] = useState('');
  const [safetyTendency, setSafetyTendency] = useState('');
  const [kickWeakness, setKickWeakness] = useState('');
  const [pressureLeak, setPressureLeak] = useState('');
  const [intelNotes, setIntelNotes] = useState('');

  const [breakGameType, setBreakGameType] = useState<'9-ball' | '10-ball' | '8-ball'>('9-ball');
  const [breakPosition, setBreakPosition] = useState('Center');
  const [breakSpeed, setBreakSpeed] = useState('Medium-High');
  const [landingZone, setLandingZone] = useState('Center table');
  const [ballsMade, setBallsMade] = useState(1);
  const [shotOnNext, setShotOnNext] = useState(true);
  const [breakNotes, setBreakNotes] = useState('');

  const [rackLabel, setRackLabel] = useState('');
  const [plannedRoute, setPlannedRoute] = useState('');
  const [cleanerRoute, setCleanerRoute] = useState('');
  const [routeScore, setRouteScore] = useState(70);
  const [rackNotes, setRackNotes] = useState('');

  const [routineScenario, setRoutineScenario] = useState('');
  const [routineUsed, setRoutineUsed] = useState(true);
  const [shotDifficulty, setShotDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [routineOutcome, setRoutineOutcome] = useState<'made' | 'missed' | 'safe'>('made');
  const [routineNotes, setRoutineNotes] = useState('');

  const [autopsyEvent, setAutopsyEvent] = useState('');
  const [decisionErrors, setDecisionErrors] = useState('');
  const [executionErrors, setExecutionErrors] = useState('');
  const [emotionalErrors, setEmotionalErrors] = useState('');
  const [prepErrors, setPrepErrors] = useState('');
  const [nextPriority, setNextPriority] = useState('');

  const [sleepHours, setSleepHours] = useState(7);
  const [stress, setStress] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [soreness, setSoreness] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [focus, setFocus] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [readinessNotes, setReadinessNotes] = useState('');
  const [bridgeMessage, setBridgeMessage] = useState('');

  const benchmarks = useMemo(() => {
    const current = {
      drillRoom: logs.length
        ? Math.round(logs.reduce((sum, item) => sum + item.drillRoomShotmakingPct, 0) / logs.length)
        : 0,
      ghost: logs.length
        ? Math.round(logs.reduce((sum, item) => sum + item.ghostDrillWinRatePct, 0) / logs.length)
        : 0,
      safety: logs.length
        ? Math.round(logs.reduce((sum, item) => sum + item.safetyExchangeSuccessPct, 0) / logs.length)
        : 0,
    };

    const target750 = trackerKpis.find((kpi) => kpi.id === 'drillroom-shotmaking-pct')?.benchmarks.fargo750 ?? 0;
    const target800 = trackerKpis.find((kpi) => kpi.id === 'ghost-drill-winrate-pct')?.benchmarks.fargo800 ?? 0;

    return {
      current,
      target750,
      target800,
    };
  }, [logs]);

  const readinessScore = clamp(Math.round(sleepHours * 8 + focus * 10 - stress * 8 - soreness * 8), 0, 100);
  const adaptiveIntensity = readinessScore >= 75 ? 'High-intensity day' : readinessScore >= 55 ? 'Standard load' : 'Recovery-biased day';

  function addDecisionIQEntry(): void {
    if (!decisionScenario.trim() || !decisionChoice.trim()) return;
    const quality =
      decisionResult === 'success' ? 88 : decisionResult === 'partial' ? 66 : 42;
    const entry: ShotDecisionEntry = {
      id: `decision-${Date.now()}`,
      date: todayIso(),
      scenario: decisionScenario.trim(),
      optionsConsidered: decisionOptions
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5),
      selectedOption: decisionChoice.trim(),
      result: decisionResult,
      decisionQualityScore: quality,
      notes: decisionNotes.trim(),
    };
    setEliteLab((state) => ({ ...state, shotDecisionEntries: [entry, ...state.shotDecisionEntries].slice(0, 80) }));
    setDecisionScenario('');
    setDecisionOptions('');
    setDecisionChoice('');
    setDecisionNotes('');
  }

  function addPressureScenarioResult(): void {
    const attempts = Math.max(1, pressureAttempts);
    const conversions = clamp(pressureConversions, 0, attempts);
    const entry: PressureScenarioResult = {
      id: `pressure-${Date.now()}`,
      date: todayIso(),
      scenarioType: pressureType,
      attempts,
      conversions,
      clutchRatePct: Math.round((conversions / attempts) * 100),
      notes: pressureNotes.trim(),
    };
    setEliteLab((state) => ({ ...state, pressureScenarioResults: [entry, ...state.pressureScenarioResults].slice(0, 80) }));
    setPressureNotes('');
  }

  function addOpponentIntel(): void {
    if (!opponentName.trim()) return;
    const entry: OpponentPatternIntel = {
      id: `intel-${Date.now()}`,
      opponentName: opponentName.trim(),
      archetype: opponentArchetype.trim() || 'Unknown',
      breakTendency: breakTendency.trim(),
      safetyTendency: safetyTendency.trim(),
      kickWeakness: kickWeakness.trim(),
      pressureLeak: pressureLeak.trim(),
      planNotes: intelNotes.trim(),
      updatedAt: new Date().toISOString(),
    };
    setEliteLab((state) => ({ ...state, opponentIntel: [entry, ...state.opponentIntel.filter((item) => item.id !== entry.id)].slice(0, 60) }));
    setOpponentName('');
    setOpponentArchetype('');
    setBreakTendency('');
    setSafetyTendency('');
    setKickWeakness('');
    setPressureLeak('');
    setIntelNotes('');
  }

  function addBreakOptimizationEntry(): void {
    const successRating = clamp((ballsMade * 20) + (shotOnNext ? 35 : 10), 0, 100);
    const entry: BreakOptimizationEntry = {
      id: `break-${Date.now()}`,
      date: todayIso(),
      gameType: breakGameType,
      breakPosition,
      breakSpeed,
      cueBallLandingZone: landingZone,
      ballsMade,
      shotOnNext,
      successRating,
      notes: breakNotes.trim(),
    };
    setEliteLab((state) => ({ ...state, breakOptimizationLog: [entry, ...state.breakOptimizationLog].slice(0, 120) }));
    setBreakNotes('');
  }

  function markSafetyKickReviewed(id: string): void {
    setEliteLab((state) => ({
      ...state,
      safetyKickDrills: state.safetyKickDrills.map((item) =>
        item.id === id
          ? {
              ...item,
              dueDate: new Date(Date.now() + item.intervalDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              proficiency: clamp(item.proficiency + 1, 1, 5) as 1 | 2 | 3 | 4 | 5,
            }
          : item,
      ),
    }));
  }

  function addRackPatternReview(): void {
    if (!rackLabel.trim()) return;
    const entry: RackPatternReview = {
      id: `rack-${Date.now()}`,
      date: todayIso(),
      layoutLabel: rackLabel.trim(),
      plannedRoute: plannedRoute.trim(),
      cleanerAlternative: cleanerRoute.trim(),
      routeEfficiencyScore: clamp(routeScore, 0, 100),
      notes: rackNotes.trim(),
    };
    setEliteLab((state) => ({ ...state, rackPatternReviews: [entry, ...state.rackPatternReviews].slice(0, 100) }));
    setRackLabel('');
    setPlannedRoute('');
    setCleanerRoute('');
    setRackNotes('');
  }

  function addPreShotRoutineLog(): void {
    if (!routineScenario.trim()) return;
    const entry: PreShotRoutineLog = {
      id: `routine-${Date.now()}`,
      date: todayIso(),
      scenario: routineScenario.trim(),
      routineUsed,
      shotDifficulty,
      outcome: routineOutcome,
      notes: routineNotes.trim(),
    };
    setEliteLab((state) => ({ ...state, preShotRoutineLogs: [entry, ...state.preShotRoutineLogs].slice(0, 120) }));
    setRoutineScenario('');
    setRoutineNotes('');
  }

  function addTournamentAutopsy(): void {
    if (!autopsyEvent.trim()) return;
    const entry: TournamentAutopsy = {
      id: `autopsy-${Date.now()}`,
      date: todayIso(),
      eventName: autopsyEvent.trim(),
      decisionErrors: decisionErrors.trim(),
      executionErrors: executionErrors.trim(),
      emotionalErrors: emotionalErrors.trim(),
      preparationErrors: prepErrors.trim(),
      nextWeekPriority: nextPriority.trim(),
    };
    setEliteLab((state) => ({ ...state, tournamentAutopsies: [entry, ...state.tournamentAutopsies].slice(0, 40) }));
    setAutopsyEvent('');
    setDecisionErrors('');
    setExecutionErrors('');
    setEmotionalErrors('');
    setPrepErrors('');
    setNextPriority('');
  }

  function addReadinessEntry(): void {
    const entry: ReadinessEntry = {
      id: `ready-${Date.now()}`,
      date: todayIso(),
      sleepHours,
      stressLevel: stress,
      sorenessLevel: soreness,
      focusLevel: focus,
      notes: readinessNotes.trim(),
    };
    setEliteLab((state) => ({ ...state, readinessLog: [entry, ...state.readinessLog].slice(0, 100) }));
    setReadinessNotes('');
  }

  const avgDecisionIQ = eliteLab.shotDecisionEntries.length
    ? Math.round(eliteLab.shotDecisionEntries.reduce((sum, item) => sum + item.decisionQualityScore, 0) / eliteLab.shotDecisionEntries.length)
    : 0;
  const avgClutch = eliteLab.pressureScenarioResults.length
    ? Math.round(eliteLab.pressureScenarioResults.reduce((sum, item) => sum + item.clutchRatePct, 0) / eliteLab.pressureScenarioResults.length)
    : 0;
  const routineCompliance = eliteLab.preShotRoutineLogs.length
    ? Math.round((eliteLab.preShotRoutineLogs.filter((item) => item.routineUsed).length / eliteLab.preShotRoutineLogs.length) * 100)
    : 0;
  const latestAutopsyPriority = eliteLab.tournamentAutopsies[0]?.nextWeekPriority?.trim() ?? '';
  const weakestSystem = [
    { label: 'Decision quality', score: avgDecisionIQ },
    { label: 'Clutch conversion', score: avgClutch },
    { label: 'Routine compliance', score: routineCompliance },
  ].sort((a, b) => a.score - b.score)[0];

  function promoteToToday(actionItem: string, focusKpiName: string, minutes: number): void {
    if (!actionItem.trim()) return;
    promoteEliteActionToAdaptivePlan(actionItem, focusKpiName, minutes);
    setBridgeMessage(`Promoted to Adaptive Daily Plan: ${actionItem}`);
  }

  return (
    <PageWrapper title="Elite Performance Lab">
      <Card className="mb-4" title="World-Class Readiness Snapshot">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="text-chalk-300">Decision IQ (avg)</p><p className="text-right text-ivory-100">{avgDecisionIQ}</p>
          <p className="text-chalk-300">Clutch Conversion (avg)</p><p className="text-right text-ivory-100">{avgClutch}%</p>
          <p className="text-chalk-300">Routine Compliance</p><p className="text-right text-ivory-100">{routineCompliance}%</p>
          <p className="text-chalk-300">Confidence Index</p><p className="text-right text-ivory-100">{confidence?.score ?? 0}</p>
        </div>
      </Card>

      <Card className="mb-4" title="Elite -> Today Session Bridge">
        <p className="text-xs text-chalk-300">One tap pushes your elite priority into the Adaptive Daily Plan checklist shown on Daily Session Flow.</p>
        <div className="mt-3 grid gap-2">
          <Button
            variant="secondary"
            onClick={() => promoteToToday(
              latestAutopsyPriority || 'Run post-event correction set: 20 pressure reps + 10 safety exchanges',
              'Tournament error correction',
              85,
            )}
          >
            Promote Latest Tournament Priority
          </Button>
          <Button
            variant="secondary"
            onClick={() => promoteToToday(
              `Fix weakest system: ${weakestSystem.label} (${weakestSystem.score})`,
              weakestSystem.label,
              75,
            )}
          >
            Promote Weakest System Focus
          </Button>
          <Button
            variant="secondary"
            onClick={() => promoteToToday(
              readinessScore < 55
                ? 'Recovery bias: lower intensity and prioritize clean reps + fundamentals'
                : 'Green-light intensity: pressure reps and race-pace execution block',
              'Readiness-guided load',
              readinessScore < 55 ? 55 : 90,
            )}
          >
            Promote Readiness-Based Plan
          </Button>
        </div>
        {bridgeMessage ? <p className="mt-2 text-xs text-cue-300">{bridgeMessage}</p> : null}
      </Card>

      <Card className="mb-4" title="1) Shot Decision IQ Engine">
        <input value={decisionScenario} onChange={(e) => setDecisionScenario(e.target.value)} placeholder="Scenario" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <textarea value={decisionOptions} onChange={(e) => setDecisionOptions(e.target.value)} placeholder="Options considered (one per line)" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <input value={decisionChoice} onChange={(e) => setDecisionChoice(e.target.value)} placeholder="Selected option" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <select value={decisionResult} onChange={(e) => setDecisionResult(e.target.value as 'success' | 'partial' | 'fail')} className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100">
          <option value="success">Success</option><option value="partial">Partial</option><option value="fail">Fail</option>
        </select>
        <textarea value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} placeholder="Notes" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <Button onClick={addDecisionIQEntry}>Save Decision Entry</Button>
      </Card>

      <Card className="mb-4" title="2) Pressure Scenario Generator">
        <select value={pressureType} onChange={(e) => setPressureType(e.target.value as typeof pressureType)} className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100">
          <option value="hill-hill">Hill-Hill</option><option value="shot-clock">Shot Clock</option><option value="bad-leave">Bad Leave</option><option value="crowd-noise">Crowd Noise</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={pressureAttempts} onChange={(e) => setPressureAttempts(Math.max(1, Number(e.target.value) || 1))} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
          <input type="number" value={pressureConversions} onChange={(e) => setPressureConversions(Math.max(0, Number(e.target.value) || 0))} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        </div>
        <textarea value={pressureNotes} onChange={(e) => setPressureNotes(e.target.value)} placeholder="Notes" className="mt-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <Button className="mt-2" onClick={addPressureScenarioResult}>Log Pressure Set</Button>
      </Card>

      <Card className="mb-4" title="3) Opponent Pattern Intelligence">
        <input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} placeholder="Opponent name" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <input value={opponentArchetype} onChange={(e) => setOpponentArchetype(e.target.value)} placeholder="Archetype" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <input value={breakTendency} onChange={(e) => setBreakTendency(e.target.value)} placeholder="Break tendency" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <input value={safetyTendency} onChange={(e) => setSafetyTendency(e.target.value)} placeholder="Safety tendency" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <input value={kickWeakness} onChange={(e) => setKickWeakness(e.target.value)} placeholder="Kick weakness" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <input value={pressureLeak} onChange={(e) => setPressureLeak(e.target.value)} placeholder="Pressure leak" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <textarea value={intelNotes} onChange={(e) => setIntelNotes(e.target.value)} placeholder="Plan notes" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <Button onClick={addOpponentIntel}>Save Opponent Intel</Button>
      </Card>

      <Card className="mb-4" title="4) Break Optimization Lab">
        <select value={breakGameType} onChange={(e) => setBreakGameType(e.target.value as '9-ball' | '10-ball' | '8-ball')} className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100">
          <option value="9-ball">9-ball</option><option value="10-ball">10-ball</option><option value="8-ball">8-ball</option>
        </select>
        <input value={breakPosition} onChange={(e) => setBreakPosition(e.target.value)} placeholder="Break position" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <input value={breakSpeed} onChange={(e) => setBreakSpeed(e.target.value)} placeholder="Break speed" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <input value={landingZone} onChange={(e) => setLandingZone(e.target.value)} placeholder="Cue-ball landing zone" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={ballsMade} onChange={(e) => setBallsMade(Math.max(0, Number(e.target.value) || 0))} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-felt-600 bg-felt-800 px-3 text-sm text-ivory-100"><input type="checkbox" checked={shotOnNext} onChange={(e) => setShotOnNext(e.target.checked)} /> Shot on next</label>
        </div>
        <textarea value={breakNotes} onChange={(e) => setBreakNotes(e.target.value)} placeholder="Notes" className="mt-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <Button className="mt-2" onClick={addBreakOptimizationEntry}>Save Break Entry</Button>
      </Card>

      <Card className="mb-4" title="5) Safety/Kick Systems Trainer">
        <div className="space-y-2">
          {eliteLab.safetyKickDrills.map((drill) => (
            <div key={drill.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-2 text-sm">
              <p className="text-ivory-100">{drill.name}</p>
              <p className="text-chalk-300">{drill.family.toUpperCase()} · Due {drill.dueDate} · Proficiency {drill.proficiency}/5</p>
              <Button className="mt-2" variant="secondary" onClick={() => markSafetyKickReviewed(drill.id)}>Mark Rehearsed</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4" title="6) Rack Pattern Quality Scoring">
        <input value={rackLabel} onChange={(e) => setRackLabel(e.target.value)} placeholder="Layout label" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <textarea value={plannedRoute} onChange={(e) => setPlannedRoute(e.target.value)} placeholder="Planned route" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <textarea value={cleanerRoute} onChange={(e) => setCleanerRoute(e.target.value)} placeholder="Cleaner alternative" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <input type="number" min={0} max={100} value={routeScore} onChange={(e) => setRouteScore(clamp(Number(e.target.value) || 0, 0, 100))} className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <textarea value={rackNotes} onChange={(e) => setRackNotes(e.target.value)} placeholder="Notes" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <Button onClick={addRackPatternReview}>Save Pattern Review</Button>
      </Card>

      <Card className="mb-4" title="7) Pre-Shot Routine Compliance">
        <input value={routineScenario} onChange={(e) => setRoutineScenario(e.target.value)} placeholder="Scenario" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <label className="mb-2 flex min-h-11 items-center gap-2 rounded-xl border border-felt-600 bg-felt-800 px-3 text-sm text-ivory-100"><input type="checkbox" checked={routineUsed} onChange={(e) => setRoutineUsed(e.target.checked)} /> Full routine used</label>
        <div className="grid grid-cols-2 gap-2">
          <select value={shotDifficulty} onChange={(e) => setShotDifficulty(clamp(Number(e.target.value) || 3, 1, 5) as 1 | 2 | 3 | 4 | 5)} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100">
            <option value={1}>Difficulty 1</option><option value={2}>Difficulty 2</option><option value={3}>Difficulty 3</option><option value={4}>Difficulty 4</option><option value={5}>Difficulty 5</option>
          </select>
          <select value={routineOutcome} onChange={(e) => setRoutineOutcome(e.target.value as 'made' | 'missed' | 'safe')} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100">
            <option value="made">Made</option><option value="missed">Missed</option><option value="safe">Safe</option>
          </select>
        </div>
        <textarea value={routineNotes} onChange={(e) => setRoutineNotes(e.target.value)} placeholder="Notes" className="mt-2 mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <Button onClick={addPreShotRoutineLog}>Save Routine Log</Button>
      </Card>

      <Card className="mb-4" title="8) Tournament Debrief Autopsy">
        <input value={autopsyEvent} onChange={(e) => setAutopsyEvent(e.target.value)} placeholder="Event name" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <textarea value={decisionErrors} onChange={(e) => setDecisionErrors(e.target.value)} placeholder="Decision errors" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <textarea value={executionErrors} onChange={(e) => setExecutionErrors(e.target.value)} placeholder="Execution errors" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <textarea value={emotionalErrors} onChange={(e) => setEmotionalErrors(e.target.value)} placeholder="Emotional errors" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <textarea value={prepErrors} onChange={(e) => setPrepErrors(e.target.value)} placeholder="Preparation errors" className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <input value={nextPriority} onChange={(e) => setNextPriority(e.target.value)} placeholder="Next-week priority" className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
        <Button onClick={addTournamentAutopsy}>Save Debrief</Button>
      </Card>

      <Card className="mb-4" title="9) Elite Benchmark Mode">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="text-chalk-300">Current DrillRoom Avg</p><p className="text-right text-ivory-100">{benchmarks.current.drillRoom}%</p>
          <p className="text-chalk-300">Current Ghost Avg</p><p className="text-right text-ivory-100">{benchmarks.current.ghost}%</p>
          <p className="text-chalk-300">Current Safety Avg</p><p className="text-right text-ivory-100">{benchmarks.current.safety}%</p>
          <p className="text-chalk-300">750 Bench (DrillRoom)</p><p className="text-right text-ivory-100">{benchmarks.target750}%</p>
          <p className="text-chalk-300">800 Bench (Ghost)</p><p className="text-right text-ivory-100">{benchmarks.target800}%</p>
        </div>
        <p className="mt-2 text-xs text-chalk-300">Delta to 750 DrillRoom benchmark: {benchmarks.current.drillRoom - benchmarks.target750 >= 0 ? '+' : ''}{benchmarks.current.drillRoom - benchmarks.target750}</p>
        <p className="text-xs text-chalk-300">Delta to 800 Ghost benchmark: {benchmarks.current.ghost - benchmarks.target800 >= 0 ? '+' : ''}{benchmarks.current.ghost - benchmarks.target800}</p>
      </Card>

      <Card title="10) Fatigue + Readiness Layer">
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={0} max={12} value={sleepHours} onChange={(e) => setSleepHours(clamp(Number(e.target.value) || 0, 0, 12))} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
          <select value={stress} onChange={(e) => setStress(clamp(Number(e.target.value) || 2, 1, 5) as 1 | 2 | 3 | 4 | 5)} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"><option value={1}>Stress 1</option><option value={2}>Stress 2</option><option value={3}>Stress 3</option><option value={4}>Stress 4</option><option value={5}>Stress 5</option></select>
          <select value={soreness} onChange={(e) => setSoreness(clamp(Number(e.target.value) || 2, 1, 5) as 1 | 2 | 3 | 4 | 5)} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"><option value={1}>Soreness 1</option><option value={2}>Soreness 2</option><option value={3}>Soreness 3</option><option value={4}>Soreness 4</option><option value={5}>Soreness 5</option></select>
          <select value={focus} onChange={(e) => setFocus(clamp(Number(e.target.value) || 4, 1, 5) as 1 | 2 | 3 | 4 | 5)} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"><option value={1}>Focus 1</option><option value={2}>Focus 2</option><option value={3}>Focus 3</option><option value={4}>Focus 4</option><option value={5}>Focus 5</option></select>
        </div>
        <textarea value={readinessNotes} onChange={(e) => setReadinessNotes(e.target.value)} placeholder="Readiness notes" className="mt-2 mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100" />
        <p className="text-sm text-ivory-100">Readiness score: {readinessScore}</p>
        <p className="text-xs text-chalk-300">Recommended intensity: {adaptiveIntensity}</p>
        <Button className="mt-2" onClick={addReadinessEntry}>Log Readiness</Button>
      </Card>
    </PageWrapper>
  );
}
