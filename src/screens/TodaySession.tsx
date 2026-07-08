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
  wpbCategoryOptions,
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
import type { BullseyeCategory, DailySessionLog, WpbCategory, WpbRatingTier, YesNo } from '../types/tracker';

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
  const [bullseyeCategory, setBullseyeCategory] = useState<BullseyeCategory>('Mixed');
  const [wpbLesson, setWpbLesson] = useState<YesNo>('No');
  const [wpbCategory, setWpbCategory] = useState<WpbCategory>('Fundamentals');
  const [wpbModuleName, setWpbModuleName] = useState('');
  const [wpbTierAchieved, setWpbTierAchieved] = useState<WpbRatingTier | ''>('');
  const [wpbKeyTakeaway, setWpbKeyTakeaway] = useState('');
  const [ghostDrillPlayed, setGhostDrillPlayed] = useState<YesNo>('Yes');
  const [ghostDrillWinRatePct, setGhostDrillWinRatePct] = useState(50);
  const [notes, setNotes] = useState('');
  const [coachTagsInput, setCoachTagsInput] = useState('');
  const [videoClipRefsInput, setVideoClipRefsInput] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [celebration, setCelebration] = useState<{ title: string; subtitle: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [focusTouched, setFocusTouched] = useState(false);
  const [lengthTouched, setLengthTouched] = useState(false);
  const [showAdvancedPanels, setShowAdvancedPanels] = useState(false);
  const [adhdSessionModeOverride, setAdhdSessionModeOverride] = useState<AdhdSessionMode | null>(null);
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

  const wpbTierOptions = useMemo(
    () => getWpbTierOptionsForCategory(wpbCategory),
    [wpbCategory],
  );

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
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    breakAnnouncementSentRef.current = false;
    returnAnnouncementSentRef.current = false;
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
  const adhdSecondBlockStartSeconds = (activeAdhdPreset.workBlockMinutes + activeAdhdPreset.breakMinutes) * 60;
  const adhdStopCheckpointSeconds =
    (activeAdhdPreset.workBlockMinutes + activeAdhdPreset.breakMinutes + activeAdhdPreset.optionalSecondBlockMinutes) * 60;
  const adhdBreakDue = adhdModeEnabled
    && liveElapsedSeconds >= adhdBreakStartSeconds
    && liveElapsedSeconds < adhdSecondBlockStartSeconds;
  const adhdStopRuleDue = adhdModeEnabled
    && activeAdhdPreset.optionalSecondBlockMinutes > 0
    && liveElapsedSeconds >= adhdStopCheckpointSeconds;

  useEffect(() => {
    if (!adhdModeEnabled || !timerRunning || soundEnabled === false) return;

    if (!breakAnnouncementSentRef.current && liveElapsedSeconds >= adhdBreakStartSeconds) {
      breakAnnouncementSentRef.current = true;
      speakAnnouncement(
        `Break time. Reset for ${activeAdhdPreset.breakMinutes} minutes. Keep it simple and avoid extra analysis.`,
      );
      return;
    }

    if (!returnAnnouncementSentRef.current && liveElapsedSeconds >= adhdSecondBlockStartSeconds) {
      returnAnnouncementSentRef.current = true;
      speakAnnouncement(
        `Return to the table. Quick readiness check. If focus is below six out of ten, stop and save. If focus feels steady, continue.`,
      );
    }
  }, [
    activeAdhdPreset.breakMinutes,
    adhdBreakStartSeconds,
    adhdModeEnabled,
    adhdSecondBlockStartSeconds,
    liveElapsedSeconds,
    soundEnabled,
    timerRunning,
  ]);

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

  function applyFullTriadFlow(): void {
    setFocusTouched(true);
    setLengthTouched(true);
    setFocusArea(`3-App Daily Flow: ${roiPlanner.focusBucket}`);
    setLengthMinutes(Math.max(1, roiPlanner.dailyTriadFlow.totalMinutes));

    const drillRoomBlock = roiPlanner.dailyTriadFlow.blocks.find((block) => block.app === 'DrillRoom');
    if (drillRoomBlock) {
      const parts = drillRoomBlock.label.split('>').map((item) => item.trim());
      setDrillRoomDrillName(parts[parts.length - 1] ?? drillRoomBlock.label);
    }

    const bullseyeBlock = roiPlanner.dailyTriadFlow.blocks.find((block) => block.app === 'Bullseye');
    if (bullseyeBlock) {
      const parts = bullseyeBlock.label.split('>').map((item) => item.trim());
      const suggestedCategory = parts[0] as BullseyeCategory;
      if (bullseyeCategoryOptions.includes(suggestedCategory)) {
        setBullseyeCategory(suggestedCategory);
      }
      setBullseyeProximity((prev) => (prev > 0 ? prev : Math.max(0, adaptiveDailyPlan?.targetMetrics.bullseyeProximity ?? 3)));
    }

    const wpbBlock = roiPlanner.dailyTriadFlow.blocks.find((block) => block.app === 'WPB');
    if (wpbBlock) {
      setWpbLesson('Yes');
      setWpbModuleName(wpbBlock.label);
      const nextTiers = getWpbTierOptionsForCategory(wpbCategory);
      setWpbTierAchieved(nextTiers[0] ?? '');
    }

    setNotes((prev) => {
      const prefix = prev ? `${prev}\n` : '';
      return `${prefix}3-App Flow: ${roiPlanner.dailyTriadFlow.executionOrder.join(' | ')}`;
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

  function applyLastSession(): void {
    if (!lastLoggedSession) return;
    setFocusTouched(true);
    setLengthTouched(true);
    setFocusArea(lastLoggedSession.focusArea);
    setLengthMinutes(Math.max(0, lastLoggedSession.lengthMinutes));
    setDrillRoomShotmakingPct(clampPct(lastLoggedSession.drillRoomShotmakingPct));
    setDrillRoomDrillName(lastLoggedSession.drillRoomDrillName ?? '');
    setBullseyeProximity(Math.max(0, lastLoggedSession.bullseyeProximity));
    setBullseyeCategory(lastLoggedSession.bullseyeCategory);
    setWpbLesson(lastLoggedSession.wpbLesson);
    setWpbCategory(lastLoggedSession.wpbCategory ?? 'Fundamentals');
    setWpbModuleName(lastLoggedSession.wpbModuleName);
    setWpbTierAchieved(lastLoggedSession.wpbTierAchieved ?? '');
    setWpbKeyTakeaway(lastLoggedSession.wpbKeyTakeaway ?? '');
    setGhostDrillPlayed(lastLoggedSession.ghostDrillPlayed ?? 'Yes');
    setGhostDrillWinRatePct(lastLoggedSession.ghostDrillWinRatePct ?? 50);
    setNotes(lastLoggedSession.notes);
    setCoachTagsInput((lastLoggedSession.coachTags ?? []).join(', '));
    setVideoClipRefsInput((lastLoggedSession.videoClipRefs ?? []).join(', '));
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

      <Card className="mb-4" title="Today's Game Plan">
        <p className="text-sm text-chalk-300">{today} · Week {currentWeek} · {day}</p>
        {adhdModeEnabled ? (
          <p className="mt-1 text-xs text-cue-300">ADHD mode active · {effectiveAdhdSessionMode.toUpperCase()} session</p>
        ) : null}
        {adhdModeEnabled ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(['quick', 'standard', 'recovery'] as AdhdSessionMode[]).map((mode) => {
              const isActive = effectiveAdhdSessionMode === mode;
              return (
                <Button
                  key={mode}
                  type="button"
                  variant={isActive ? 'primary' : 'secondary'}
                  onClick={() => applyAdhdModePreset(mode, 'manual_override', true)}
                >
                  {mode[0].toUpperCase() + mode.slice(1)}
                </Button>
              );
            })}
          </div>
        ) : null}
        <p className="mt-1 text-lg text-ivory-100">{focusArea || template.focusArea}</p>
        <p className="mt-1 text-sm text-ivory-200">{template.sessionLengthLabel} · Start with one full DrillRoom + Bullseye + WPB cycle.</p>
        {adhdModeEnabled ? (
          <p className="mt-2 rounded-xl border border-cue-700/50 bg-cue-950/20 px-3 py-2 text-xs text-cue-200">
            ADHD protocol: {activeAdhdPreset.workBlockMinutes}m focus + {activeAdhdPreset.breakMinutes}m reset
            {activeAdhdPreset.optionalSecondBlockMinutes > 0 ? ` + optional ${activeAdhdPreset.optionalSecondBlockMinutes}m second block` : ''}. {activeAdhdPreset.stopRule}
          </p>
        ) : null}
        <div className="mt-3 rounded-xl border border-felt-600 bg-felt-800/50 p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-cue-300">1. Set the day</p>
          <p className="mt-1 text-xs text-chalk-300">Apply the default 3-app plan. Only open advanced tools if you actually need them.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="button" onClick={applyFullTriadFlow}>Apply Full 3-App Day</Button>
            <Button type="button" variant="secondary" onClick={() => setShowAdvancedPanels((prev) => !prev)}>
              {showAdvancedPanels ? 'Hide Advanced Tools' : 'Show Advanced Tools'}
            </Button>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-felt-600 bg-felt-800/50 p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Today's 3-App Sequence</p>
          <div className="mt-2 space-y-1 text-xs text-ivory-200">
            {roiPlanner.dailyTriadFlow.blocks.map((block) => (
              <p key={block.app}>{block.app} · {block.minutes}m · {block.label}</p>
            ))}
          </div>
          <div className="mt-2 space-y-1 text-xs text-chalk-300">
            {roiPlanner.dailyTriadFlow.executionOrder.slice(0, recommendationLimit).map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
        </div>
      </Card>

      {adhdModeEnabled ? (
        <Card className="mb-4" title="Session Protocol">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-felt-600 bg-felt-800/60 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Block 1</p>
              <p className="mt-1 text-ivory-100">{activeAdhdPreset.workBlockMinutes} minutes of focused work.</p>
            </div>
            <div className="rounded-lg border border-felt-600 bg-felt-800/60 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Break</p>
              <p className="mt-1 text-ivory-100">{activeAdhdPreset.breakMinutes} minutes off the table.</p>
            </div>
            <div className="rounded-lg border border-felt-600 bg-felt-800/60 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Optional Block 2</p>
              <p className="mt-1 text-ivory-100">
                {activeAdhdPreset.optionalSecondBlockMinutes > 0
                  ? `${activeAdhdPreset.optionalSecondBlockMinutes} minutes if focus is still clean.`
                  : 'Skip this mode and save the win.'}
              </p>
            </div>
            <div className="rounded-lg border border-felt-600 bg-felt-800/60 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-cue-300">Stop Rule</p>
              <p className="mt-1 text-ivory-100">{activeAdhdPreset.stopRule}</p>
            </div>
            <p className="text-xs text-chalk-300">Audio cues will announce the break and the return/readiness check if sound is enabled.</p>
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
            <Button variant="secondary" onClick={resumeTimer}>{primaryTimerActionLabel}</Button>
          ) : null}
          <Button variant="secondary" onClick={handleTimerEndAndApply} disabled={liveElapsedSeconds === 0}>End & Apply</Button>
          <Button variant="secondary" onClick={resetTimer} disabled={timerRunning || liveElapsedSeconds === 0}>Reset</Button>
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
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={applyLastSession} disabled={!lastLoggedSession}>
            Copy Last Session
          </Button>
          {showAdvancedPanels ? (
            <Button type="button" variant="secondary" onClick={applyAdaptiveTargets} disabled={!adaptiveDailyPlan}>
              Use Adaptive Targets
            </Button>
          ) : null}
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
        <label className="mt-3 block text-sm text-chalk-300">
          DrillRoom Drill Name
          {showExtraLogFields ? (
            <>
              <input
                value={drillRoomDrillName}
                onChange={(event) => setDrillRoomDrillName(event.target.value)}
                list="drillroom-drill-suggestions"
                placeholder="Shotmaking > Straight Shot Level II"
                className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
              />
              <datalist id="drillroom-drill-suggestions">
                {drillRoomDrillSuggestions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </>
          ) : (
            <p className="mt-1 text-xs text-chalk-300">Hidden in ADHD mode. Use Show Advanced Tools to edit.</p>
          )}
        </label>

        <p className="mt-3 text-xs text-chalk-300">
          Safety and line-up values are auto-derived from your daily flow targets. Ghost drill play and win rate are logged explicitly below.
        </p>

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
              {bullseyeCategoryOptions.map((option) => (
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
            WPB Category
            <select
              value={wpbCategory}
              onChange={(event) => {
                const nextCategory = event.target.value as WpbCategory;
                setWpbCategory(nextCategory);
                const nextTiers = getWpbTierOptionsForCategory(nextCategory);
                setWpbTierAchieved((prev) => (nextTiers.includes(prev as WpbRatingTier) ? prev : (nextTiers[0] ?? '')));
              }}
              disabled={wpbLesson !== 'Yes'}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100 disabled:opacity-60"
            >
              {wpbCategoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-sm text-chalk-300">
            Play the Ghost Drill?
            <select
              value={ghostDrillPlayed}
              onChange={(event) => setGhostDrillPlayed(event.target.value as YesNo)}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>
          <NumberStepperField
            label="Ghost Win Rate %"
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

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-sm text-chalk-300">
            WPB Module Name
            <input
              value={wpbModuleName}
              onChange={(event) => {
                const nextModule = event.target.value;
                setWpbModuleName(nextModule);
                const nextTiers = getWpbTierOptionsForCategory(wpbCategory);
                setWpbTierAchieved((prev) => (nextTiers.includes(prev as WpbRatingTier) ? prev : (nextTiers[0] ?? '')));
              }}
              list="wpb-module-suggestions"
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
            <datalist id="wpb-module-suggestions">
              {wpbModuleSuggestions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
        </div>
        <label className="mt-3 block text-sm text-chalk-300">
          WPB Tier Achieved
          <select
            value={wpbTierAchieved}
            onChange={(event) => setWpbTierAchieved(event.target.value as WpbRatingTier | '')}
            disabled={wpbLesson !== 'Yes'}
            className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100 disabled:opacity-60"
          >
            <option value="">Select Tier</option>
            {wpbTierOptions.map((tier) => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-chalk-300">Tier options are based on WPB category (not individual drill).</p>
        </label>
        <label className="mt-3 block text-sm text-chalk-300">
          WPB Key Takeaway
          {showExtraLogFields ? (
            <input
              value={wpbKeyTakeaway}
              onChange={(event) => setWpbKeyTakeaway(event.target.value)}
              placeholder="One usable idea from today's WPB work"
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          ) : (
            <p className="mt-1 text-xs text-chalk-300">Hidden in ADHD mode. Use Show Advanced Tools to edit.</p>
          )}
        </label>
      </Card>

      <Card title="Session Notes & Save">
        {showExtraLogFields ? (
          <>
            <label className="mb-2 block text-sm text-chalk-300">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mb-3 min-h-24 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
            />
            <label className="mb-2 block text-sm text-chalk-300">Coach Tags (comma separated)</label>
            <input
              value={coachTagsInput}
              onChange={(event) => setCoachTagsInput(event.target.value)}
              placeholder="break, pressure, safety, rhythm"
              className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
            <label className="mb-2 block text-sm text-chalk-300">Video Clip Refs (comma separated links or labels)</label>
            <input
              value={videoClipRefsInput}
              onChange={(event) => setVideoClipRefsInput(event.target.value)}
              placeholder="Clip 12 @ 00:42, https://..."
              className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </>
        ) : (
          <p className="mb-3 text-xs text-chalk-300">Notes, coach tags, and video refs are hidden in ADHD mode until advanced tools are enabled.</p>
        )}
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
