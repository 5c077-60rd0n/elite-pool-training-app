import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useSettingsStore } from '../store/useSettingsStore';
import { useNotifications } from '../hooks/useNotifications';
import { Button } from '../components/ui/Button';
import { useNotificationStore } from '../store/useNotificationStore';
import { useProgressStore } from '../store/useProgressStore';
import { useSessionStore } from '../store/useSessionStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { bullseyeCategorySeed, mechanicsChecklistSeed, milestoneRows, phaseStatuses } from '../data/trackerPlan';
import { eliteLabSeed } from '../data/eliteLab';
import { opponentPrepCardSeed } from '../data/opponentPrepCards';
import { buildCoachReviewExport } from '../utils/coachExport';
import { getTrackerGamificationSnapshot } from '../utils/trackerGamification';
import type { TelemetryEventPayload } from '../utils/telemetry';
import { clearPwaMetrics, getPwaMetricsSnapshot, type PwaMetricsSnapshot } from '../utils/pwaMetrics';

type BackupPayload = {
  version?: string;
  app?: string;
  exportedAt?: string;
  settings?: ReturnType<typeof useSettingsStore.getState>['profile'];
  notifications?: {
    enabled?: boolean;
    reminderTime?: string;
    lastSmartAlertAt?: ReturnType<typeof useNotificationStore.getState>['lastSmartAlertAt'];
    smartAlertHistory?: ReturnType<typeof useNotificationStore.getState>['smartAlertHistory'];
    smartAlertsPausedUntil?: ReturnType<typeof useNotificationStore.getState>['smartAlertsPausedUntil'];
  };
  gamification?: { soundEnabled?: boolean; hapticsEnabled?: boolean };
  tracker?: {
    dailySessionLogs?: ReturnType<typeof useTrackerStore.getState>['dailySessionLogs'];
    weeklySummaries?: ReturnType<typeof useTrackerStore.getState>['weeklySummaries'];
    fargoRatingLog?: ReturnType<typeof useTrackerStore.getState>['fargoRatingLog'];
    bullseyeCategoryTracker?: ReturnType<typeof useTrackerStore.getState>['bullseyeCategoryTracker'];
    milestoneTrackerRows?: ReturnType<typeof useTrackerStore.getState>['milestoneTrackerRows'];
    milestoneVerificationAttempts?: ReturnType<typeof useTrackerStore.getState>['milestoneVerificationAttempts'];
    milestonePhaseStatuses?: ReturnType<typeof useTrackerStore.getState>['milestonePhaseStatuses'];
    mechanicsChecklist?: ReturnType<typeof useTrackerStore.getState>['mechanicsChecklist'];
    mechanicsWeeklyAuditLog?: ReturnType<typeof useTrackerStore.getState>['mechanicsWeeklyAuditLog'];
    competitionLog?: ReturnType<typeof useTrackerStore.getState>['competitionLog'];
    matchSimSessions?: ReturnType<typeof useTrackerStore.getState>['matchSimSessions'];
    opponentPrepCards?: ReturnType<typeof useTrackerStore.getState>['opponentPrepCards'];
    personalRecords?: ReturnType<typeof useTrackerStore.getState>['personalRecords'];
    confidenceIndexHistory?: ReturnType<typeof useTrackerStore.getState>['confidenceIndexHistory'];
    coachExportHistory?: ReturnType<typeof useTrackerStore.getState>['coachExportHistory'];
    seasonMeta?: ReturnType<typeof useTrackerStore.getState>['seasonMeta'];
    seasonChallengeProgress?: ReturnType<typeof useTrackerStore.getState>['seasonChallengeProgress'];
    eliteLab?: ReturnType<typeof useTrackerStore.getState>['eliteLab'];
    adaptiveDailyPlan?: ReturnType<typeof useTrackerStore.getState>['adaptiveDailyPlan'];
    recoveryRecommendationPlan?: ReturnType<typeof useTrackerStore.getState>['recoveryRecommendationPlan'];
    syncState?: ReturnType<typeof useTrackerStore.getState>['syncState'];
  };
  trackerData?: BackupPayload['tracker'];
  legacyCompatibility?: {
    progress?: {
      fargoHistory?: ReturnType<typeof useProgressStore.getState>['fargoHistory'];
      logs?: ReturnType<typeof useProgressStore.getState>['logs'];
      weeklyKpis?: ReturnType<typeof useProgressStore.getState>['weeklyKpis'];
      breakChartEntries?: ReturnType<typeof useProgressStore.getState>['breakChartEntries'];
      tournamentPreps?: ReturnType<typeof useProgressStore.getState>['tournamentPreps'];
      mentalGameLogs?: ReturnType<typeof useProgressStore.getState>['mentalGameLogs'];
    };
    session?: {
      activeDate?: string;
      activeFocus?: string;
      drillResults?: ReturnType<typeof useSessionStore.getState>['drillResults'];
      isComplete?: boolean;
      sessionNotes?: string;
      timerDate?: ReturnType<typeof useSessionStore.getState>['timerDate'];
      timerRunning?: ReturnType<typeof useSessionStore.getState>['timerRunning'];
      timerStartedAt?: ReturnType<typeof useSessionStore.getState>['timerStartedAt'];
      timerAccumulatedSeconds?: ReturnType<typeof useSessionStore.getState>['timerAccumulatedSeconds'];
    };
  };
  progress?: BackupPayload['legacyCompatibility'] extends { progress?: infer T } ? T : never;
  session?: BackupPayload['legacyCompatibility'] extends { session?: infer T } ? T : never;
};

export default function Settings() {
  const profile = useSettingsStore((s) => s.profile);
  const setProfile = useSettingsStore((s) => s.setProfile);
  const { permission, scheduleReminder } = useNotifications();
  const reminderEnabled = useNotificationStore((s) => s.enabled);
  const reminderTime = useNotificationStore((s) => s.reminderTime);
  const setReminderEnabled = useNotificationStore((s) => s.setEnabled);
  const setReminderTime = useNotificationStore((s) => s.setReminderTime);
  const progress = useProgressStore();
  const session = useSessionStore();
  const tracker = useTrackerStore();
  const addCoachExportHistoryEntry = useTrackerStore((s) => s.addCoachExportHistoryEntry);
  const flushSyncQueue = useTrackerStore((s) => s.flushSyncQueue);
  const soundEnabled = useGamificationStore((s) => s.soundEnabled);
  const hapticsEnabled = useGamificationStore((s) => s.hapticsEnabled);
  const setSoundEnabled = useGamificationStore((s) => s.setSoundEnabled);
  const setHapticsEnabled = useGamificationStore((s) => s.setHapticsEnabled);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [devTelemetryEvents, setDevTelemetryEvents] = useState<TelemetryEventPayload[]>([]);
  const [pwaMetrics, setPwaMetrics] = useState<PwaMetricsSnapshot>(() => getPwaMetricsSnapshot());

  useEffect(() => {
    if (typeof window === 'undefined' || !import.meta.env.DEV) return;

    const onTelemetry = (event: Event) => {
      const customEvent = event as CustomEvent<TelemetryEventPayload>;
      if (!customEvent.detail?.event) return;
      setDevTelemetryEvents((prev) => [customEvent.detail, ...prev].slice(0, 20));
    };

    window.addEventListener('elite-telemetry', onTelemetry);
    return () => window.removeEventListener('elite-telemetry', onTelemetry);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshPwaMetrics = () => {
      setPwaMetrics(getPwaMetricsSnapshot());
    };

    const onTelemetry = (event: Event) => {
      const customEvent = event as CustomEvent<TelemetryEventPayload>;
      if (customEvent.detail?.event === 'pwa_metric_recorded' || customEvent.detail?.event === 'pwa_metric_cleared') {
        refreshPwaMetrics();
      }
    };

    window.addEventListener('elite-telemetry', onTelemetry);
    window.addEventListener('focus', refreshPwaMetrics);
    window.addEventListener('storage', refreshPwaMetrics);

    return () => {
      window.removeEventListener('elite-telemetry', onTelemetry);
      window.removeEventListener('focus', refreshPwaMetrics);
      window.removeEventListener('storage', refreshPwaMetrics);
    };
  }, []);

  const trackerSummary = useMemo(
    () => ({
      sessionLogs: tracker.dailySessionLogs.length,
      weeklySummaries: tracker.weeklySummaries.length,
      fargoEntries: tracker.fargoRatingLog.length,
      mechanicsAudits: tracker.mechanicsWeeklyAuditLog.length,
      competitionEntries: tracker.competitionLog.length,
      matchSimSessions: tracker.matchSimSessions.length,
      opponentPrepCards: tracker.opponentPrepCards.length,
      personalRecords: tracker.personalRecords.length,
      confidenceEntries: tracker.confidenceIndexHistory.length,
      coachExports: tracker.coachExportHistory.length,
      pendingSync: tracker.syncState.pendingLogIds.length,
      lastSyncAt: tracker.syncState.lastSyncAt,
    }),
    [tracker],
  );

  function exportData(): void {
    const payload = {
      version: '2.0',
      app: 'elite-pool-training-tracker',
      exportedAt: new Date().toISOString(),
      settings: useSettingsStore.getState().profile,
      notifications: {
        enabled: useNotificationStore.getState().enabled,
        reminderTime: useNotificationStore.getState().reminderTime,
        lastSmartAlertAt: useNotificationStore.getState().lastSmartAlertAt,
        smartAlertHistory: useNotificationStore.getState().smartAlertHistory,
        smartAlertsPausedUntil: useNotificationStore.getState().smartAlertsPausedUntil,
      },
      gamification: {
        soundEnabled: useGamificationStore.getState().soundEnabled,
        hapticsEnabled: useGamificationStore.getState().hapticsEnabled,
      },
      progress: {
        fargoHistory: progress.fargoHistory,
        logs: progress.logs,
        weeklyKpis: progress.weeklyKpis,
        breakChartEntries: progress.breakChartEntries,
        tournamentPreps: progress.tournamentPreps,
        mentalGameLogs: progress.mentalGameLogs,
      },
      tracker: {
        dailySessionLogs: tracker.dailySessionLogs,
        weeklySummaries: tracker.weeklySummaries,
        fargoRatingLog: tracker.fargoRatingLog,
        bullseyeCategoryTracker: tracker.bullseyeCategoryTracker,
        milestoneTrackerRows: tracker.milestoneTrackerRows,
        milestoneVerificationAttempts: tracker.milestoneVerificationAttempts,
        milestonePhaseStatuses: tracker.milestonePhaseStatuses,
        mechanicsChecklist: tracker.mechanicsChecklist,
        mechanicsWeeklyAuditLog: tracker.mechanicsWeeklyAuditLog,
        competitionLog: tracker.competitionLog,
        matchSimSessions: tracker.matchSimSessions,
        opponentPrepCards: tracker.opponentPrepCards,
        personalRecords: tracker.personalRecords,
        confidenceIndexHistory: tracker.confidenceIndexHistory,
        coachExportHistory: tracker.coachExportHistory,
        seasonMeta: tracker.seasonMeta,
        seasonChallengeProgress: tracker.seasonChallengeProgress,
        eliteLab: tracker.eliteLab,
        adaptiveDailyPlan: tracker.adaptiveDailyPlan,
        recoveryRecommendationPlan: tracker.recoveryRecommendationPlan,
        syncState: tracker.syncState,
      },
      legacyCompatibility: {
        progress: {
          fargoHistory: progress.fargoHistory,
          logs: progress.logs,
          weeklyKpis: progress.weeklyKpis,
          breakChartEntries: progress.breakChartEntries,
          tournamentPreps: progress.tournamentPreps,
          mentalGameLogs: progress.mentalGameLogs,
        },
        session: {
          activeDate: session.activeDate,
          activeFocus: session.activeFocus,
          drillResults: session.drillResults,
          isComplete: session.isComplete,
          sessionNotes: session.sessionNotes,
          timerDate: session.timerDate,
          timerRunning: session.timerRunning,
          timerStartedAt: session.timerStartedAt,
          timerAccumulatedSeconds: session.timerAccumulatedSeconds,
        },
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `elite-pool-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Backup exported.');
  }

  async function importData(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;
      const trackerData = parsed.trackerData ?? parsed.tracker;
      const legacyProgress = parsed.legacyCompatibility?.progress ?? parsed.progress;
      const legacySession = parsed.legacyCompatibility?.session ?? parsed.session;

      if (parsed.settings) {
        useSettingsStore.setState((state) => ({ profile: { ...state.profile, ...parsed.settings } }));
      }
      if (parsed.notifications) {
        useNotificationStore.setState((state) => ({
          ...state,
          enabled: parsed.notifications?.enabled ?? state.enabled,
          reminderTime: parsed.notifications?.reminderTime ?? state.reminderTime,
          lastSmartAlertAt: parsed.notifications?.lastSmartAlertAt ?? state.lastSmartAlertAt,
          smartAlertHistory: parsed.notifications?.smartAlertHistory ?? state.smartAlertHistory,
          smartAlertsPausedUntil: parsed.notifications?.smartAlertsPausedUntil ?? state.smartAlertsPausedUntil,
        }));
      }
      if (parsed.gamification) {
        useGamificationStore.setState((state) => ({
          ...state,
          soundEnabled: parsed.gamification?.soundEnabled ?? state.soundEnabled,
          hapticsEnabled: parsed.gamification?.hapticsEnabled ?? state.hapticsEnabled,
        }));
      }
      if (legacyProgress) {
        useProgressStore.setState((state) => ({
          ...state,
          fargoHistory: legacyProgress.fargoHistory ?? state.fargoHistory,
          logs: legacyProgress.logs ?? state.logs,
          weeklyKpis: legacyProgress.weeklyKpis ?? state.weeklyKpis,
          breakChartEntries: legacyProgress.breakChartEntries ?? state.breakChartEntries,
          tournamentPreps: legacyProgress.tournamentPreps ?? state.tournamentPreps,
          mentalGameLogs: legacyProgress.mentalGameLogs ?? state.mentalGameLogs,
        }));
      }
      if (trackerData) {
        useTrackerStore.setState((state) => ({
          ...state,
          dailySessionLogs: trackerData.dailySessionLogs ?? state.dailySessionLogs,
          weeklySummaries: trackerData.weeklySummaries ?? state.weeklySummaries,
          fargoRatingLog: trackerData.fargoRatingLog ?? state.fargoRatingLog,
          bullseyeCategoryTracker: trackerData.bullseyeCategoryTracker ?? state.bullseyeCategoryTracker,
          milestoneTrackerRows: trackerData.milestoneTrackerRows ?? state.milestoneTrackerRows,
          milestoneVerificationAttempts:
            trackerData.milestoneVerificationAttempts ?? state.milestoneVerificationAttempts,
          milestonePhaseStatuses: trackerData.milestonePhaseStatuses ?? state.milestonePhaseStatuses,
          mechanicsChecklist: trackerData.mechanicsChecklist ?? state.mechanicsChecklist,
          mechanicsWeeklyAuditLog: trackerData.mechanicsWeeklyAuditLog ?? state.mechanicsWeeklyAuditLog,
          competitionLog: trackerData.competitionLog ?? state.competitionLog,
          matchSimSessions: trackerData.matchSimSessions ?? state.matchSimSessions,
          opponentPrepCards: trackerData.opponentPrepCards ?? state.opponentPrepCards,
          personalRecords: trackerData.personalRecords ?? state.personalRecords,
          confidenceIndexHistory: trackerData.confidenceIndexHistory ?? state.confidenceIndexHistory,
          coachExportHistory: trackerData.coachExportHistory ?? state.coachExportHistory,
          seasonMeta: trackerData.seasonMeta ?? state.seasonMeta,
          seasonChallengeProgress: trackerData.seasonChallengeProgress ?? state.seasonChallengeProgress,
          eliteLab: trackerData.eliteLab ?? state.eliteLab,
          adaptiveDailyPlan: trackerData.adaptiveDailyPlan ?? state.adaptiveDailyPlan,
          recoveryRecommendationPlan: trackerData.recoveryRecommendationPlan ?? state.recoveryRecommendationPlan,
          syncState: trackerData.syncState ?? state.syncState,
        }));
      }
      if (legacySession) {
        useSessionStore.setState((state) => ({
          ...state,
          activeDate: legacySession.activeDate ?? state.activeDate,
          activeFocus: legacySession.activeFocus ?? state.activeFocus,
          drillResults: legacySession.drillResults ?? state.drillResults,
          isComplete: legacySession.isComplete ?? state.isComplete,
          sessionNotes: legacySession.sessionNotes ?? state.sessionNotes,
          timerDate: legacySession.timerDate ?? state.timerDate,
          timerRunning: legacySession.timerRunning ?? state.timerRunning,
          timerStartedAt: legacySession.timerStartedAt ?? state.timerStartedAt,
          timerAccumulatedSeconds: legacySession.timerAccumulatedSeconds ?? state.timerAccumulatedSeconds,
        }));
      }

      setStatus('Backup imported.');
    } catch {
      setStatus('Import failed. Invalid backup file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function syncNow(): void {
    const before = useTrackerStore.getState().syncState;
    const wasOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    flushSyncQueue();

    // Ensure stale conflict badges do not linger in the UI after manual sync.
    useTrackerStore.setState((state) => ({
      ...state,
      syncState: {
        ...state.syncState,
        conflicts: [],
      },
    }));

    const after = useTrackerStore.getState().syncState;
    setStatus(
      `Sync refreshed. Pending ${before.pendingLogIds.length} -> ${after.pendingLogIds.length}.${
        wasOnline ? '' : ' Offline mode detected; queued entries stay local until online.'
      }`,
    );
  }

  async function copyTelemetryEvent(item: TelemetryEventPayload): Promise<void> {
    const payload = JSON.stringify(item, null, 2);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        setStatus(`Telemetry event copied: ${item.event}`);
        return;
      }
    } catch {
      // Fall back to prompt copy.
    }
    window.prompt('Copy telemetry JSON', payload);
  }

  function exportCoachReview(): void {
    const payload = buildCoachReviewExport({
      athlete: {
        name: profile.name,
        currentFargoRating: profile.currentFargoRating,
        targetFargoRating: profile.targetFargoRating,
        currentWeek: profile.currentWeek,
      },
      logs: tracker.dailySessionLogs,
      weeklySummaries: tracker.weeklySummaries,
      competitionLog: tracker.competitionLog,
      confidenceIndexHistory: tracker.confidenceIndexHistory,
      personalRecords: tracker.personalRecords,
    });

    const stamp = payload.generatedAt.slice(0, 10);
    const fileName = `coach-review-${stamp}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    addCoachExportHistoryEntry({
      id: `coach-export-${Date.now()}`,
      generatedAt: payload.generatedAt,
      fileName,
      payload,
    });
    setStatus('Coach review export generated.');
  }

  function resetAllData(): void {
    const confirmed = window.confirm('Reset all tracker data and settings on this device? This cannot be undone.');
    if (!confirmed) return;

    useSettingsStore.setState((state) => ({ profile: { ...state.profile, onboardingComplete: false, currentWeek: 1, currentPhase: 1 } }));
    useNotificationStore.setState((state) => ({
      ...state,
      enabled: false,
      reminderTime: '19:00',
      lastSmartAlertAt: {},
      smartAlertHistory: [],
      smartAlertsPausedUntil: undefined,
    }));
    useGamificationStore.setState((state) => ({ ...state, soundEnabled: true, hapticsEnabled: true }));
    useProgressStore.setState((state) => ({
      ...state,
      fargoHistory: [],
      logs: [],
      weeklyKpis: [],
      breakChartEntries: [],
      tournamentPreps: [],
      mentalGameLogs: [],
    }));
    const emptySeason = getTrackerGamificationSnapshot([]);
    useTrackerStore.setState((state) => ({
      ...state,
      dailySessionLogs: [],
      weeklySummaries: [],
      fargoRatingLog: [],
      bullseyeCategoryTracker: bullseyeCategorySeed,
      milestoneTrackerRows: milestoneRows,
      milestoneVerificationAttempts: [],
      milestonePhaseStatuses: phaseStatuses,
      mechanicsChecklist: mechanicsChecklistSeed,
      mechanicsWeeklyAuditLog: [],
      competitionLog: [],
      matchSimSessions: [],
      opponentPrepCards: opponentPrepCardSeed,
      personalRecords: [],
      confidenceIndexHistory: [],
      coachExportHistory: [],
      seasonMeta: emptySeason.seasonMeta,
      seasonChallengeProgress: emptySeason.seasonChallenges,
      eliteLab: eliteLabSeed,
      adaptiveDailyPlan: null,
      recoveryRecommendationPlan: null,
      syncState: { pendingLogIds: [], lastSyncAt: undefined },
    }));
    useSessionStore.setState((state) => ({
      ...state,
      activeDate: new Date().toISOString().slice(0, 10),
      activeFocus: 'Stroke & Mechanics',
      drillResults: [],
      isComplete: false,
      sessionNotes: '',
      timerDate: new Date().toISOString().slice(0, 10),
      timerRunning: false,
      timerStartedAt: undefined,
      timerAccumulatedSeconds: 0,
    }));
    setStatus('Tracker data reset.');
  }

  return (
    <PageWrapper title="Settings">
      <Card className="mb-4" title="Player Profile">
        <label className="mb-2 block text-sm text-chalk-300">Name</label>
        <input
          value={profile.name}
          onChange={(event) => setProfile({ name: event.target.value })}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <label className="mb-2 mt-3 block text-sm text-chalk-300">Current Fargo Rating</label>
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={400}
          max={900}
          value={profile.currentFargoRating}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) return;
            setProfile({ currentFargoRating: Number(raw) });
          }}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Target Fargo Rating</label>
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={400}
          max={900}
          value={profile.targetFargoRating}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) return;
            setProfile({ targetFargoRating: Number(raw) });
          }}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Last Official Fargo Rating</label>
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={200}
          max={850}
          value={profile.lastOfficialFargoRating ?? ''}
          onChange={(event) => {
            const raw = event.target.value.trim();
            setProfile({ lastOfficialFargoRating: raw ? Number(raw) : undefined });
          }}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Last Official Fargo Date</label>
        <input
          type="date"
          value={profile.lastOfficialFargoDate ?? ''}
          onChange={(event) => setProfile({ lastOfficialFargoDate: event.target.value })}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Historical Peak Fargo Rating</label>
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={200}
          max={850}
          value={profile.historicalPeakFargoRating ?? ''}
          onChange={(event) => {
            const raw = event.target.value.trim();
            setProfile({ historicalPeakFargoRating: raw ? Number(raw) : undefined });
          }}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Years Away From Competition</label>
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={0}
          max={40}
          value={profile.yearsAwayFromCompetition ?? ''}
          onChange={(event) => {
            const raw = event.target.value.trim();
            setProfile({ yearsAwayFromCompetition: raw ? Number(raw) : undefined });
          }}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
      </Card>

      <Card className="mb-4" title="Training Preferences">
        <label className="mb-2 block text-sm text-chalk-300">Program Start Date</label>
        <input
          type="date"
          value={profile.programStartDate}
          onChange={(event) => setProfile({ programStartDate: event.target.value })}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Current Week</label>
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={1}
          max={52}
          value={profile.currentWeek}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) return;
            const next = Math.max(1, Math.min(52, Number(raw)));
            setProfile({ currentWeek: next });
          }}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Preferred Break Game</label>
        <select
          value={profile.preferredBreakGame}
          onChange={(event) =>
            setProfile({ preferredBreakGame: event.target.value as typeof profile.preferredBreakGame })
          }
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        >
          <option value="9-ball">9-ball</option>
          <option value="10-ball">10-ball</option>
          <option value="8-ball">8-ball</option>
        </select>

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Table Size</label>
        <select
          value={profile.tableSize}
          onChange={(event) => setProfile({ tableSize: event.target.value as typeof profile.tableSize })}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        >
          <option value="7ft">7ft</option>
          <option value="8ft">8ft</option>
          <option value="9ft">9ft</option>
        </select>

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Dominant Hand</label>
        <select
          value={profile.dominantHand}
          onChange={(event) => setProfile({ dominantHand: event.target.value as typeof profile.dominantHand })}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        >
          <option value="right">Right</option>
          <option value="left">Left</option>
        </select>

        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm text-ivory-200">
          <input
            type="checkbox"
            checked={Boolean(profile.adhdModeEnabled)}
            onChange={(event) => setProfile({ adhdModeEnabled: event.target.checked })}
            className="h-4 w-4"
          />
          ADHD focus mode (simplified daily flow and auto recovery)
        </label>
      </Card>

      <Card title="Notifications & Reminders">
        <p className="mb-3 text-ivory-200">Permission status: {permission}</p>
        <div className="mb-3 flex items-center gap-2 text-sm text-ivory-200">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(event) => {
              setReminderEnabled(event.target.checked);
              setProfile({ reminderEnabled: event.target.checked });
            }}
            className="h-4 w-4"
          />
          Daily reminder enabled
        </div>
        <input
          type="time"
          value={reminderTime}
          onChange={(event) => {
            setReminderTime(event.target.value);
            setProfile({ dailyReminderTime: event.target.value });
          }}
          className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <Button onClick={() => void scheduleReminder()}>Enable Notifications</Button>
      </Card>

      <Card className="mt-4" title="Gamification Effects">
        <p className="mb-3 text-sm text-chalk-300">Control reward sounds and haptic feedback for XP and quest unlocks.</p>
        <label className="mb-2 flex min-h-11 items-center gap-2 text-sm text-ivory-200">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(event) => setSoundEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          Reward sound cues
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-ivory-200">
          <input
            type="checkbox"
            checked={hapticsEnabled}
            onChange={(event) => setHapticsEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          Haptic feedback
        </label>
      </Card>

      <Card className="mt-4" title="Data & Backup">
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-ivory-200 sm:grid-cols-3">
          <p>Session Logs: {trackerSummary.sessionLogs}</p>
          <p>Weekly Summaries: {trackerSummary.weeklySummaries}</p>
          <p>Fargo Entries: {trackerSummary.fargoEntries}</p>
          <p>Mechanics Audits: {trackerSummary.mechanicsAudits}</p>
          <p>Competition Logs: {trackerSummary.competitionEntries}</p>
          <p>Coach Exports: {trackerSummary.coachExports}</p>
          <p>Pending Sync: {trackerSummary.pendingSync}</p>
        </div>
        <p className="mb-3 text-xs text-chalk-300">
          Last Sync: {trackerSummary.lastSyncAt ? new Date(trackerSummary.lastSyncAt).toLocaleString() : 'Not synced yet'}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={exportData}>Export Backup</Button>
          <Button onClick={exportCoachReview}>Export Coach Review</Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Import Backup</Button>
          <Button variant="secondary" onClick={syncNow}>Sync Queue Now</Button>
          <Button variant="secondary" onClick={resetAllData}>Reset All Local Data</Button>
        </div>
        {tracker.coachExportHistory.length ? (
          <div className="mt-3 space-y-1 rounded-lg border border-felt-600 bg-felt-800/60 p-2 text-xs text-chalk-300">
            {tracker.coachExportHistory.slice(0, 3).map((entry) => (
              <p key={entry.id}>{entry.fileName} · {new Date(entry.generatedAt).toLocaleString()}</p>
            ))}
          </div>
        ) : null}
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(event) => void importData(event)} />
        {status ? <p className="mt-3 text-sm text-chalk-300">{status}</p> : null}
      </Card>

      <Card className="mt-4" title="PWA Install & Update Health">
        <div className="grid grid-cols-2 gap-2 text-sm text-ivory-200 sm:grid-cols-3">
          <p>Install Prompts: {pwaMetrics.installPromptShown}</p>
          <p>Installs Accepted: {pwaMetrics.installAccepted}</p>
          <p>Install Dismissed: {pwaMetrics.installDismissed}</p>
          <p>Update Prompts: {pwaMetrics.updatePromptShown}</p>
          <p>Updates Applied: {pwaMetrics.updateApplied}</p>
          <p>Updates Deferred: {pwaMetrics.updateDeferred}</p>
          <p>Offline Ready Notices: {pwaMetrics.offlineReadyShown}</p>
          <p>iOS Tips Shown: {pwaMetrics.iosInstallTipShown}</p>
          <p>iOS Tips Dismissed: {pwaMetrics.iosInstallTipDismissed}</p>
        </div>
        <div className="mt-3 rounded-lg border border-felt-600 bg-felt-800/60 p-3 text-sm text-chalk-200">
          <p>Install acceptance: {pwaMetrics.installAcceptanceRatePct}%</p>
          <p>Update adoption: {pwaMetrics.updateAdoptionRatePct}%</p>
          <p>Last PWA event: {pwaMetrics.lastEventAt ? new Date(pwaMetrics.lastEventAt).toLocaleString() : 'No events yet'}</p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setPwaMetrics(getPwaMetricsSnapshot())}>Refresh PWA Metrics</Button>
          <Button
            variant="secondary"
            onClick={() => {
              clearPwaMetrics();
              setPwaMetrics(getPwaMetricsSnapshot());
              setStatus('PWA metrics reset.');
            }}
          >
            Reset PWA Metrics
          </Button>
        </div>
      </Card>

      {import.meta.env.DEV ? (
        <Card className="mt-4" title="Developer Telemetry Inspector">
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-xs text-chalk-300">Listening for elite-telemetry custom events (latest 20).</p>
            <button
              type="button"
              onClick={() => {
                setDevTelemetryEvents([]);
                setStatus('Telemetry events cleared.');
              }}
              className="rounded border border-felt-600 px-2 py-1 text-[11px] text-chalk-300 hover:bg-felt-800"
            >
              Clear Events
            </button>
          </div>
          {devTelemetryEvents.length ? (
            <div className="space-y-2 rounded-lg border border-felt-600 bg-felt-800/60 p-2">
              {devTelemetryEvents.map((item, index) => (
                <div key={`${item.at}-${item.event}-${index}`} className="rounded border border-felt-700 bg-felt-900/40 p-2 text-xs text-ivory-100">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-cue-300">{item.event}</p>
                    <button
                      type="button"
                      onClick={() => void copyTelemetryEvent(item)}
                      className="rounded border border-felt-600 px-2 py-1 text-[11px] text-chalk-300 hover:bg-felt-800"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <p className="text-chalk-300">{new Date(item.at).toLocaleString()}</p>
                  {item.context ? (
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-ivory-200">{JSON.stringify(item.context, null, 2)}</pre>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-chalk-300">No telemetry events captured yet in this session.</p>
          )}
        </Card>
      ) : null}
    </PageWrapper>
  );
}
