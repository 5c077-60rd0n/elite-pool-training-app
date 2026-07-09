import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import {
  bullseyeCategorySeed,
  mechanicsChecklistSeed,
  milestoneRows,
  phaseStatuses,
} from '../data/trackerPlan';
import { opponentPrepCardSeed } from '../data/opponentPrepCards';
import { eliteLabSeed } from '../data/eliteLab';
import type {
  AdaptiveDailyPlan,
  CoachExportHistoryEntry,
  ConfidenceIndexEntry,
  PersonalRecord,
  RecoveryRecommendationPlan,
  CompetitionLogEntry,
  DailySessionLog,
  ElitePerformanceLabData,
  FargoRatingLogEntry,
  MatchSimulatorSession,
  MechanicsChecklistItem,
  MechanicsWeeklyAuditLog,
  MilestoneVerificationAttempt,
  MilestonePhaseStatus,
  MilestoneTrackerRow,
  OpponentPrepCard,
  SessionRecommendation,
  SeasonChallengeProgress,
  SeasonMeta,
  TrackerSyncConflict,
  TrackerSyncState,
  WeeklySummary,
  BullseyeCategoryTrackerEntry,
} from '../types/tracker';
import { generateAdaptiveDailyPlan } from '../utils/adaptivePlan';
import { buildPerformanceInsights } from '../utils/performanceInsights';
import { generateRecoveryRecommendation } from '../utils/recoveryPlan';
import { getTrackerGamificationSnapshot } from '../utils/trackerGamification';
import {
  calculateWeeklySummary,
  estimateFargo,
  milestonePhaseStatus,
  milestoneStatusRows,
} from '../utils/trackerCalculations';

const ELITE_OVERRIDE_SUFFIX = " Elite override active for today's session.";

function withEliteOverrideRationale(rationale: string): string {
  return `${rationale.replace(ELITE_OVERRIDE_SUFFIX, '')}${ELITE_OVERRIDE_SUFFIX}`;
}

function mergeSessionLogs(existing: DailySessionLog, incoming: DailySessionLog): {
  merged: DailySessionLog;
  fieldsMerged: string[];
} {
  const fieldsMerged: string[] = [];
  const merged = { ...existing };

  const mergeField = <K extends keyof DailySessionLog>(field: K, preferIncoming = true): void => {
    const nextValue = incoming[field];
    const previousValue = merged[field];
    const hasIncoming = nextValue !== undefined && nextValue !== null && `${nextValue}`.trim() !== '';
    if (!hasIncoming) return;
    if (preferIncoming && nextValue !== previousValue) {
      merged[field] = nextValue;
      fieldsMerged.push(String(field));
    }
  };

  mergeField('focusArea');
  mergeField('lengthMinutes');
  mergeField('drillRoomShotmakingPct');
  mergeField('bullseyeProximity');
  mergeField('bullseyeCategory');
  mergeField('drillRoomDrillName');
  mergeField('wpbLesson');
  mergeField('wpbCategory');
  mergeField('wpbModuleName');
  mergeField('wpbTierAchieved');
  mergeField('wpbKeyTakeaway');
  mergeField('ghostDrillPlayed');
  mergeField('ghostDrillWinRatePct');
  mergeField('lineUpShotCount');
  mergeField('safetyExchangeSuccessPct');
  mergeField('appStats');
  mergeField('notes');

  const mergedTags = Array.from(new Set([...(existing.coachTags ?? []), ...(incoming.coachTags ?? [])]));
  if (mergedTags.length !== (existing.coachTags ?? []).length) fieldsMerged.push('coachTags');
  merged.coachTags = mergedTags;

  const mergedClipRefs = Array.from(new Set([...(existing.videoClipRefs ?? []), ...(incoming.videoClipRefs ?? [])]));
  if (mergedClipRefs.length !== (existing.videoClipRefs ?? []).length) fieldsMerged.push('videoClipRefs');
  merged.videoClipRefs = mergedClipRefs;

  merged.updatedAt = incoming.updatedAt;
  merged.syncedAt = undefined;

  return { merged, fieldsMerged };
}

interface TrackerState {
  dailySessionLogs: DailySessionLog[];
  weeklySummaries: WeeklySummary[];
  fargoRatingLog: FargoRatingLogEntry[];
  bullseyeCategoryTracker: BullseyeCategoryTrackerEntry[];
  milestoneTrackerRows: MilestoneTrackerRow[];
  milestoneVerificationAttempts: MilestoneVerificationAttempt[];
  milestonePhaseStatuses: MilestonePhaseStatus[];
  mechanicsChecklist: MechanicsChecklistItem[];
  mechanicsWeeklyAuditLog: MechanicsWeeklyAuditLog[];
  competitionLog: CompetitionLogEntry[];
  matchSimSessions: MatchSimulatorSession[];
  opponentPrepCards: OpponentPrepCard[];
  personalRecords: PersonalRecord[];
  confidenceIndexHistory: ConfidenceIndexEntry[];
  coachExportHistory: CoachExportHistoryEntry[];
  seasonMeta: SeasonMeta;
  seasonChallengeProgress: SeasonChallengeProgress;
  eliteLab: ElitePerformanceLabData;
  adaptiveDailyPlan: AdaptiveDailyPlan | null;
  recoveryRecommendationPlan: RecoveryRecommendationPlan | null;
  lastSessionRecommendation: SessionRecommendation | null;
  syncState: TrackerSyncState;
  addDailySessionLog: (entry: DailySessionLog, currentFargo: number) => void;
  setLastSessionRecommendation: (entry: SessionRecommendation | null) => void;
  addFargoRating: (entry: FargoRatingLogEntry) => void;
  addMechanicsWeeklyAudit: (entry: MechanicsWeeklyAuditLog) => void;
  upsertMechanicsChecklistItem: (entry: MechanicsChecklistItem) => void;
  addCompetitionLog: (entry: CompetitionLogEntry) => void;
  addMatchSimSession: (entry: MatchSimulatorSession) => void;
  upsertOpponentPrepCard: (entry: OpponentPrepCard) => void;
  addCoachExportHistoryEntry: (entry: CoachExportHistoryEntry) => void;
  addMilestoneVerificationAttempt: (entry: MilestoneVerificationAttempt) => void;
  setEliteLab: (updater: (state: ElitePerformanceLabData) => ElitePerformanceLabData) => void;
  promoteEliteActionToAdaptivePlan: (actionItem: string, focusKpiName?: string, recommendedMinutes?: number) => void;
  refreshSeasonProgress: () => void;
  refreshAdaptiveDailyPlan: (currentFargo: number, currentWeek: number) => void;
  refreshRecoveryRecommendationPlan: () => void;
  flushSyncQueue: () => void;
}

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      seasonMeta: getTrackerGamificationSnapshot([]).seasonMeta,
      seasonChallengeProgress: getTrackerGamificationSnapshot([]).seasonChallenges,
      eliteLab: eliteLabSeed,
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
      adaptiveDailyPlan: null,
      recoveryRecommendationPlan: null,
      lastSessionRecommendation: null,
      syncState: { pendingLogIds: [], lastSyncAt: undefined, conflicts: [] },
      addDailySessionLog: (entry, currentFargo) =>
        set((state) => {
          const sameDateExisting = state.dailySessionLogs.find((item) => item.date === entry.date && item.id !== entry.id);
          let nextLogs = [entry, ...state.dailySessionLogs.filter((item) => item.id !== entry.id)];
          let nextConflicts: TrackerSyncConflict[] = state.syncState.conflicts ?? [];

          if (sameDateExisting) {
            const { merged, fieldsMerged } = mergeSessionLogs(sameDateExisting, entry);
            nextLogs = [
              merged,
              ...state.dailySessionLogs.filter((item) => item.id !== sameDateExisting.id && item.id !== entry.id),
            ];

            nextConflicts = [
              {
                id: `sync-conflict-${Date.now()}`,
                date: entry.date,
                existingId: sameDateExisting.id,
                incomingId: entry.id,
                mergedAt: new Date().toISOString(),
                fieldsMerged,
              },
              ...nextConflicts,
            ].slice(0, 20);
          }

          const weekNumbers = Array.from(new Set(nextLogs.map((item) => item.weekNumber))).sort((a, b) => a - b);
          const weeklySummaries = weekNumbers
            .map((weekNumber) => calculateWeeklySummary(nextLogs, weekNumber, state.weeklySummaries))
            .filter((item): item is WeeklySummary => Boolean(item));

          const estFargo = estimateFargo(currentFargo, nextLogs, state.fargoRatingLog);
          const updatedRows = milestoneStatusRows(state.milestoneTrackerRows, estFargo);
          const updatedStatuses = milestonePhaseStatus(state.milestonePhaseStatuses, updatedRows);

          const nextBullseye =
            entry.bullseyeCategory && entry.bullseyeProximity > 0
              ? state.bullseyeCategoryTracker.map((item) =>
                  item.category === entry.bullseyeCategory
                    ? {
                        ...item,
                        lastTestedDate: entry.date,
                        bestProximityScore:
                          item.bestProximityScore && item.bestProximityScore > 0
                            ? Math.min(item.bestProximityScore, entry.bullseyeProximity)
                            : entry.bullseyeProximity,
                        sessionsPracticed: item.sessionsPracticed + 1,
                      }
                    : item,
                )
              : state.bullseyeCategoryTracker;

          const adaptiveDailyPlan = generateAdaptiveDailyPlan(nextLogs, currentFargo, entry.weekNumber);
          const recoveryRecommendationPlan = generateRecoveryRecommendation(
            nextLogs,
            state.competitionLog,
            adaptiveDailyPlan,
          );
          const performance = buildPerformanceInsights({
            logs: nextLogs,
            competitionLog: state.competitionLog,
            matchSimSessions: state.matchSimSessions,
          });
          const confidenceIndexHistory = [
            performance.confidenceIndex,
            ...state.confidenceIndexHistory,
          ].slice(0, 60);
          const seasonSnapshot = getTrackerGamificationSnapshot(nextLogs);

          return {
            dailySessionLogs: nextLogs,
            weeklySummaries,
            milestoneTrackerRows: updatedRows,
            milestonePhaseStatuses: updatedStatuses,
            bullseyeCategoryTracker: nextBullseye,
            personalRecords: performance.personalRecords,
            confidenceIndexHistory,
            seasonMeta: seasonSnapshot.seasonMeta,
            seasonChallengeProgress: seasonSnapshot.seasonChallenges,
            adaptiveDailyPlan,
            recoveryRecommendationPlan,
            syncState: {
              ...state.syncState,
              pendingLogIds: Array.from(
                new Set([
                  ...state.syncState.pendingLogIds,
                  sameDateExisting ? sameDateExisting.id : entry.id,
                ]),
              ),
              conflicts: nextConflicts,
            },
          };
        }),
      setLastSessionRecommendation: (entry) => set({ lastSessionRecommendation: entry }),
      addFargoRating: (entry) =>
        set((state) => {
          const nextFargo = [entry, ...state.fargoRatingLog.filter((item) => item.id !== entry.id)];
          const estFargo = estimateFargo(550, state.dailySessionLogs, nextFargo);
          const updatedRows = milestoneStatusRows(state.milestoneTrackerRows, estFargo);
          const updatedStatuses = milestonePhaseStatus(state.milestonePhaseStatuses, updatedRows);
          const currentWeek = Math.max(1, ...state.dailySessionLogs.map((item) => item.weekNumber));
          const adaptiveDailyPlan = generateAdaptiveDailyPlan(
            state.dailySessionLogs,
            entry.newFargoRating,
            currentWeek,
          );
          const recoveryRecommendationPlan = generateRecoveryRecommendation(
            state.dailySessionLogs,
            state.competitionLog,
            adaptiveDailyPlan,
          );
          const performance = buildPerformanceInsights({
            logs: state.dailySessionLogs,
            competitionLog: state.competitionLog,
            matchSimSessions: state.matchSimSessions,
          });
          const confidenceIndexHistory = [
            performance.confidenceIndex,
            ...state.confidenceIndexHistory,
          ].slice(0, 60);
          return {
            fargoRatingLog: nextFargo,
            milestoneTrackerRows: updatedRows,
            milestonePhaseStatuses: updatedStatuses,
            personalRecords: performance.personalRecords,
            confidenceIndexHistory,
            adaptiveDailyPlan,
            recoveryRecommendationPlan,
          };
        }),
      addMechanicsWeeklyAudit: (entry) =>
        set((state) => ({
          mechanicsWeeklyAuditLog: [
            entry,
            ...state.mechanicsWeeklyAuditLog.filter((item) => item.id !== entry.id),
          ],
        })),
      upsertMechanicsChecklistItem: (entry) =>
        set((state) => ({
          mechanicsChecklist: [
            ...state.mechanicsChecklist.filter((item) => item.id !== entry.id),
            entry,
          ],
        })),
      addCompetitionLog: (entry) =>
        set((state) => {
          const nextCompetition = [entry, ...state.competitionLog.filter((item) => item.id !== entry.id)];
          const recoveryRecommendationPlan = generateRecoveryRecommendation(
            state.dailySessionLogs,
            nextCompetition,
            state.adaptiveDailyPlan,
          );
          const performance = buildPerformanceInsights({
            logs: state.dailySessionLogs,
            competitionLog: nextCompetition,
            matchSimSessions: state.matchSimSessions,
          });
          const confidenceIndexHistory = [
            performance.confidenceIndex,
            ...state.confidenceIndexHistory,
          ].slice(0, 60);

          return {
            competitionLog: nextCompetition,
            personalRecords: performance.personalRecords,
            confidenceIndexHistory,
            recoveryRecommendationPlan,
            syncState: {
              ...state.syncState,
              pendingLogIds: Array.from(new Set([...state.syncState.pendingLogIds, entry.id])),
            },
          };
        }),
      addMatchSimSession: (entry) =>
        set((state) => {
          const nextSims = [entry, ...state.matchSimSessions.filter((item) => item.id !== entry.id)];
          const performance = buildPerformanceInsights({
            logs: state.dailySessionLogs,
            competitionLog: state.competitionLog,
            matchSimSessions: nextSims,
          });
          const confidenceIndexHistory = [
            performance.confidenceIndex,
            ...state.confidenceIndexHistory,
          ].slice(0, 60);
          return {
            matchSimSessions: nextSims,
            personalRecords: performance.personalRecords,
            confidenceIndexHistory,
            syncState: {
              ...state.syncState,
              pendingLogIds: Array.from(new Set([...state.syncState.pendingLogIds, entry.id])),
            },
          };
        }),
      upsertOpponentPrepCard: (entry) =>
        set((state) => ({
          opponentPrepCards: [
            entry,
            ...state.opponentPrepCards.filter((item) => item.id !== entry.id),
          ],
        })),
      addCoachExportHistoryEntry: (entry) =>
        set((state) => ({
          coachExportHistory: [entry, ...state.coachExportHistory.filter((item) => item.id !== entry.id)].slice(
            0,
            30,
          ),
        })),
      addMilestoneVerificationAttempt: (entry) =>
        set((state) => {
          const nextAttempts = [
            entry,
            ...state.milestoneVerificationAttempts.filter((item) => item.id !== entry.id),
          ];

          const nextRows = state.milestoneTrackerRows.map((row) => {
            if (row.id !== entry.milestoneId) return row;
            const nextStatus: 'Met' | 'Not Met' =
              row.status === 'Met' || entry.outcome === 'Pass' ? 'Met' : 'Not Met';
            return {
              ...row,
              currentBest: entry.measuredValue || row.currentBest,
              status: nextStatus,
            };
          });

          const nextPhaseStatuses = milestonePhaseStatus(state.milestonePhaseStatuses, nextRows);

          return {
            milestoneVerificationAttempts: nextAttempts,
            milestoneTrackerRows: nextRows,
            milestonePhaseStatuses: nextPhaseStatuses,
          };
        }),
      setEliteLab: (updater) =>
        set((state) => ({
          eliteLab: updater(state.eliteLab),
        })),
      promoteEliteActionToAdaptivePlan: (actionItem, focusKpiName, recommendedMinutes) =>
        set((state) => {
          const now = new Date();
          const isoNow = now.toISOString();
          const today = isoNow.slice(0, 10);
          const weekNumber = Math.max(1, ...state.dailySessionLogs.map((item) => item.weekNumber));
          const eliteAction = `Elite priority: ${actionItem.trim()}`;

          const basePlan =
            state.adaptiveDailyPlan ?? {
              id: `adaptive-${Date.now()}`,
              generatedAt: isoNow,
              forDate: isoNow.slice(0, 10),
              weekNumber,
              focusKpiId: 'elite-priority',
              focusKpiName: 'Elite Priority',
              rationale: 'Elite Performance Lab promoted a same-day execution priority.',
              recommendedMinutes: 75,
              targetMetrics: {
                drillRoomShotmakingPct: 75,
                ghostDrillWinRatePct: 55,
                safetyExchangeSuccessPct: 60,
                lineUpShotCount: 3,
                bullseyeProximity: 3,
                wpbLessonsThisWeek: 3,
              },
              actionChecklist: [],
            };

          const promotedActions = [
            eliteAction,
            ...(basePlan.eliteOverride?.promotedActions ?? []).filter((item) => item !== eliteAction),
          ].slice(0, 5);

          const actionChecklist = [
            ...promotedActions,
            ...basePlan.actionChecklist.filter((item) => !promotedActions.includes(item)),
          ].slice(0, 10);

          const nextRecommendedMinutes = typeof recommendedMinutes === 'number'
            ? Math.max(20, Math.min(180, recommendedMinutes))
            : basePlan.recommendedMinutes;

          const nextFocusKpiName = focusKpiName?.trim() || basePlan.focusKpiName;

          return {
            adaptiveDailyPlan: {
              ...basePlan,
              generatedAt: isoNow,
              focusKpiName: nextFocusKpiName,
              recommendedMinutes: nextRecommendedMinutes,
              rationale: withEliteOverrideRationale(basePlan.rationale),
              actionChecklist,
              eliteOverride: {
                lockedForDate: today,
                source: 'elite-lab',
                promotedActions,
                promotedFocusKpiName: nextFocusKpiName,
                promotedRecommendedMinutes: nextRecommendedMinutes,
              },
            },
          };
        }),
      refreshSeasonProgress: () =>
        set((state) => {
          const seasonSnapshot = getTrackerGamificationSnapshot(state.dailySessionLogs);
          return {
            seasonMeta: seasonSnapshot.seasonMeta,
            seasonChallengeProgress: seasonSnapshot.seasonChallenges,
          };
        }),
      refreshAdaptiveDailyPlan: (currentFargo, currentWeek) =>
        set((state) => {
          const regenerated = generateAdaptiveDailyPlan(state.dailySessionLogs, currentFargo, currentWeek);
          const override = state.adaptiveDailyPlan?.eliteOverride;
          const today = new Date().toISOString().slice(0, 10);
          const hasTodayLog = state.dailySessionLogs.some((item) => item.date === today);

          if (!override || override.lockedForDate !== today || hasTodayLog) {
            return { adaptiveDailyPlan: regenerated };
          }

          const actionChecklist = [
            ...override.promotedActions,
            ...regenerated.actionChecklist.filter((item) => !override.promotedActions.includes(item)),
          ].slice(0, 10);

          return {
            adaptiveDailyPlan: {
              ...regenerated,
              focusKpiName: override.promotedFocusKpiName ?? regenerated.focusKpiName,
              recommendedMinutes: override.promotedRecommendedMinutes ?? regenerated.recommendedMinutes,
              rationale: withEliteOverrideRationale(regenerated.rationale),
              actionChecklist,
              eliteOverride: override,
            },
          };
        }),
      refreshRecoveryRecommendationPlan: () =>
        set((state) => ({
          recoveryRecommendationPlan: generateRecoveryRecommendation(
            state.dailySessionLogs,
            state.competitionLog,
            state.adaptiveDailyPlan,
          ),
        })),
      flushSyncQueue: () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        const pending = get().syncState.pendingLogIds;
        if (!pending.length) return;
        set((state) => ({
          dailySessionLogs: state.dailySessionLogs.map((item) =>
            pending.includes(item.id)
              ? {
                  ...item,
                  syncedAt: new Date().toISOString(),
                }
              : item,
          ),
          syncState: {
            pendingLogIds: [],
            lastSyncAt: new Date().toISOString(),
            conflicts: state.syncState.conflicts ?? [],
          },
        }));
      },
    }),
    {
      name: 'fargo-climb-tracker',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
