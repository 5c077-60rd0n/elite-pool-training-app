import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NumberStepperField } from '../components/ui/NumberStepperField';
import { PageWrapper } from '../components/layout/PageWrapper';
import { weeklyScheduleTemplate } from '../data/trackerPlan';
import { useProgramStore } from '../store/useProgramStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSessionStore } from '../store/useSessionStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { calculateRate } from '../utils/trackerCalculations';
import { triggerRewardCue } from '../utils/rewardEffects';
import { getTrackerGamificationSnapshot } from '../utils/trackerGamification';
import type { BullseyeCategory, DailySessionLog, YesNo } from '../types/tracker';

const celebrationBursts = [6, 18, 31, 43, 56, 68, 81, 93];

function isoDate(value = new Date()): string {
  return value.toISOString().slice(0, 10);
}

function dayName(value = new Date()): string {
  return value.toLocaleDateString('en-US', { weekday: 'long' });
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function formatElapsed(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  return [hours, minutes, secs].map((part) => part.toString().padStart(2, '0')).join(':');
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
  const timerDate = useSessionStore((s) => s.timerDate);
  const timerRunning = useSessionStore((s) => s.timerRunning);
  const timerStartedAt = useSessionStore((s) => s.timerStartedAt);
  const timerAccumulatedSeconds = useSessionStore((s) => s.timerAccumulatedSeconds);
  const startTimer = useSessionStore((s) => s.startTimer);
  const pauseTimer = useSessionStore((s) => s.pauseTimer);
  const resumeTimer = useSessionStore((s) => s.resumeTimer);
  const stopTimer = useSessionStore((s) => s.stopTimer);
  const resetTimer = useSessionStore((s) => s.resetTimer);
  const addDailySessionLog = useTrackerStore((s) => s.addDailySessionLog);
  const adaptiveDailyPlan = useTrackerStore((s) => s.adaptiveDailyPlan);
  const refreshAdaptiveDailyPlan = useTrackerStore((s) => s.refreshAdaptiveDailyPlan);
  const recoveryRecommendationPlan = useTrackerStore((s) => s.recoveryRecommendationPlan);
  const refreshRecoveryRecommendationPlan = useTrackerStore((s) => s.refreshRecoveryRecommendationPlan);
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const soundEnabled = useGamificationStore((s) => s.soundEnabled);
  const hapticsEnabled = useGamificationStore((s) => s.hapticsEnabled);

  const today = isoDate();
  const day = dayName();

  const template = useMemo(
    () => weeklyScheduleTemplate.find((item) => item.day === day) ?? weeklyScheduleTemplate[0],
    [day],
  );

  const alreadyLogged = logs.some((item) => item.date === today);
  const lastLoggedSession = useMemo(
    () => logs.find((item) => item.date !== today) ?? logs[0],
    [logs, today],
  );

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
  const [celebration, setCelebration] = useState<{ title: string; subtitle: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [focusTouched, setFocusTouched] = useState(false);
  const [lengthTouched, setLengthTouched] = useState(false);

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

  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setCelebration(null), 2200);
    return () => window.clearTimeout(timer);
  }, [celebration]);

  useEffect(() => {
    refreshAdaptiveDailyPlan(profile.currentFargoRating, currentWeek);
    refreshRecoveryRecommendationPlan();
  }, [
    currentWeek,
    profile.currentFargoRating,
    refreshAdaptiveDailyPlan,
    refreshRecoveryRecommendationPlan,
    logs.length,
  ]);

  useEffect(() => {
    if (alreadyLogged || !adaptiveDailyPlan) return;

    if (!focusTouched) {
      setFocusArea(adaptiveDailyPlan.focusKpiName || template.focusArea);
    }

    if (!lengthTouched && adaptiveDailyPlan.recommendedMinutes > 0) {
      setLengthMinutes(adaptiveDailyPlan.recommendedMinutes);
    }
  }, [
    adaptiveDailyPlan,
    alreadyLogged,
    focusTouched,
    lengthTouched,
    template.focusArea,
  ]);

  useEffect(() => {
    if (timerDate === today) return;
    resetTimer();
  }, [resetTimer, timerDate, today]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const liveElapsedSeconds = timerAccumulatedSeconds + (timerRunning && timerStartedAt
    ? Math.max(0, Math.floor((nowMs - Date.parse(timerStartedAt)) / 1000))
    : 0);
  const dataConfidenceNudges = useMemo(() => {
    const nudges: string[] = [];
    if (drillRoomShotmakingPct === 0) nudges.push('DrillRoom %');
    if (ghostGamesWon === 0) nudges.push('Ghost wins');
    if (lineUpShotCount === 0) nudges.push('Line-up best run');
    if (safetySuccesses === 0) nudges.push('Safety successes');
    if (!notes.trim()) nudges.push('Session notes');
    return nudges;
  }, [drillRoomShotmakingPct, ghostGamesWon, lineUpShotCount, notes, safetySuccesses]);

  function handleTimerEndAndApply(): void {
    const totalSeconds = timerRunning ? stopTimer() : liveElapsedSeconds;
    const roundedMinutes = Math.max(1, Math.round(totalSeconds / 60));
    setLengthMinutes(roundedMinutes);
  }

  function applyAdaptiveTargets(): void {
    if (!adaptiveDailyPlan) return;
    setLengthTouched(true);
    setLengthMinutes(Math.max(1, adaptiveDailyPlan.recommendedMinutes));
    setDrillRoomShotmakingPct(clampPct(adaptiveDailyPlan.targetMetrics.drillRoomShotmakingPct));
    setBullseyeProximity(Math.max(0, adaptiveDailyPlan.targetMetrics.bullseyeProximity));
    setGhostGamesPlayed(10);
    setGhostGamesWon(Math.round((adaptiveDailyPlan.targetMetrics.ghostDrillWinRatePct / 100) * 10));
    setSafetyAttempts(10);
    setSafetySuccesses(Math.round((adaptiveDailyPlan.targetMetrics.safetyExchangeSuccessPct / 100) * 10));
  }

  function applyLastSession(): void {
    if (!lastLoggedSession) return;
    setFocusTouched(true);
    setLengthTouched(true);
    setFocusArea(lastLoggedSession.focusArea);
    setLengthMinutes(Math.max(0, lastLoggedSession.lengthMinutes));
    setDrillRoomShotmakingPct(clampPct(lastLoggedSession.drillRoomShotmakingPct));
    setBullseyeProximity(Math.max(0, lastLoggedSession.bullseyeProximity));
    setBullseyeCategory(lastLoggedSession.bullseyeCategory);
    setWpbLesson(lastLoggedSession.wpbLesson);
    setWpbModuleName(lastLoggedSession.wpbModuleName);
    setGhostGamesPlayed(10);
    setGhostGamesWon(Math.round((lastLoggedSession.ghostDrillWinRatePct / 100) * 10));
    setLineUpShotCount(Math.max(0, lastLoggedSession.lineUpShotCount));
    setSafetyAttempts(10);
    setSafetySuccesses(Math.round((lastLoggedSession.safetyExchangeSuccessPct / 100) * 10));
    setNotes(lastLoggedSession.notes);
  }

  function saveSessionLog(): void {
    const now = new Date().toISOString();
    const before = getTrackerGamificationSnapshot(logs);
    const missingCoreFields = dataConfidenceNudges.filter((item) => item !== 'Session notes');

    if (missingCoreFields.length >= 3) {
      const proceed = window.confirm(
        `Quick quality check: ${missingCoreFields.join(', ')} are still zero/blank. Save anyway?`,
      );
      if (!proceed) return;
    }

    let effectiveLengthMinutes = Math.max(0, lengthMinutes);

    if (timerRunning && liveElapsedSeconds > 0) {
      const suggestedMinutes = Math.max(1, Math.round(liveElapsedSeconds / 60));
      const applyTimerLength = window.confirm(
        `Session timer is still running (${formatElapsed(liveElapsedSeconds)}). Apply ${suggestedMinutes} minutes to session length before saving?`,
      );
      if (applyTimerLength) {
        effectiveLengthMinutes = suggestedMinutes;
        setLengthMinutes(suggestedMinutes);
      }
      stopTimer();
    }

    const log: DailySessionLog = {
      id: `session-${Date.now()}`,
      date: today,
      dayOfWeek: day,
      weekNumber: currentWeek,
      focusArea,
      lengthMinutes: effectiveLengthMinutes,
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

    const after = getTrackerGamificationSnapshot([log, ...logs]);
    const leveledUp = after.level > before.level;
    const questCompleted = after.weeklyQuests.some((quest) => {
      const previous = before.weeklyQuests.find((item) => item.id === quest.id);
      return quest.completed && !previous?.completed;
    });
    const seasonBossCompleted = after.seasonChallenges.bossChallenges.some((boss) => {
      const previous = before.seasonChallenges.bossChallenges.find((item) => item.id === boss.id);
      return boss.completed && !previous?.completed;
    });
    const seasonChainStepCompleted = after.seasonChallenges.themedQuestChain.some((step) => {
      const previous = before.seasonChallenges.themedQuestChain.find((item) => item.id === step.id);
      return step.completed && !previous?.completed;
    });

    if (after.latestSession) {
      triggerRewardCue({
        xpEarned: after.latestSession.xpEarned,
        leveledUp,
        questCompleted,
        soundEnabled,
        hapticsEnabled,
      });
    }

    const latestXp = after.latestSession?.xpEarned ?? 0;
    const latestQuality = after.latestSession?.qualityScore ?? 0;
    setSaveMessage(
      `Session logged. +${latestXp} XP · Quality ${latestQuality} · Level ${after.level}${
        leveledUp ? ' (Level Up!)' : ''
      }`,
    );

    if (leveledUp) {
      setCelebration({
        title: `Level ${after.level} Reached`,
        subtitle: `+${latestXp} XP · Keep pressing this pace`,
      });
      return;
    }

    if (seasonBossCompleted) {
      setCelebration({
        title: 'Season Boss Defeated',
        subtitle: `Tier ${after.seasonMeta.ladderTier} · Rank #${after.seasonMeta.ladderRank}`,
      });
      return;
    }

    if (seasonChainStepCompleted) {
      setCelebration({
        title: 'Season Quest Chain Progress',
        subtitle: `7-day quality avg ${after.seasonChallenges.qualityScore7DayAvg}`,
      });
      return;
    }

    if (questCompleted) {
      setCelebration({
        title: 'Weekly Quest Complete',
        subtitle: `+${latestXp} XP · Great consistency`,
      });
    }
  }

  return (
    <PageWrapper title="Today's Session">
      {celebration ? (
        <div className="celebration-overlay" role="status" aria-live="polite">
          <div className="celebration-card">
            <p className="celebration-title">{celebration.title}</p>
            <p className="celebration-subtitle">{celebration.subtitle}</p>
          </div>
          {celebrationBursts.map((seed) => (
            <span
              key={seed}
              className="celebration-burst"
              style={{ left: `${seed}%`, animationDelay: `${(seed % 7) * 80}ms` }}
            />
          ))}
        </div>
      ) : null}

      <Card className="mb-4" title="Today's Template">
        <p className="text-sm text-chalk-300">{today} · Week {currentWeek} · {day}</p>
        <p className="text-lg text-ivory-100">{template.focusArea}</p>
        <p className="text-sm text-ivory-200">Primary App: {template.primaryApp} · {template.sessionLengthLabel}</p>
        <p className="mt-2 text-xs text-chalk-300">Key Drills: {template.keyDrills.join(' · ')}</p>
      </Card>

      <Card className="mb-4" title="Session Timer">
        <p className="font-display text-3xl uppercase tracking-[0.08em] text-ivory-100">{formatElapsed(liveElapsedSeconds)}</p>
        <p className="mt-1 text-xs text-chalk-300">Use Start/Pause during practice. End & Apply auto-fills session length (you can still edit manually).</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {!timerRunning && liveElapsedSeconds === 0 ? (
            <Button onClick={startTimer}>Start</Button>
          ) : null}
          {timerRunning ? (
            <Button variant="secondary" onClick={pauseTimer}>Pause</Button>
          ) : null}
          {!timerRunning && liveElapsedSeconds > 0 ? (
            <Button variant="secondary" onClick={resumeTimer}>Resume</Button>
          ) : null}
          <Button variant="secondary" onClick={handleTimerEndAndApply} disabled={liveElapsedSeconds === 0}>End & Apply</Button>
          <Button variant="secondary" onClick={resetTimer} disabled={timerRunning || liveElapsedSeconds === 0}>Reset</Button>
        </div>
      </Card>

      {adaptiveDailyPlan ? (
        <Card className="mb-4" title="Adaptive Daily Plan">
          {adaptiveDailyPlan.eliteOverride?.lockedForDate === today && !alreadyLogged ? (
            <p className="mb-2 text-xs text-cue-300">Elite override active for today. Promoted priorities are locked until you save today's session.</p>
          ) : null}
          <p className="text-sm text-ivory-100">Focus KPI: {adaptiveDailyPlan.focusKpiName}</p>
          <p className="mt-1 text-xs text-chalk-300">{adaptiveDailyPlan.rationale}</p>
          <p className="mt-2 text-sm text-chalk-300">Recommended Length: {adaptiveDailyPlan.recommendedMinutes} min</p>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ivory-200">
            <p>DrillRoom Target: {adaptiveDailyPlan.targetMetrics.drillRoomShotmakingPct}%</p>
            <p>Ghost Target: {adaptiveDailyPlan.targetMetrics.ghostDrillWinRatePct}%</p>
            <p>Safety Target: {adaptiveDailyPlan.targetMetrics.safetyExchangeSuccessPct}%</p>
            <p>Line-Up Best Run Target: {'>= '}{adaptiveDailyPlan.targetMetrics.lineUpShotCount}</p>
            <p>Bullseye Target: {'<= '}{adaptiveDailyPlan.targetMetrics.bullseyeProximity}</p>
            <p>WPB Lessons: {adaptiveDailyPlan.targetMetrics.wpbLessonsThisWeek}/week</p>
          </div>

          <div className="mt-2 space-y-1 text-xs text-chalk-300">
            {adaptiveDailyPlan.actionChecklist.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
        </Card>
      ) : null}

      {recoveryRecommendationPlan ? (
        <Card className="mb-4" title="Recovery Plan (3-Day)">
          <p className="text-sm text-ivory-100">Focus: {recoveryRecommendationPlan.focusKpiName}</p>
          <p className="mt-1 text-xs text-chalk-300">{recoveryRecommendationPlan.rationale}</p>
          <p className="mt-2 text-xs text-ivory-200">Intensity: {recoveryRecommendationPlan.severity.toUpperCase()} · Horizon: {recoveryRecommendationPlan.horizonDays} days</p>
          <p className="mt-1 text-xs text-ivory-200">Recommended Focus Area: {recoveryRecommendationPlan.recommendedFocusArea}</p>

          <div className="mt-2 space-y-1 text-xs text-chalk-300">
            {recoveryRecommendationPlan.actions.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mb-4" title="Session Log">
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button type="button" variant="secondary" onClick={applyAdaptiveTargets} disabled={!adaptiveDailyPlan}>
            Use Adaptive Targets
          </Button>
          <Button type="button" variant="secondary" onClick={applyLastSession} disabled={!lastLoggedSession}>
            Copy Last Session
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setGhostGamesPlayed(10);
              setSafetyAttempts(10);
            }}
          >
            Set Attempts to 10
          </Button>
        </div>

        <label className="mb-2 block text-sm text-chalk-300">Focus Area</label>
        <input
          value={focusArea}
          onChange={(event) => {
            setFocusTouched(true);
            setFocusArea(event.target.value);
          }}
          className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NumberStepperField
            label="Length (min)"
            value={lengthMinutes}
            min={0}
            step={5}
            onChange={(next) => {
              setLengthTouched(true);
              setLengthMinutes(next);
            }}
          />
          <NumberStepperField
            label="DrillRoom Shotmaking %"
            value={drillRoomShotmakingPct}
            min={0}
            max={100}
            step={1}
            onChange={(next) => setDrillRoomShotmakingPct(clampPct(next))}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NumberStepperField
            label="Ghost Games Won"
            value={ghostGamesWon}
            min={0}
            step={1}
            onChange={(next) => setGhostGamesWon(Math.max(0, next))}
          />
          <NumberStepperField
            label="Ghost Games Played"
            value={ghostGamesPlayed}
            min={1}
            step={1}
            onChange={(next) => setGhostGamesPlayed(Math.max(1, next))}
          />
        </div>
        <p className="mt-2 text-sm text-ivory-100">Ghost Drill Win Rate %: {ghostDrillWinRatePct}</p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NumberStepperField
            label="Safety Successes"
            value={safetySuccesses}
            min={0}
            step={1}
            onChange={(next) => setSafetySuccesses(Math.max(0, next))}
          />
          <NumberStepperField
            label="Safety Attempts"
            value={safetyAttempts}
            min={1}
            step={1}
            onChange={(next) => setSafetyAttempts(Math.max(1, next))}
          />
        </div>
        <p className="mt-2 text-sm text-ivory-100">Safety Exchange Success %: {safetyExchangeSuccessPct}</p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NumberStepperField
            label="Line-Up Best Run"
            value={lineUpShotCount}
            min={0}
            step={1}
            onChange={(next) => setLineUpShotCount(Math.max(0, next))}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NumberStepperField
            label="Bullseye Proximity"
            value={bullseyeProximity}
            min={0}
            step={0.1}
            decimals={1}
            onChange={(next) => setBullseyeProximity(Math.max(0, next))}
          />
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

      <Card title="Session Notes & Save">
        <label className="mb-2 block text-sm text-chalk-300">Notes</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="mb-3 min-h-24 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />
        {dataConfidenceNudges.length ? (
          <p className="mb-3 text-xs text-chalk-300">
            Data confidence nudge: still zero or blank: {dataConfidenceNudges.join(' · ')}
          </p>
        ) : null}
        <Button className="w-full" onClick={saveSessionLog}>Save Today's Log</Button>
        {alreadyLogged ? <p className="mt-2 text-sm text-cue-300">Today's session is already logged.</p> : null}
        {saveMessage ? <p className="mt-2 text-sm text-cue-300">{saveMessage}</p> : null}
      </Card>
    </PageWrapper>
  );
}
