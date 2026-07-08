import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NumberStepperField } from '../components/ui/NumberStepperField';
import { PageWrapper } from '../components/layout/PageWrapper';
import { weeklyScheduleTemplate } from '../data/trackerPlan';
import {
  bullseyeCategoryOptions,
  drillRoomDrillSuggestions,
  getWpbTierOptionsForCategory,
  wpbModuleSuggestions,
} from '../data/catalogs';
import { useProgramStore } from '../store/useProgramStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSessionStore } from '../store/useSessionStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { triggerRewardCue } from '../utils/rewardEffects';
import { generateSmartSessionAutofill } from '../utils/sessionIntelligence';
import { buildRoiPlannerSnapshot } from '../utils/roiPlanner';
import { getTrackerGamificationSnapshot } from '../utils/trackerGamification';
import {
  getAdhdModePreset,
  getAdhdRecommendationLimit,
  getAdhdSessionMode,
  type AdhdSessionMode,
} from '../utils/adhdMode';
import { emitTelemetryEvent } from '../utils/telemetry';
import type { BullseyeCategory, DailySessionLog, SessionRecommendation, WpbCategory, WpbRatingTier, YesNo } from '../types/tracker';

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

function speakAnnouncement(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.96;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

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
  const setLastSessionRecommendation = useTrackerStore((s) => s.setLastSessionRecommendation);
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const competitionLog = useTrackerStore((s) => s.competitionLog);
  const soundEnabled = useGamificationStore((s) => s.soundEnabled);
  const hapticsEnabled = useGamificationStore((s) => s.hapticsEnabled);

  const today = isoDate();
  const day = dayName();
  const adhdModeEnabled = Boolean(profile.adhdModeEnabled);

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
  const [drillRoomDrillName, setDrillRoomDrillName] = useState('');
  const [bullseyeProximity, setBullseyeProximity] = useState(0);
  const bullseyeCategory: BullseyeCategory = 'Mixed';
  const [wpbLesson, setWpbLesson] = useState<YesNo>('No');
  const [wpbCategory, setWpbCategory] = useState<WpbCategory>('Fundamentals');
  const [wpbModuleName, setWpbModuleName] = useState('');
  const [wpbTierAchieved, setWpbTierAchieved] = useState<WpbRatingTier | ''>('');
  const wpbKeyTakeaway = '';
  const [ghostDrillPlayed, setGhostDrillPlayed] = useState<YesNo>('Yes');
  const [ghostDrillWinRatePct, setGhostDrillWinRatePct] = useState(50);
  const [notes, setNotes] = useState('');
  const [coachTagsInput, setCoachTagsInput] = useState('');
  const [videoClipRefsInput, setVideoClipRefsInput] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [postSessionSummary, setPostSessionSummary] = useState<SessionRecommendation | null>(null);
  const [celebration, setCelebration] = useState<{ title: string; subtitle: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [focusTouched, setFocusTouched] = useState(false);
  const [lengthTouched, setLengthTouched] = useState(false);
  const [showAdvancedPanels, setShowAdvancedPanels] = useState(false);
  const [adhdSessionModeOverride, setAdhdSessionModeOverride] = useState<AdhdSessionMode | null>(null);
  const [breakLockUntilMs, setBreakLockUntilMs] = useState<number | null>(null);
  const capEventSentRef = useRef(false);
  const autoModePresetAppliedRef = useRef(false);
  const breakAnnouncementSentRef = useRef(false);
  const returnAnnouncementSentRef = useRef(false);

  const smartAutofill = useMemo(
    () => generateSmartSessionAutofill(logs, adaptiveDailyPlan, recoveryRecommendationPlan, competitionLog),
    [adaptiveDailyPlan, competitionLog, logs, recoveryRecommendationPlan],
  );

  const roiPlanner = useMemo(
    () =>
      buildRoiPlannerSnapshot({
        logs,
        adaptiveDailyPlan,
        competitionLog,
        drillRoomSuggestions: drillRoomDrillSuggestions,
        wpbSuggestions: wpbModuleSuggestions,
        bullseyeCategories: bullseyeCategoryOptions,
      }),
    [adaptiveDailyPlan, competitionLog, logs],
  );

  const todaysExactDrills = useMemo(() => {
    if (adaptiveDailyPlan?.prescribedDrills?.length) {
      return adaptiveDailyPlan.prescribedDrills.slice(0, 3).map((label, index) => ({
        step: index + 1,
        app: index === 0 ? 'DrillRoom' : index === 1 ? 'Bullseye' : 'WPB',
        label,
      }));
    }

    return roiPlanner.prescription.slice(0, 3).map((item, index) => ({
      step: index + 1,
      app: item.app,
      label: item.label,
    }));
  }, [adaptiveDailyPlan?.prescribedDrills, roiPlanner.prescription]);

  const adhdSessionMode = useMemo(
    () => getAdhdSessionMode(logs, today),
    [logs, today],
  );
  const effectiveAdhdSessionMode = adhdSessionModeOverride ?? adhdSessionMode;
  const activeAdhdPreset = useMemo(
    () => getAdhdModePreset(effectiveAdhdSessionMode),
    [effectiveAdhdSessionMode],
  );

  const recommendationLimit = getAdhdRecommendationLimit(adhdModeEnabled);
  const showExtraLogFields = !adhdModeEnabled || showAdvancedPanels;
  const linearSessionSteps = useMemo(() => {
    if (!adhdModeEnabled) return [];

    const returnStepAction =
      activeAdhdPreset.mode === 'standard'
        ? `Return immediately and run the second ${activeAdhdPreset.optionalSecondBlockMinutes}-minute block.`
        : 'Return immediately, then stop and save the session.';

    return [
      {
        title: '1. Start',
        action: `Run ${activeAdhdPreset.workBlockMinutes} minutes on ${focusArea || template.focusArea}.`,
      },
      {
        title: '2. Break',
        action: `Stop for ${activeAdhdPreset.breakMinutes} minutes. No phone. No analysis.`,
      },
      {
        title: '3. Return',
        action: returnStepAction,
      },
      {
        title: '4. Close',
        action: 'Fill the quick log and save the session.',
      },
    ];
  }, [activeAdhdPreset.breakMinutes, activeAdhdPreset.mode, activeAdhdPreset.optionalSecondBlockMinutes, activeAdhdPreset.workBlockMinutes, adhdModeEnabled, focusArea, template.focusArea]);

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

  function upsertModePresetNote(mode: AdhdSessionMode): void {
    const modeLabel = mode[0].toUpperCase() + mode.slice(1);
    setNotes((prev) => {
      const stripped = prev
        .replace(/\n?\[Mode Preset: (Quick|Standard|Recovery)\]/g, '')
        .trimEnd();
      return `${stripped ? `${stripped}\n` : ''}[Mode Preset: ${modeLabel}]`;
    });
  }

  function applyAdhdModePreset(
    mode: AdhdSessionMode,
    source: 'manual_override' | 'auto_recommendation',
    persistOverride: boolean,
  ): void {
    const preset = getAdhdModePreset(mode);

    if (persistOverride) {
      setAdhdSessionModeOverride(mode);
    }

    setLengthTouched(true);
    setLengthMinutes(preset.recommendedMinutes);

    if (mode === 'quick') {
      setShowAdvancedPanels(false);
      setGhostDrillPlayed('Yes');
      setWpbLesson('Yes');
      setWpbCategory('Fundamentals');
      setWpbTierAchieved((prev) => prev || 'Beginner');
      if (!focusTouched) {
        setFocusTouched(true);
        setFocusArea(preset.defaultFocusArea);
      }
    }

    if (mode === 'standard') {
      setGhostDrillPlayed('Yes');
      setWpbLesson('Yes');
      if (!focusTouched) {
        setFocusTouched(true);
        setFocusArea(template.focusArea || preset.defaultFocusArea);
      }
    }

    if (mode === 'recovery') {
      setShowAdvancedPanels(false);
      setGhostDrillPlayed('No');
      setGhostDrillWinRatePct(0);
      setWpbLesson('No');
      setWpbTierAchieved('');
      setFocusTouched(true);
      setFocusArea(recoveryRecommendationPlan?.recommendedFocusArea ?? preset.defaultFocusArea);
    }

    upsertModePresetNote(mode);

    emitTelemetryEvent('session_mode_selected', {
      mode,
      source,
      presetApplied: true,
    });
  }

  useEffect(() => {
    if (!adhdModeEnabled || alreadyLogged || autoModePresetAppliedRef.current || focusTouched || lengthTouched) return;
    autoModePresetAppliedRef.current = true;
    applyAdhdModePreset(effectiveAdhdSessionMode, 'auto_recommendation', false);
  }, [
    adhdModeEnabled,
    alreadyLogged,
    effectiveAdhdSessionMode,
    focusTouched,
    lengthTouched,
    recoveryRecommendationPlan?.recommendedFocusArea,
    template.focusArea,
  ]);

  useEffect(() => {
    if (!adhdModeEnabled || capEventSentRef.current) return;
    capEventSentRef.current = true;
    emitTelemetryEvent('recommendation_cap_applied', {
      cap: recommendationLimit,
      mode: effectiveAdhdSessionMode,
    });
  }, [adhdModeEnabled, effectiveAdhdSessionMode, recommendationLimit]);

  useEffect(() => {
    if (timerDate === today) return;
    resetTimer();
  }, [resetTimer, timerDate, today]);

  useEffect(() => {
    if (!timerRunning && !breakLockUntilMs) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [breakLockUntilMs, timerRunning]);

  useEffect(() => {
    breakAnnouncementSentRef.current = false;
    returnAnnouncementSentRef.current = false;
    setBreakLockUntilMs(null);
  }, [effectiveAdhdSessionMode, timerDate, today]);

  const liveElapsedSeconds = timerAccumulatedSeconds + (timerRunning && timerStartedAt
    ? Math.max(0, Math.floor((nowMs - Date.parse(timerStartedAt)) / 1000))
    : 0);
  const dataConfidenceNudges = useMemo(() => {
    const nudges: string[] = [];
    if (drillRoomShotmakingPct === 0) nudges.push('DrillRoom %');
    if (!notes.trim()) nudges.push('Session notes');
    return nudges;
  }, [drillRoomShotmakingPct, notes]);

  const primaryTimerActionLabel = timerRunning
    ? 'Pause Timer'
    : liveElapsedSeconds > 0
      ? 'Resume Timer'
      : 'Start Timer';
  const adhdBreakStartSeconds = activeAdhdPreset.workBlockMinutes * 60;
  const adhdBreakLockActive = adhdModeEnabled
    && breakLockUntilMs !== null
    && nowMs < breakLockUntilMs;
  const adhdBreakRemainingSeconds = adhdBreakLockActive && breakLockUntilMs
    ? Math.max(0, Math.ceil((breakLockUntilMs - nowMs) / 1000))
    : 0;
  const adhdBreakCompleted = adhdModeEnabled
    && breakLockUntilMs !== null
    && nowMs >= breakLockUntilMs;
  const adhdStopCheckpointSeconds =
    (activeAdhdPreset.workBlockMinutes + activeAdhdPreset.optionalSecondBlockMinutes) * 60;
  const adhdBreakDue = adhdModeEnabled
    && !adhdBreakLockActive
    && !adhdBreakCompleted
    && liveElapsedSeconds >= adhdBreakStartSeconds;
  const adhdStopRuleDue = adhdModeEnabled
    && activeAdhdPreset.optionalSecondBlockMinutes > 0
    && liveElapsedSeconds >= adhdStopCheckpointSeconds;

  useEffect(() => {
    if (!adhdModeEnabled || !timerRunning || breakLockUntilMs !== null || liveElapsedSeconds < adhdBreakStartSeconds) return;

    pauseTimer();
    setBreakLockUntilMs(Date.now() + (activeAdhdPreset.breakMinutes * 60 * 1000));

    if (!breakAnnouncementSentRef.current) {
      breakAnnouncementSentRef.current = true;
      speakAnnouncement(`Break. Reset for ${activeAdhdPreset.breakMinutes} minutes.`);
    }

    emitTelemetryEvent('adhd_break_enforced', {
      mode: activeAdhdPreset.mode,
      breakMinutes: activeAdhdPreset.breakMinutes,
      elapsedSeconds: liveElapsedSeconds,
    });
  }, [
    activeAdhdPreset.breakMinutes,
    activeAdhdPreset.mode,
    adhdBreakStartSeconds,
    adhdModeEnabled,
    breakLockUntilMs,
    liveElapsedSeconds,
    pauseTimer,
    timerRunning,
  ]);

  useEffect(() => {
    if (!adhdModeEnabled || !adhdBreakCompleted || returnAnnouncementSentRef.current) return;
    returnAnnouncementSentRef.current = true;
    speakAnnouncement(activeAdhdPreset.mode === 'standard' ? 'Return. Run the second block now.' : 'Return. Stop and save now.');
  }, [activeAdhdPreset.mode, adhdBreakCompleted, adhdModeEnabled]);

  function handleTimerEndAndApply(): void {
    const totalSeconds = timerRunning ? stopTimer() : liveElapsedSeconds;
    const roundedMinutes = Math.max(1, Math.round(totalSeconds / 60));
    setLengthMinutes(roundedMinutes);
    setBreakLockUntilMs(null);
  }

  function handleResumeTimer(): void {
    if (adhdBreakLockActive) return;
    setBreakLockUntilMs(null);
    resumeTimer();
  }

  function handleResetTimer(): void {
    setBreakLockUntilMs(null);
    resetTimer();
  }

  function applySmartAutofill(): void {
    setFocusTouched(true);
    setLengthTouched(true);
    setFocusArea(smartAutofill.focusArea);
    setLengthMinutes(Math.max(1, smartAutofill.lengthMinutes));
    setDrillRoomShotmakingPct(clampPct(smartAutofill.drillRoomShotmakingPct));
    setBullseyeProximity(Math.max(0, smartAutofill.bullseyeProximity));
  }

  function applyRoiPrescription(): void {
    setFocusTouched(true);
    setLengthTouched(true);
    setFocusArea(`ROI Focus: ${roiPlanner.focusBucket}`);
    setLengthMinutes(Math.max(1, roiPlanner.recommendedMinutes));

    const drillroomPick = roiPlanner.prescription.find((item) => item.app === 'DrillRoom');
    if (drillroomPick) {
      const parts = drillroomPick.label.split('>').map((item) => item.trim());
      setDrillRoomDrillName(parts[parts.length - 1] ?? drillroomPick.label);
    }

    const wpbPick = roiPlanner.prescription.find((item) => item.app === 'WPB');
    if (wpbPick) {
      setWpbLesson('Yes');
      setWpbModuleName(wpbPick.label);
      const nextTiers = getWpbTierOptionsForCategory(wpbCategory);
      setWpbTierAchieved(nextTiers[0] ?? '');
    }

    setNotes((prev) => {
      const prefix = prev ? `${prev}\n` : '';
      return `${prefix}ROI prescription: ${roiPlanner.prescription
        .map((item) => `${item.slot.toUpperCase()} - ${item.app} - ${item.label}`)
        .join(' | ')}`;
    });
  }

  function applyRoadMode(minutes: number): void {
    setLengthTouched(true);
    setLengthMinutes(minutes);
    setNotes((prev) => `${prev ? `${prev}\n` : ''}Road mode applied: ${minutes} minutes.`);
  }

  function applyWeeklyAutoFocus(): void {
    const primary = roiPlanner.weeklyAutoFocus.weakestTwo[0] ?? roiPlanner.focusBucket;
    setFocusTouched(true);
    setFocusArea(`Weekly Auto-Focus: ${primary}`);
    setNotes((prev) => {
      const prefix = prev ? `${prev}\n` : '';
      return `${prefix}Next-week rotation: ${roiPlanner.weeklyAutoFocus.nextWeekRotation.join(' | ')}`;
    });
  }

  function injectCoachBriefToNotes(): void {
    setNotes((prev) => {
      const prefix = prev ? `${prev}\n` : '';
      return `${prefix}Coach brief: ${roiPlanner.coachBrief.join(' ')}`;
    });
  }

  function applyRecoveryProtocol(): void {
    if (!recoveryRecommendationPlan) return;
    const lowLoadMinutes = recoveryRecommendationPlan.severity === 'high' ? 50 : 60;
    setLengthTouched(true);
    setLengthMinutes(lowLoadMinutes);
    setFocusArea(recoveryRecommendationPlan.recommendedFocusArea);
    setNotes((prev) => `${prev ? `${prev}\n` : ''}Recovery protocol: ${recoveryRecommendationPlan.actions.join(' | ')}`);
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
    const derivedGhostDrillWinRatePct = Math.round(
      ghostDrillPlayed === 'Yes'
        ? clampPct(ghostDrillWinRatePct)
        : 0,
    );
    const derivedLineUpShotCount = Math.max(
      0,
      Math.round(
        adaptiveDailyPlan?.targetMetrics.lineUpShotCount
        ?? smartAutofill.lineUpShotCount
        ?? lastLoggedSession?.lineUpShotCount
        ?? 20,
      ),
    );
    const derivedSafetyExchangeSuccessPct = Math.round(
      adaptiveDailyPlan?.targetMetrics.safetyExchangeSuccessPct
      ?? smartAutofill.safetyExchangeSuccessPct
      ?? lastLoggedSession?.safetyExchangeSuccessPct
      ?? 55,
    );

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
      setBreakLockUntilMs(null);
    }

    const log: DailySessionLog = {
      id: `session-${Date.now()}`,
      date: today,
      dayOfWeek: day,
      weekNumber: currentWeek,
      focusArea,
      lengthMinutes: effectiveLengthMinutes,
      drillRoomShotmakingPct: clampPct(drillRoomShotmakingPct),
      drillRoomDrillName,
      bullseyeProximity: Math.max(0, bullseyeProximity),
      bullseyeCategory,
      wpbLesson,
      wpbCategory: wpbLesson === 'Yes' ? wpbCategory : undefined,
      wpbModuleName,
      wpbTierAchieved: wpbLesson === 'Yes' ? (wpbTierAchieved || undefined) : undefined,
      wpbKeyTakeaway,
      ghostDrillPlayed,
      ghostDrillWinRatePct: derivedGhostDrillWinRatePct,
      lineUpShotCount: derivedLineUpShotCount,
      safetyExchangeSuccessPct: derivedSafetyExchangeSuccessPct,
      notes,
      coachTags: coachTagsInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      videoClipRefs: videoClipRefsInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
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
    const suggestedNextMode: 'quick' | 'standard' | 'recovery' =
      latestQuality < 60 || effectiveLengthMinutes < 20
        ? 'recovery'
        : latestQuality >= 78 && effectiveLengthMinutes >= 45
          ? 'standard'
          : 'quick';
    const suggestedNextStep =
      suggestedNextMode === 'recovery'
        ? 'Use a recovery day next: short block, lower friction, one simple target.'
        : suggestedNextMode === 'standard'
          ? 'Use a standard session next: one focused block, one break, then decide whether to continue.'
          : 'Use a quick session next: one short clean block and stop before fatigue blurs the work.';
    const comebackBonusAwarded = Boolean(after.latestSession?.bonusTags.includes('Comeback bonus'));
    if (comebackBonusAwarded) {
      emitTelemetryEvent('comeback_bonus_awarded', {
        mode: adhdModeEnabled ? effectiveAdhdSessionMode : 'standard',
        week: currentWeek,
        date: today,
      });
    }
    setSaveMessage(
      `Session logged. +${latestXp} XP · Quality ${latestQuality} · Level ${after.level}${
        leveledUp ? ' (Level Up!)' : ''
      }`,
    );
    setPostSessionSummary({
      title: `Next session: ${suggestedNextMode.toUpperCase()}`,
      nextMode: suggestedNextMode,
      nextStep: suggestedNextStep,
      rationale:
        latestQuality < 60
          ? 'Quality was low enough that the app is favoring a lower-friction recovery pattern.'
          : latestQuality >= 78
            ? 'Quality held up well, so the next session can stay efficient without shrinking the work too much.'
            : 'The app is steering toward a short, repeatable block to protect consistency and attention.',
      updatedAt: now,
    });
    setLastSessionRecommendation({
      title: `Next session: ${suggestedNextMode.toUpperCase()}`,
      nextMode: suggestedNextMode,
      nextStep: suggestedNextStep,
      rationale:
        latestQuality < 60
          ? 'Quality was low enough that the app is favoring a lower-friction recovery pattern.'
          : latestQuality >= 78
            ? 'Quality held up well, so the next session can stay efficient without shrinking the work too much.'
            : 'The app is steering toward a short, repeatable block to protect consistency and attention.',
      updatedAt: now,
    });

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

      <Card className="mb-4 border-cue-500/25 bg-gradient-to-br from-cue-950/20 via-felt-800/90 to-felt-900/95 p-4 sm:p-5" title="Today's Game Plan">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-flash-500/30 bg-flash-950/20 px-2 py-1 text-flash-200">Session Command</span>
          <span className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-chalk-200">{today}</span>
          <span className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-chalk-200">Week {currentWeek}</span>
          <span className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-chalk-200">{day}</span>
        </div>
        {adhdModeEnabled ? (
          <p className="mt-1 text-xs text-cue-300">ADHD mode active · {effectiveAdhdSessionMode.toUpperCase()} session</p>
        ) : null}
        <div className="mt-3 rounded-2xl border border-cue-600/30 bg-cue-950/15 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-cue-300">Primary focus</p>
          <p className="mt-2 text-2xl font-semibold leading-tight text-ivory-100 sm:text-3xl">{focusArea || template.focusArea}</p>
          <p className="mt-2 text-sm text-ivory-200">{template.sessionLengthLabel} · Start with one full DrillRoom + Bullseye + WPB cycle.</p>
        </div>
        {adhdModeEnabled ? (
          <p className="mt-2 rounded-xl border border-cue-700/50 bg-cue-950/20 px-3 py-2 text-xs text-cue-200">
            ADHD protocol: {activeAdhdPreset.workBlockMinutes}m focus + {activeAdhdPreset.breakMinutes}m reset
            {activeAdhdPreset.optionalSecondBlockMinutes > 0 ? ` + optional ${activeAdhdPreset.optionalSecondBlockMinutes}m second block` : ''}. {activeAdhdPreset.stopRule}
          </p>
        ) : null}
        {adhdModeEnabled ? (
          <div className="mt-4 rounded-2xl border border-felt-600/60 bg-felt-800/55 p-4 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Follow this path</p>
            <div className="mt-3 space-y-3">
              {linearSessionSteps.map((step, index) => (
                <div key={step.title} className="flex gap-3 rounded-2xl border border-felt-600/60 bg-felt-900/30 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cue-600/50 bg-cue-900/20 text-sm text-cue-200">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ivory-100">{step.title}</p>
                    <p className="mt-1 text-xs text-chalk-300">{step.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      {todaysExactDrills.length ? (
        <Card className="mb-4 border-cue-500/25 bg-gradient-to-br from-cue-950/18 via-felt-800/90 to-felt-900/95 p-4 sm:p-5" title="Assigned Drills (Do In Order)">
          <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Exact work list</p>
          <p className="mt-1 text-xs text-chalk-300">Run these in sequence. Do not add extras before finishing all three.</p>
          <div className="mt-3 space-y-2">
            {todaysExactDrills.map((item) => (
              <div key={`${item.step}-${item.app}-${item.label}`} className="flex gap-3 rounded-2xl border border-felt-600/60 bg-felt-900/30 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cue-600/50 bg-cue-900/20 text-sm text-cue-200">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ivory-100">{item.app}</p>
                  <p className="mt-1 text-xs text-chalk-300">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {adhdModeEnabled ? (
        <Card className="mb-4" title="Session Protocol">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-felt-600 bg-felt-800/60 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Step 1</p>
              <p className="mt-1 text-ivory-100">Run {activeAdhdPreset.workBlockMinutes} minutes on the assigned focus.</p>
            </div>
            <div className="rounded-lg border border-felt-600 bg-felt-800/60 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Step 2</p>
              <p className="mt-1 text-ivory-100">Stop for {activeAdhdPreset.breakMinutes} minutes.</p>
            </div>
            <div className="rounded-lg border border-felt-600 bg-felt-800/60 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Step 3</p>
              <p className="mt-1 text-ivory-100">
                {activeAdhdPreset.mode === 'standard'
                  ? `Run the next ${activeAdhdPreset.optionalSecondBlockMinutes}-minute block.`
                  : 'Return and save the session.'}
              </p>
            </div>
            <div className="rounded-lg border border-felt-600 bg-felt-800/60 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Step 4</p>
              <p className="mt-1 text-ivory-100">Save the log. No extra work.</p>
            </div>
            <p className="text-xs text-chalk-300">Audio cues match the same short commands.</p>
          </div>
        </Card>
      ) : null}

      <Card className="mb-4" title="2. Practice Timer">
        <p className="font-display text-3xl uppercase tracking-[0.08em] text-ivory-100">{formatElapsed(liveElapsedSeconds)}</p>
        <p className="mt-1 text-xs text-chalk-300">Start practice, run the timer, then apply the minutes to your log.</p>
        {adhdModeEnabled ? (
          <p className="mt-2 text-xs text-cue-200">
            Timer cue: break at {activeAdhdPreset.workBlockMinutes}m. {activeAdhdPreset.stopRule}
          </p>
        ) : null}
        {adhdBreakDue ? (
          <p className="mt-2 rounded-lg border border-cue-700/50 bg-cue-950/20 px-2 py-1 text-xs text-cue-200">
            Break window active: take {activeAdhdPreset.breakMinutes} minutes now, then decide if you want another block.
          </p>
        ) : null}
        {adhdBreakLockActive ? (
          <p className="mt-2 rounded-lg border border-cue-700/50 bg-cue-950/20 px-2 py-1 text-xs text-cue-200">
            Timed break running: {formatElapsed(adhdBreakRemainingSeconds)} remaining. Timer is locked until break ends.
          </p>
        ) : null}
        {adhdBreakCompleted ? (
          <p className="mt-2 rounded-lg border border-cue-700/50 bg-cue-950/20 px-2 py-1 text-xs text-cue-200">
            Break complete: {activeAdhdPreset.mode === 'standard' ? 'resume for block two' : 'end and save your session now'}.
          </p>
        ) : null}
        {adhdStopRuleDue ? (
          <p className="mt-2 rounded-lg border border-cue-700/50 bg-cue-950/20 px-2 py-1 text-xs text-cue-200">
            Stop checkpoint reached: if execution quality has dropped, save now and protect consistency.
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {!timerRunning && liveElapsedSeconds === 0 ? (
            <Button onClick={startTimer}>{primaryTimerActionLabel}</Button>
          ) : null}
          {timerRunning ? (
            <Button variant="secondary" onClick={pauseTimer}>{primaryTimerActionLabel}</Button>
          ) : null}
          {!timerRunning && liveElapsedSeconds > 0 ? (
            <Button variant="secondary" onClick={handleResumeTimer} disabled={adhdBreakLockActive}>{primaryTimerActionLabel}</Button>
          ) : null}
          <Button variant="secondary" onClick={handleTimerEndAndApply} disabled={liveElapsedSeconds === 0 || adhdBreakLockActive}>End & Apply</Button>
          <Button variant="secondary" onClick={handleResetTimer} disabled={timerRunning || liveElapsedSeconds === 0 || adhdBreakLockActive}>Reset</Button>
        </div>
      </Card>

      {showAdvancedPanels && adaptiveDailyPlan ? (
        <Card className="mb-4" title="Adaptive Daily Plan">
          {adaptiveDailyPlan.eliteOverride?.lockedForDate === today && !alreadyLogged ? (
            <p className="mb-2 text-xs text-cue-300">Elite override active for today. Promoted priorities are locked until you save today's session.</p>
          ) : null}
          <p className="text-sm text-ivory-100">Focus KPI: {adaptiveDailyPlan.focusKpiName}</p>
          <p className="mt-1 text-xs text-chalk-300">{adaptiveDailyPlan.rationale}</p>
          <p className="mt-2 text-sm text-chalk-300">Recommended Length: {adaptiveDailyPlan.recommendedMinutes} min</p>

          <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-ivory-200 sm:grid-cols-2">
            <p className="rounded-lg border border-felt-600 bg-felt-800/60 px-2 py-1">DrillRoom Target: {adaptiveDailyPlan.targetMetrics.drillRoomShotmakingPct}%</p>
            <p className="rounded-lg border border-felt-600 bg-felt-800/60 px-2 py-1">Ghost Target: {adaptiveDailyPlan.targetMetrics.ghostDrillWinRatePct}%</p>
            <p className="rounded-lg border border-felt-600 bg-felt-800/60 px-2 py-1">Safety Target: {adaptiveDailyPlan.targetMetrics.safetyExchangeSuccessPct}%</p>
            <p className="rounded-lg border border-felt-600 bg-felt-800/60 px-2 py-1">Line-Up Best Run Target: {'>= '}{adaptiveDailyPlan.targetMetrics.lineUpShotCount}</p>
            <p className="rounded-lg border border-felt-600 bg-felt-800/60 px-2 py-1">Bullseye Target: {'<= '}{adaptiveDailyPlan.targetMetrics.bullseyeProximity}</p>
            <p className="rounded-lg border border-felt-600 bg-felt-800/60 px-2 py-1">WPB Lessons: {adaptiveDailyPlan.targetMetrics.wpbLessonsThisWeek}/week</p>
          </div>

          <div className="mt-2 space-y-1 text-xs text-chalk-300">
            {adaptiveDailyPlan.actionChecklist.slice(0, recommendationLimit).map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
          {adaptiveDailyPlan.prescribedDrills?.length ? (
            <div className="mt-2 rounded-lg border border-felt-600 bg-felt-800/70 p-2 text-xs text-ivory-200">
              <p className="text-chalk-300">Prescribed drills</p>
              {adaptiveDailyPlan.prescribedDrills.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {showAdvancedPanels ? (
      <Card className="mb-4" title="Smart Session Autofill">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-ivory-100">Fatigue: {smartAutofill.fatigueLevel.toUpperCase()}</span>
          <span className="rounded-full border border-cue-600/60 bg-cue-900/20 px-2 py-1 text-cue-200">Recommended: {smartAutofill.lengthMinutes} min</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-chalk-300">{smartAutofill.rationale}</p>
        {smartAutofill.upcomingEvent ? (
          <p className="mt-2 rounded-lg border border-cue-600/40 bg-cue-900/10 px-2 py-1 text-xs text-cue-300">Event prep signal: {smartAutofill.upcomingEvent.name} in {smartAutofill.upcomingEvent.daysOut} days.</p>
        ) : null}
        <Button className="mt-3 w-full" type="button" variant="secondary" onClick={applySmartAutofill}>
          Apply Smart Autofill
        </Button>
      </Card>
      ) : null}

      {showAdvancedPanels ? (
      <Card className="mb-4" title="Auto Prescribe Today (ROI Engine)">
        <p className="text-sm text-ivory-100">Weakest KPI bucket: {roiPlanner.focusBucket}</p>
        <p className="mt-1 text-xs text-chalk-300">Three-drill prescription to remove guesswork and force transfer.</p>
        <div className="mt-2 space-y-1 text-xs text-ivory-200">
          {roiPlanner.prescription.map((item) => (
            <p key={item.slot}>
              {item.slot.toUpperCase()} · {item.app} · {item.label} ({item.rationale})
            </p>
          ))}
        </div>
        <div className="mt-3 space-y-1 text-xs text-chalk-300">
          {roiPlanner.checklist.slice(0, recommendationLimit).map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </div>
        <Button className="mt-3 w-full" type="button" onClick={applyRoiPrescription}>
          Apply ROI Prescription
        </Button>
      </Card>
      ) : null}

      {showAdvancedPanels ? (
      <Card className="mb-4" title="Advanced Coaching Tools">
        <p className="text-sm text-ivory-100">Weakest two categories: {roiPlanner.weeklyAutoFocus.weakestTwo.join(' · ')}</p>
        <p className="mt-1 text-xs text-chalk-300">Tournament phase: {roiPlanner.tournamentMode.phaseLabel}</p>
        {roiPlanner.tournamentMode.active ? (
          <p className="mt-1 text-xs text-cue-300">{roiPlanner.tournamentMode.eventName} in {roiPlanner.tournamentMode.daysOut} days.</p>
        ) : null}
        <p className="mt-1 text-xs text-ivory-200">{roiPlanner.tournamentMode.emphasis}</p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {roiPlanner.travelTemplates.map((templateOption) => (
            <Button key={templateOption.id} type="button" variant="secondary" onClick={() => applyRoadMode(templateOption.minutes)}>
              {templateOption.label} ({templateOption.minutes}m)
            </Button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-ivory-200 sm:grid-cols-2">
          <p>Prescription Adherence: {roiPlanner.conversion.prescriptionAdherencePct}%</p>
          <p>Target Hit Rate: {roiPlanner.conversion.targetHitRatePct}%</p>
          <p>Improvement Rate: {roiPlanner.conversion.improvementRatePct}%</p>
          <p>Match Transfer Score: {roiPlanner.conversion.matchTransferScore}/100</p>
        </div>

        <div className="mt-3 space-y-1 text-xs text-chalk-300">
          {roiPlanner.coachBrief.slice(0, recommendationLimit).map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={applyWeeklyAutoFocus}>Apply Next-Week Focus</Button>
          <Button type="button" variant="secondary" onClick={injectCoachBriefToNotes}>Add Coach Brief To Notes</Button>
        </div>
      </Card>
      ) : null}

      {recoveryRecommendationPlan ? (
        <Card className="mb-4" title="Recovery Plan (3-Day)">
          <p className="text-sm text-ivory-100">Focus: {recoveryRecommendationPlan.focusKpiName}</p>
          <p className="mt-1 text-xs text-chalk-300">{recoveryRecommendationPlan.rationale}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-ivory-200">Intensity: {recoveryRecommendationPlan.severity.toUpperCase()}</span>
            <span className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-ivory-200">Horizon: {recoveryRecommendationPlan.horizonDays} days</span>
          </div>
          <p className="mt-1 text-xs text-ivory-200">Recommended Focus Area: {recoveryRecommendationPlan.recommendedFocusArea}</p>

          <div className="mt-2 space-y-1 text-xs text-chalk-300">
            {recoveryRecommendationPlan.actions.slice(0, recommendationLimit).map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
          <Button className="mt-3 w-full" type="button" variant="secondary" onClick={applyRecoveryProtocol}>
            Apply Recovery-Day Protocol
          </Button>
        </Card>
      ) : null}

      <Card className="mb-4" title="3. Quick Log">
        <p className="text-xs uppercase tracking-[0.12em] text-cue-300">Log only the essentials</p>
        <p className="mt-2 text-sm text-chalk-300">In ADHD mode, fill these four fields and move on. Everything else stays hidden unless advanced tools are opened.</p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-felt-600/60 bg-felt-800/55 p-3">
            <label className="text-xs uppercase tracking-[0.08em] text-cue-300">1. Focus Area</label>
            <input
              value={focusArea}
              onChange={(event) => {
                setFocusTouched(true);
                setFocusArea(event.target.value);
              }}
              className="mt-2 min-h-11 w-full rounded-2xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </div>
          <div className="rounded-2xl border border-felt-600/60 bg-felt-800/55 p-3">
            <NumberStepperField
              label="2. Length (min)"
              value={lengthMinutes}
              min={0}
              step={5}
              onChange={(next) => {
                setLengthTouched(true);
                setLengthMinutes(next);
              }}
            />
          </div>
          <div className="rounded-2xl border border-felt-600/60 bg-felt-800/55 p-3">
            <NumberStepperField
              label="3. DrillRoom %"
              value={drillRoomShotmakingPct}
              min={0}
              max={100}
              step={1}
              onChange={(next) => setDrillRoomShotmakingPct(clampPct(next))}
            />
          </div>
          <div className="rounded-2xl border border-felt-600/60 bg-felt-800/55 p-3">
            <label className="text-xs uppercase tracking-[0.08em] text-cue-300">4. Ghost Drill</label>
            <select
              value={ghostDrillPlayed}
              onChange={(event) => setGhostDrillPlayed(event.target.value as YesNo)}
              className="mt-2 min-h-11 w-full rounded-2xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <NumberStepperField
              label="Ghost Win %"
              value={ghostDrillWinRatePct}
              min={0}
              max={100}
              step={1}
              onChange={(next) => {
                if (ghostDrillPlayed !== 'Yes') return;
                setGhostDrillWinRatePct(clampPct(next));
              }}
              className={ghostDrillPlayed !== 'Yes' ? 'opacity-60' : ''}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-felt-600/60 bg-felt-800/55 p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Hidden until advanced tools</p>
          <p className="mt-1 text-xs text-chalk-300">Bullseye, WPB details, notes, coach tags, and clips stay out of the way unless you intentionally open them.</p>
        </div>
      </Card>

      <Card className="border-cue-500/25 bg-gradient-to-br from-cue-950/18 via-felt-800/90 to-felt-900/95 p-4 sm:p-5" title="Session Notes & Save">
        {postSessionSummary ? (
          <div className="mb-4 rounded-2xl border border-cue-600/40 bg-cue-950/20 p-4 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.12em] text-cue-300">Post-session summary</p>
            <p className="mt-2 text-2xl font-semibold leading-tight text-ivory-100 sm:text-3xl">{postSessionSummary.title}</p>
            <p className="mt-3 text-sm text-chalk-300">{postSessionSummary.nextStep}</p>
            <p className="mt-2 text-xs text-chalk-300">{postSessionSummary.rationale}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-cue-600/50 bg-cue-900/20 px-2 py-1 text-cue-200">Next mode: {postSessionSummary.nextMode.toUpperCase()}</span>
              <span className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-chalk-200">Close the loop</span>
            </div>
          </div>
        ) : null}
        {showExtraLogFields ? (
          <>
            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-cue-300">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mb-3 min-h-28 w-full rounded-2xl border border-felt-600 bg-felt-800 p-4 text-ivory-100 shadow-[0_10px_20px_rgba(0,0,0,0.12)]"
            />
            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-cue-300">Coach Tags</label>
            <input
              value={coachTagsInput}
              onChange={(event) => setCoachTagsInput(event.target.value)}
              placeholder="break, pressure, safety, rhythm"
              className="mb-3 min-h-11 w-full rounded-2xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-cue-300">Video Clip Refs</label>
            <input
              value={videoClipRefsInput}
              onChange={(event) => setVideoClipRefsInput(event.target.value)}
              placeholder="Clip 12 @ 00:42, https://..."
              className="mb-3 min-h-11 w-full rounded-2xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </>
        ) : (
          <p className="mb-3 rounded-2xl border border-felt-600 bg-felt-800/55 p-3 text-xs text-chalk-300">Notes, coach tags, and video refs are hidden in ADHD mode until advanced tools are enabled.</p>
        )}
        {dataConfidenceNudges.length ? (
          <p className="mb-3 rounded-2xl border border-felt-600 bg-felt-800/55 p-3 text-xs text-chalk-300">
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
