import { useRef, useState, type ChangeEvent } from 'react';
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
  const soundEnabled = useGamificationStore((s) => s.soundEnabled);
  const hapticsEnabled = useGamificationStore((s) => s.hapticsEnabled);
  const setSoundEnabled = useGamificationStore((s) => s.setSoundEnabled);
  const setHapticsEnabled = useGamificationStore((s) => s.setHapticsEnabled);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

  function exportData(): void {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: useSettingsStore.getState().profile,
      notifications: {
        enabled: useNotificationStore.getState().enabled,
        reminderTime: useNotificationStore.getState().reminderTime,
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
      },
      tracker: {
        dailySessionLogs: tracker.dailySessionLogs,
        weeklySummaries: tracker.weeklySummaries,
        fargoRatingLog: tracker.fargoRatingLog,
        bullseyeCategoryTracker: tracker.bullseyeCategoryTracker,
        milestoneTrackerRows: tracker.milestoneTrackerRows,
        milestonePhaseStatuses: tracker.milestonePhaseStatuses,
        mechanicsChecklist: tracker.mechanicsChecklist,
        mechanicsWeeklyAuditLog: tracker.mechanicsWeeklyAuditLog,
        competitionLog: tracker.competitionLog,
        syncState: tracker.syncState,
      },
      session: {
        activeDate: session.activeDate,
        activeFocus: session.activeFocus,
        drillResults: session.drillResults,
        isComplete: session.isComplete,
        sessionNotes: session.sessionNotes,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fargo-climb-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Export complete.');
  }

  async function importData(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        settings?: typeof profile;
        notifications?: { enabled?: boolean; reminderTime?: string };
        gamification?: { soundEnabled?: boolean; hapticsEnabled?: boolean };
        progress?: {
          fargoHistory?: typeof progress.fargoHistory;
          logs?: typeof progress.logs;
          weeklyKpis?: typeof progress.weeklyKpis;
          breakChartEntries?: typeof progress.breakChartEntries;
          tournamentPreps?: typeof progress.tournamentPreps;
        };
        tracker?: {
          dailySessionLogs?: typeof tracker.dailySessionLogs;
          weeklySummaries?: typeof tracker.weeklySummaries;
          fargoRatingLog?: typeof tracker.fargoRatingLog;
          bullseyeCategoryTracker?: typeof tracker.bullseyeCategoryTracker;
          milestoneTrackerRows?: typeof tracker.milestoneTrackerRows;
          milestonePhaseStatuses?: typeof tracker.milestonePhaseStatuses;
          mechanicsChecklist?: typeof tracker.mechanicsChecklist;
          mechanicsWeeklyAuditLog?: typeof tracker.mechanicsWeeklyAuditLog;
          competitionLog?: typeof tracker.competitionLog;
          syncState?: typeof tracker.syncState;
        };
        session?: {
          activeDate?: string;
          activeFocus?: string;
          drillResults?: typeof session.drillResults;
          isComplete?: boolean;
          sessionNotes?: string;
        };
      };

      if (parsed.settings) {
        useSettingsStore.setState((state) => ({ profile: { ...state.profile, ...parsed.settings } }));
      }
      if (parsed.notifications) {
        useNotificationStore.setState((state) => ({
          ...state,
          enabled: parsed.notifications?.enabled ?? state.enabled,
          reminderTime: parsed.notifications?.reminderTime ?? state.reminderTime,
        }));
      }
      if (parsed.gamification) {
        useGamificationStore.setState((state) => ({
          ...state,
          soundEnabled: parsed.gamification?.soundEnabled ?? state.soundEnabled,
          hapticsEnabled: parsed.gamification?.hapticsEnabled ?? state.hapticsEnabled,
        }));
      }
      if (parsed.progress) {
        useProgressStore.setState((state) => ({
          ...state,
          fargoHistory: parsed.progress?.fargoHistory ?? state.fargoHistory,
          logs: parsed.progress?.logs ?? state.logs,
          weeklyKpis: parsed.progress?.weeklyKpis ?? state.weeklyKpis,
          breakChartEntries: parsed.progress?.breakChartEntries ?? state.breakChartEntries,
          tournamentPreps: parsed.progress?.tournamentPreps ?? state.tournamentPreps,
        }));
      }
      if (parsed.tracker) {
        useTrackerStore.setState((state) => ({
          ...state,
          dailySessionLogs: parsed.tracker?.dailySessionLogs ?? state.dailySessionLogs,
          weeklySummaries: parsed.tracker?.weeklySummaries ?? state.weeklySummaries,
          fargoRatingLog: parsed.tracker?.fargoRatingLog ?? state.fargoRatingLog,
          bullseyeCategoryTracker: parsed.tracker?.bullseyeCategoryTracker ?? state.bullseyeCategoryTracker,
          milestoneTrackerRows: parsed.tracker?.milestoneTrackerRows ?? state.milestoneTrackerRows,
          milestonePhaseStatuses: parsed.tracker?.milestonePhaseStatuses ?? state.milestonePhaseStatuses,
          mechanicsChecklist: parsed.tracker?.mechanicsChecklist ?? state.mechanicsChecklist,
          mechanicsWeeklyAuditLog: parsed.tracker?.mechanicsWeeklyAuditLog ?? state.mechanicsWeeklyAuditLog,
          competitionLog: parsed.tracker?.competitionLog ?? state.competitionLog,
          syncState: parsed.tracker?.syncState ?? state.syncState,
        }));
      }
      if (parsed.session) {
        useSessionStore.setState((state) => ({
          ...state,
          activeDate: parsed.session?.activeDate ?? state.activeDate,
          activeFocus: parsed.session?.activeFocus ?? state.activeFocus,
          drillResults: parsed.session?.drillResults ?? state.drillResults,
          isComplete: parsed.session?.isComplete ?? state.isComplete,
          sessionNotes: parsed.session?.sessionNotes ?? state.sessionNotes,
        }));
      }

      setStatus('Import complete.');
    } catch {
      setStatus('Import failed. Invalid backup file.');
    }
  }

  function resetAllData(): void {
    useSettingsStore.setState((state) => ({ profile: { ...state.profile, onboardingComplete: false, currentWeek: 1, currentPhase: 1 } }));
    useNotificationStore.setState((state) => ({ ...state, enabled: false, reminderTime: '19:00' }));
    useGamificationStore.setState((state) => ({ ...state, soundEnabled: true, hapticsEnabled: true }));
    useProgressStore.setState((state) => ({
      ...state,
      fargoHistory: [],
      logs: [],
      weeklyKpis: [],
      breakChartEntries: [],
      tournamentPreps: [],
    }));
    useTrackerStore.setState((state) => ({
      ...state,
      dailySessionLogs: [],
      weeklySummaries: [],
      fargoRatingLog: [],
      bullseyeCategoryTracker: bullseyeCategorySeed,
      milestoneTrackerRows: milestoneRows,
      milestonePhaseStatuses: phaseStatuses,
      mechanicsChecklist: mechanicsChecklistSeed,
      mechanicsWeeklyAuditLog: [],
      competitionLog: [],
      syncState: { pendingLogIds: [], lastSyncAt: undefined },
    }));
    useSessionStore.setState((state) => ({
      ...state,
      activeDate: new Date().toISOString().slice(0, 10),
      activeFocus: 'Stroke & Mechanics',
      drillResults: [],
      isComplete: false,
      sessionNotes: '',
    }));
    setStatus('All progress reset.');
  }

  return (
    <PageWrapper title="Settings">
      <Card className="mb-4" title="Profile">
        <label className="mb-2 block text-sm text-chalk-300">Name</label>
        <input
          value={profile.name}
          onChange={(event) => setProfile({ name: event.target.value })}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <label className="mb-2 mt-3 block text-sm text-chalk-300">Current Fargo Rating</label>
        <input
          type="number"
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

        <label className="mb-2 mt-3 block text-sm text-chalk-300">Last Official Fargo Rating</label>
        <input
          type="number"
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
      <Card title="Notifications">
        <p className="mb-3 text-ivory-200">Permission: {permission}</p>
        <div className="mb-3 flex items-center gap-2 text-sm text-ivory-200">
          <input type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} className="h-4 w-4" />
          Daily reminder enabled
        </div>
        <input
          type="time"
          value={reminderTime}
          onChange={(event) => setReminderTime(event.target.value)}
          className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <Button onClick={() => void scheduleReminder()}>Request Notification Permission</Button>
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

      <Card className="mt-4" title="Data Management">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button onClick={exportData}>Export JSON</Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Import JSON</Button>
          <Button variant="secondary" onClick={resetAllData}>Reset Progress</Button>
        </div>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(event) => void importData(event)} />
        {status ? <p className="mt-3 text-sm text-chalk-300">{status}</p> : null}
      </Card>
    </PageWrapper>
  );
}
