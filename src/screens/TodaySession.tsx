import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { getProgramWeek, useProgramStore } from '../store/useProgramStore';
import { useDrillTimer } from '../hooks/useDrillTimer';
import { drills } from '../data/drills';
import { useSessionStore } from '../store/useSessionStore';
import { useProgressStore } from '../store/useProgressStore';
import { formatClockTime, getTodayDayKey, isoDate } from '../utils/date';
import type { Drill, DrillResult } from '../types/models';

function scoreFromFields(fieldValues: Record<string, number | string | boolean>, maxScore: number): number {
  const numericValues = Object.values(fieldValues).filter((value) => typeof value === 'number') as number[];
  if (!numericValues.length || maxScore <= 0) return 0;
  const numerator = numericValues.slice(1).reduce((sum, item) => sum + item, 0);
  const denominator = numericValues[0] > 0 ? numericValues[0] : maxScore;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

function targetForPhase(drill: Drill, phase: number): number {
  if (phase === 1) return drill.targetScore.phase1;
  if (phase === 2) return drill.targetScore.phase2;
  if (phase === 3) return drill.targetScore.phase3;
  return drill.targetScore.phase4;
}

export default function TodaySession() {
  const currentWeek = useProgramStore((s) => s.currentWeek);
  const weekPlan = getProgramWeek(currentWeek);
  const todayKey = getTodayDayKey();
  const daySession = weekPlan.dailySessions[todayKey];
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, number | string | boolean>>>({});
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [mentalGameRating, setMentalGameRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [sessionNotes, setSessionNotes] = useState('');
  const saveDrillResult = useSessionStore((s) => s.saveDrillResult);
  const markComplete = useSessionStore((s) => s.markComplete);
  const addSessionLog = useProgressStore((s) => s.addSessionLog);

  const sessionDrills = useMemo(() => {
    const ids = Array.from(new Set(daySession.segments.flatMap((segment) => segment.drillIds)));
    return ids.map((id) => drills.find((drill) => drill.id === id)).filter((drill): drill is Drill => Boolean(drill));
  }, [daySession.segments]);

  const { timeRemaining, segmentTimeRemaining, currentSegment, isRunning, start, pause, reset, skipSegment } =
    useDrillTimer(daySession.segments);

  const ringStyle = useMemo(
    () => ({
      background: `conic-gradient(#c9a84c ${(1 - timeRemaining / 3600) * 360}deg, #0d1b2a 0deg)`,
    }),
    [timeRemaining],
  );

  const drillResults: DrillResult[] = useMemo(
    () =>
      sessionDrills
        .map((drill) => {
          const current = fieldValues[drill.id] ?? {};
          const calculatedScore = scoreFromFields(current, drill.scoringMethod.maxScore);
          const targetScore = targetForPhase(drill, weekPlan.phase);
          return {
            drillId: drill.id,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            fieldValues: current,
            calculatedScore,
            targetScore,
            metTarget: calculatedScore >= targetScore,
            notes: '',
          };
        })
        .filter((result) => Object.keys(result.fieldValues).length > 0),
    [fieldValues, sessionDrills, weekPlan.phase],
  );

  const averageScore =
    drillResults.length > 0
      ? Math.round(drillResults.reduce((sum, result) => sum + result.calculatedScore, 0) / drillResults.length)
      : 0;

  function updateField(drillId: string, fieldId: string, value: number | string | boolean): void {
    setFieldValues((prev) => ({
      ...prev,
      [drillId]: {
        ...(prev[drillId] ?? {}),
        [fieldId]: value,
      },
    }));
  }

  function saveSession(): void {
    drillResults.forEach((result) => saveDrillResult(result));
    markComplete();
    addSessionLog({
      id: `session-${Date.now()}`,
      date: isoDate(),
      week: weekPlan.week,
      phase: weekPlan.phase,
      dayOfWeek: todayKey,
      focusArea: daySession.focusArea,
      sessionStartTime: new Date(Date.now() - (3600 - timeRemaining) * 1000).toISOString(),
      sessionEndTime: new Date().toISOString(),
      totalDurationMinutes: Math.round((3600 - timeRemaining) / 60),
      completed: true,
      drillResults,
      sessionNotes,
      mentalGameRating,
      energyLevel,
    });
  }

  return (
    <PageWrapper title="Today's Session">
      <Card className="mb-4">
        <p className="text-xs uppercase tracking-wide text-chalk-300">{todayKey}</p>
        <p className="text-sm text-chalk-300">Current segment</p>
        <p className="text-lg text-ivory-100">{currentSegment?.name ?? 'Session Complete'}</p>
      </Card>

      <Card className="mb-4">
        <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-full p-2" style={ringStyle}>
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-felt-900">
            <p className="text-xs text-chalk-300">Session</p>
            <p className="text-4xl font-bold text-ivory-100">{formatClockTime(timeRemaining)}</p>
            <p className="text-sm text-chalk-300">Segment {formatClockTime(segmentTimeRemaining)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {isRunning ? <Button onClick={pause}>Pause</Button> : <Button onClick={start}>Start</Button>}
        <Button variant="secondary" onClick={skipSegment}>Skip Segment</Button>
        <Button variant="secondary" onClick={reset} className="col-span-2">Reset</Button>
      </div>

      <div className="mt-4 space-y-3">
        {sessionDrills.map((drill) => {
          const result = drillResults.find((entry) => entry.drillId === drill.id);
          const target = targetForPhase(drill, weekPlan.phase);
          return (
            <Card key={drill.id}>
              <p className="text-sm text-chalk-300">{drill.category}</p>
              <p className="mb-2 text-lg text-ivory-100">{drill.name}</p>
              <p className="mb-3 text-sm text-ivory-200">{drill.description}</p>

              <details className="mb-3 rounded-xl border border-felt-600 bg-felt-800/70 p-3">
                <summary className="min-h-11 cursor-pointer select-none text-sm font-medium text-chalk-300">
                  View Instructions, Setup, and Pro Tip
                </summary>
                <div className="mt-3 space-y-3 text-sm text-ivory-100">
                  <div>
                    <p className="font-semibold text-chalk-300">Setup</p>
                    <p>{drill.setup}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-chalk-300">Instructions</p>
                    <ol className="list-decimal space-y-1 pl-5">
                      {drill.instructions.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-chalk-300">Table Layout</p>
                    <p>{drill.tableLayoutDescription}</p>
                  </div>
                  <div className="rounded-lg border border-felt-600 bg-felt-900/60 p-2">
                    <p className="font-semibold text-cue-400">Pro Tip</p>
                    <p>{drill.proTip}</p>
                  </div>
                </div>
              </details>

              <div className="space-y-2">
                {drill.scoringMethod.trackingFields.map((field) => (
                  <label key={field.id} className="block">
                    <span className="mb-1 block text-sm text-chalk-300">{field.label}</span>
                    {field.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(fieldValues[drill.id]?.[field.id])}
                        onChange={(event) => updateField(drill.id, field.id, event.target.checked)}
                        className="h-5 w-5"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={String(fieldValues[drill.id]?.[field.id] ?? '')}
                        onChange={(event) => updateField(drill.id, field.id, event.target.value)}
                        className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
                      >
                        <option value="">Select</option>
                        {(field.options ?? []).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={Number(fieldValues[drill.id]?.[field.id] ?? 0)}
                        onChange={(event) => updateField(drill.id, field.id, Number(event.target.value))}
                        className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
                      />
                    )}
                  </label>
                ))}
              </div>

              <p className="mt-3 text-sm text-ivory-200">
                Score: {result?.calculatedScore ?? 0}% / Target: {target}%
              </p>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4" title="Session Complete">
        <p className="mb-2 text-ivory-100">Average score: {averageScore}%</p>
        <label className="mb-2 block text-sm text-chalk-300">Session Notes</label>
        <textarea
          value={sessionNotes}
          onChange={(event) => setSessionNotes(event.target.value)}
          className="mb-3 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />
        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="text-sm text-chalk-300">
            Mental (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={mentalGameRating}
              onChange={(event) => setMentalGameRating(Math.max(1, Math.min(5, Number(event.target.value))) as 1 | 2 | 3 | 4 | 5)}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
          <label className="text-sm text-chalk-300">
            Energy (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={energyLevel}
              onChange={(event) => setEnergyLevel(Math.max(1, Math.min(5, Number(event.target.value))) as 1 | 2 | 3 | 4 | 5)}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
        </div>
        <Button className="w-full" onClick={saveSession}>Save Session</Button>
      </Card>
    </PageWrapper>
  );
}
