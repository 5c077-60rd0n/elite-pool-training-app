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
import type {
  AdaptiveDailyPlan,
  ConfidenceIndexEntry,
  PersonalRecord,
  RecoveryRecommendationPlan,
  CompetitionLogEntry,
  DailySessionLog,
  FargoRatingLogEntry,
  MatchSimulatorSession,
  MechanicsChecklistItem,
  MechanicsWeeklyAuditLog,
  MilestoneVerificationAttempt,
  MilestonePhaseStatus,
  MilestoneTrackerRow,
  OpponentPrepCard,
  TrackerSyncState,
  WeeklySummary,
  BullseyeCategoryTrackerEntry,
} from '../types/tracker';
import { generateAdaptiveDailyPlan } from '../utils/adaptivePlan';
import { buildPerformanceInsights } from '../utils/performanceInsights';
import { generateRecoveryRecommendation } from '../utils/recoveryPlan';
import {
  calculateWeeklySummary,
  estimateFargo,
  milestonePhaseStatus,
  milestoneStatusRows,
} from '../utils/trackerCalculations';

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
  adaptiveDailyPlan: AdaptiveDailyPlan | null;
  recoveryRecommendationPlan: RecoveryRecommendationPlan | null;
  syncState: TrackerSyncState;
  addDailySessionLog: (entry: DailySessionLog, currentFargo: number) => void;
  addFargoRating: (entry: FargoRatingLogEntry) => void;
  addMechanicsWeeklyAudit: (entry: MechanicsWeeklyAuditLog) => void;
  upsertMechanicsChecklistItem: (entry: MechanicsChecklistItem) => void;
  addCompetitionLog: (entry: CompetitionLogEntry) => void;
  addMatchSimSession: (entry: MatchSimulatorSession) => void;
  upsertOpponentPrepCard: (entry: OpponentPrepCard) => void;
  addMilestoneVerificationAttempt: (entry: MilestoneVerificationAttempt) => void;
  refreshAdaptiveDailyPlan: (currentFargo: number, currentWeek: number) => void;
  refreshRecoveryRecommendationPlan: () => void;
  flushSyncQueue: () => void;
}

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
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
      adaptiveDailyPlan: null,
      recoveryRecommendationPlan: null,
      syncState: { pendingLogIds: [], lastSyncAt: undefined },
      addDailySessionLog: (entry, currentFargo) =>
        set((state) => {
          const nextLogs = [entry, ...state.dailySessionLogs.filter((item) => item.id !== entry.id)];
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

          return {
            dailySessionLogs: nextLogs,
            weeklySummaries,
            milestoneTrackerRows: updatedRows,
            milestonePhaseStatuses: updatedStatuses,
            bullseyeCategoryTracker: nextBullseye,
            personalRecords: performance.personalRecords,
            confidenceIndexHistory,
            adaptiveDailyPlan,
            recoveryRecommendationPlan,
            syncState: {
              ...state.syncState,
              pendingLogIds: Array.from(new Set([...state.syncState.pendingLogIds, entry.id])),
            },
          };
        }),
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
      refreshAdaptiveDailyPlan: (currentFargo, currentWeek) =>
        set((state) => ({
          adaptiveDailyPlan: generateAdaptiveDailyPlan(state.dailySessionLogs, currentFargo, currentWeek),
        })),
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
