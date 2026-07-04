import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { weeklyScheduleTemplate } from '../data/trackerPlan';
import { useProgramStore } from '../store/useProgramStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSessionStore } from '../store/useSessionStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { calculateRate } from '../utils/trackerCalculations';
import type { BullseyeCategory, DailySessionLog, YesNo } from '../types/tracker';

function isoDate(value = new Date()): string {
  return value.toISOString().slice(0, 10);
}

function dayName(value = new Date()): string {
  return value.toLocaleDateString('en-US', { weekday: 'long' });
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

const bullseyeOptions: BullseyeCategory[] = [
  'Follow',
  'Stun',
  'Draw',
  'Sidespin',
  'Thin Cuts',
  'Cheating the Pocket',
  'Rail-First',
  'High Spin',
  'Finesse',
  'Safety',
  'Mixed',
  'Shot Clock Challenge',
];

export default function TodaySession() {
  const currentWeek = useProgramStore((s) => s.currentWeek);
  const profile = useSettingsStore((s) => s.profile);
  const markComplete = useSessionStore((s) => s.markComplete);
  const addDailySessionLog = useTrackerStore((s) => s.addDailySessionLog);
  const logs = useTrackerStore((s) => s.dailySessionLogs);

  const today = isoDate();
  const day = dayName();

  const template = useMemo(
    () => weeklyScheduleTemplate.find((item) => item.day === day) ?? weeklyScheduleTemplate[0],
    [day],
  );

  const alreadyLogged = logs.some((item) => item.date === today);

  const [focusArea, setFocusArea] = useState(template.focusArea);
  const [lengthMinutes, setLengthMinutes] = useState(75);
  const [drillRoomShotmakingPct, setDrillRoomShotmakingPct] = useState(0);
  const [bullseyeProximity, setBullseyeProximity] = useState(0);
  const [bullseyeCategory, setBullseyeCategory] = useState<BullseyeCategory>('Mixed');
  const [wpbLesson, setWpbLesson] = useState<YesNo>('No');
  const [wpbModuleName, setWpbModuleName] = useState('');
  const [ghostGamesWon, setGhostGamesWon] = useState(0);
  const [ghostGamesPlayed, setGhostGamesPlayed] = useState(10);
  const [lineUpShotCount, setLineUpShotCount] = useState(0);
  const [safetySuccesses, setSafetySuccesses] = useState(0);
  const [safetyAttempts, setSafetyAttempts] = useState(10);
  const [notes, setNotes] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const ghostDrillWinRatePct = Math.round(calculateRate(ghostGamesWon, ghostGamesPlayed));
  const safetyExchangeSuccessPct = Math.round(calculateRate(safetySuccesses, safetyAttempts));

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (alreadyLogged) return;
      event.preventDefault();
      event.returnValue = 'Every session must produce a log entry. No exceptions.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [alreadyLogged]);

  function saveSessionLog(): void {
    const now = new Date().toISOString();

    const log: DailySessionLog = {
      id: `session-${Date.now()}`,
      date: today,
      dayOfWeek: day,
      weekNumber: currentWeek,
      focusArea,
      lengthMinutes: Math.max(0, lengthMinutes),
      drillRoomShotmakingPct: clampPct(drillRoomShotmakingPct),
      bullseyeProximity: Math.max(0, bullseyeProximity),
      bullseyeCategory,
      wpbLesson,
      wpbModuleName,
      ghostDrillWinRatePct,
      lineUpShotCount: Math.max(0, lineUpShotCount),
      safetyExchangeSuccessPct,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    addDailySessionLog(log, profile.currentFargoRating);
    markComplete();
    setSaveMessage('Session logged successfully.');
  }

  return (
    <PageWrapper title="Daily Session Flow">
      <Card className="mb-4">
        <p className="text-sm text-chalk-300">{today} · Week {currentWeek} · {day}</p>
        <p className="text-lg text-ivory-100">{template.focusArea}</p>
        <p className="text-sm text-ivory-200">Primary App: {template.primaryApp} · {template.sessionLengthLabel}</p>
        <p className="mt-2 text-xs text-chalk-300">Key Drills: {template.keyDrills.join(' · ')}</p>
      </Card>

      <Card className="mb-4" title="Daily Session Log (Workbook Fields)">
        <label className="mb-2 block text-sm text-chalk-300">Focus Area</label>
        <input
          value={focusArea}
          onChange={(event) => setFocusArea(event.target.value)}
          className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-chalk-300">
            Length (min)
            <input
              type="number"
              min={0}
              value={lengthMinutes}
              onChange={(event) => setLengthMinutes(Math.max(0, Number(event.target.value) || 0))}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
          <label className="text-sm text-chalk-300">
            DrillRoom Shotmaking %
            <input
              type="number"
              min={0}
              max={100}
              value={drillRoomShotmakingPct}
              onChange={(event) => setDrillRoomShotmakingPct(clampPct(Number(event.target.value) || 0))}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-sm text-chalk-300">
            Bullseye Proximity
            <input
              type="number"
              step="0.1"
              min={0}
              value={bullseyeProximity}
              onChange={(event) => setBullseyeProximity(Math.max(0, Number(event.target.value) || 0))}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
          <label className="text-sm text-chalk-300">
            Bullseye Category
            <select
              value={bullseyeCategory}
              onChange={(event) => setBullseyeCategory(event.target.value as BullseyeCategory)}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            >
              {bullseyeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-sm text-chalk-300">
            WPB Lesson?
            <select
              value={wpbLesson}
              onChange={(event) => setWpbLesson(event.target.value as YesNo)}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>
          <label className="text-sm text-chalk-300">
            WPB Module Name
            <input
              value={wpbModuleName}
              onChange={(event) => setWpbModuleName(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
        </div>
      </Card>

      <Card className="mb-4" title="Ghost Drill Race-to-10 Simulator">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-chalk-300">
            Games Won
            <input
              type="number"
              min={0}
              value={ghostGamesWon}
              onChange={(event) => setGhostGamesWon(Math.max(0, Number(event.target.value) || 0))}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
          <label className="text-sm text-chalk-300">
            Games Played
            <input
              type="number"
              min={1}
              value={ghostGamesPlayed}
              onChange={(event) => setGhostGamesPlayed(Math.max(1, Number(event.target.value) || 1))}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
        </div>
        <p className="mt-2 text-sm text-ivory-100">Ghost Drill Win Rate %: {ghostDrillWinRatePct}</p>
      </Card>

      <Card className="mb-4" title="Line-Up + Safety Exchange">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-chalk-300">
            Line-Up Shot Count
            <input
              type="number"
              min={0}
              value={lineUpShotCount}
              onChange={(event) => setLineUpShotCount(Math.max(0, Number(event.target.value) || 0))}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
          <label className="text-sm text-chalk-300">
            Safety Successes
            <input
              type="number"
              min={0}
              value={safetySuccesses}
              onChange={(event) => setSafetySuccesses(Math.max(0, Number(event.target.value) || 0))}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm text-chalk-300">
          Safety Attempts
          <input
            type="number"
            min={1}
            value={safetyAttempts}
            onChange={(event) => setSafetyAttempts(Math.max(1, Number(event.target.value) || 1))}
            className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
        </label>
        <p className="mt-2 text-sm text-ivory-100">Safety Exchange Success %: {safetyExchangeSuccessPct}</p>
      </Card>

      <Card title="Notes + Required Save">
        <label className="mb-2 block text-sm text-chalk-300">Notes</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="mb-3 min-h-24 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />
        <Button className="w-full" onClick={saveSessionLog}>Save Session Log</Button>
        {alreadyLogged ? <p className="mt-2 text-sm text-cue-300">A log entry already exists for today.</p> : null}
        {saveMessage ? <p className="mt-2 text-sm text-cue-300">{saveMessage}</p> : null}
      </Card>
    </PageWrapper>
  );
}
