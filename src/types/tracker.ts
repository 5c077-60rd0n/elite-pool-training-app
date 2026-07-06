export type TrackerPhaseId = 1 | 2 | 3 | 4 | 5;

export type BullseyeCategory =
  | 'Follow'
  | 'Stun'
  | 'Draw'
  | 'Sidespin'
  | 'Thin Cuts'
  | 'Cheating the Pocket'
  | 'Rail-First'
  | 'High Spin'
  | 'Finesse'
  | 'Safety'
  | 'Mixed'
  | 'Shot Clock Challenge';

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Elite';

export type MatchResult = 'Win' | 'Loss';

export type YesNo = 'Yes' | 'No';

export interface DailySessionLog {
  id: string;
  date: string;
  dayOfWeek: string;
  weekNumber: number;
  focusArea: string;
  lengthMinutes: number;
  drillRoomShotmakingPct: number;
  bullseyeProximity: number;
  bullseyeCategory: BullseyeCategory;
  wpbLesson: YesNo;
  wpbModuleName: string;
  ghostDrillWinRatePct: number;
  lineUpShotCount: number;
  safetyExchangeSuccessPct: number;
  notes: string;
  coachTags?: string[];
  videoClipRefs?: string[];
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface WeeklySummary {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  sessionsCompleted: number;
  totalTrainingMinutes: number;
  avgDrillRoomShotmakingPct: number;
  avgBullseyeProximityScore: number;
  ghostDrillBestWinRatePct: number;
  wpbLessonsCompleted: number;
  lineUpBestScore: number;
  rolling4WeekAvgDrillRoomPct: number;
  rolling4WeekAvgGhostDrillPct: number;
  notesAdjustments: string;
  generatedAt: string;
}

export interface FargoRatingLogEntry {
  id: string;
  date: string;
  eventTournamentName: string;
  opponentFargoRating?: number;
  matchResult: MatchResult;
  gamesWon: number;
  gamesLost: number;
  newFargoRating: number;
  ratingChange?: number;
  notes: string;
}

export interface BullseyeCategoryTrackerEntry {
  id: string;
  category: BullseyeCategory;
  currentProficiencyLevel: ProficiencyLevel;
  lastTestedDate?: string;
  bestProximityScore?: number;
  sessionsPracticed: number;
  targetByPhase: string;
  achievementUnlocked: YesNo;
}

export interface MilestoneTrackerRow {
  id: string;
  phase: TrackerPhaseId;
  phaseLabel: string;
  fargoRange: string;
  timeline: string;
  milestoneTestDescription: string;
  targetMetric: string;
  currentBest: string;
  status: 'Met' | 'Not Met';
}

export interface MilestonePhaseStatus {
  phase: TrackerPhaseId;
  label: string;
  targetWeeks: string;
  phaseStatus: 'Not Started' | 'In Progress' | 'Met';
}

export interface MilestoneVerificationAttempt {
  id: string;
  milestoneId: string;
  date: string;
  measuredValue: string;
  outcome: 'Pass' | 'Fail';
  evidenceNotes: string;
  clipReferenceUrl?: string;
  beforeSnapshotNotes?: string;
  afterSnapshotNotes?: string;
  evaluator: string;
  createdAt: string;
}

export interface MechanicsChecklistItem {
  id: string;
  checkpointItem: string;
  whatToVerify: string;
  toolToUse: string;
  frequency: string;
  lastCheckedDate?: string;
  status: 'Not Checked' | 'Pass' | 'Needs Work';
  notes: string;
  clipReferenceUrl?: string;
  beforeSnapshotNotes?: string;
  afterSnapshotNotes?: string;
}

export interface MechanicsWeeklyAuditLog {
  id: string;
  weekNumber: number;
  date: string;
  itemsPassed: number;
  itemsFailed: number;
  keyFinding: string;
  actionItem: string;
  signOff: string;
}

export interface CompetitionLogEntry {
  id: string;
  date: string;
  eventName: string;
  format: string;
  result: string;
  notes: string;
}

export type MatchSimulatorPressureLevel = 'low' | 'medium' | 'high';

export interface MatchSimulatorSession {
  id: string;
  date: string;
  opponentArchetype: string;
  raceTo: number;
  inningsPlayed: number;
  breaksMade: number;
  breakAndRuns: number;
  safetyWins: number;
  pressureLevel: MatchSimulatorPressureLevel;
  pressureShotsMade: number;
  pressureShotsAttempted: number;
  startingScoreline?: string;
  inningCap?: number;
  mustMakeShots?: number;
  mustMakeMade?: number;
  hillHillResult: 'Win' | 'Loss' | 'N/A';
  result: MatchResult;
  matchReadinessScore: number;
  drillReadinessScore: number;
  notes: string;
  createdAt: string;
}

export interface OpponentPrepCard {
  id: string;
  name: string;
  archetype: string;
  openingPatterns: string[];
  safetyPlans: string[];
  bailoutChoices: string[];
  notes: string;
  updatedAt: string;
}

export interface PersonalRecord {
  id: string;
  label: string;
  value: number;
  unit: string;
  achievedAt: string;
  source: 'training' | 'simulation' | 'competition';
}

export interface ConfidenceIndexComponents {
  trainingConsistency: number;
  matchReadiness: number;
  recentResults: number;
  pressureExecution: number;
}

export interface ConfidenceIndexEntry {
  id: string;
  date: string;
  score: number;
  components: ConfidenceIndexComponents;
  rationale: string;
}

export interface CoachReviewExportPayload {
  generatedAt: string;
  athlete: {
    name: string;
    currentFargoRating: number;
    targetFargoRating: number;
    currentWeek: number;
  };
  period: {
    startDate?: string;
    endDate?: string;
    sessionCount: number;
  };
  weeklySummary?: WeeklySummary;
  recentKpis: {
    drillRoomShotmakingPct: number;
    ghostDrillWinRatePct: number;
    safetyExchangeSuccessPct: number;
    lineUpShotCount: number;
    wpbLessonsCompleted: number;
  };
  competitionSnapshot: {
    eventsPlayed: number;
    wins: number;
    losses: number;
    latestEvent?: string;
  };
  confidenceIndex?: ConfidenceIndexEntry;
  personalRecords: PersonalRecord[];
  focusPriorities: string[];
  coachNotes: string[];
}

export interface CoachExportHistoryEntry {
  id: string;
  generatedAt: string;
  fileName: string;
  payload: CoachReviewExportPayload;
}

export interface SeasonMeta {
  id: string;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  ladderTier: string;
  ladderRank: number;
}

export interface SeasonQuestChainStep {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface SeasonBossChallenge {
  id: string;
  title: string;
  description: string;
  attempts: number;
  completed: boolean;
  lastScore?: number;
}

export interface SeasonChallengeProgress {
  updatedAt: string;
  qualityScore7DayAvg: number;
  themedQuestChain: SeasonQuestChainStep[];
  bossChallenges: SeasonBossChallenge[];
}

export interface ShotDecisionEntry {
  id: string;
  date: string;
  scenario: string;
  optionsConsidered: string[];
  selectedOption: string;
  result: 'success' | 'partial' | 'fail';
  decisionQualityScore: number;
  notes: string;
}

export interface PressureScenarioResult {
  id: string;
  date: string;
  scenarioType: 'hill-hill' | 'shot-clock' | 'bad-leave' | 'crowd-noise';
  attempts: number;
  conversions: number;
  clutchRatePct: number;
  notes: string;
}

export interface OpponentPatternIntel {
  id: string;
  opponentName: string;
  archetype: string;
  breakTendency: string;
  safetyTendency: string;
  kickWeakness: string;
  pressureLeak: string;
  planNotes: string;
  updatedAt: string;
}

export interface BreakOptimizationEntry {
  id: string;
  date: string;
  gameType: '9-ball' | '10-ball' | '8-ball';
  breakPosition: string;
  breakSpeed: string;
  cueBallLandingZone: string;
  ballsMade: number;
  shotOnNext: boolean;
  successRating: number;
  notes: string;
}

export interface SafetyKickPatternDrill {
  id: string;
  name: string;
  family: 'safety' | 'kick';
  intervalDays: number;
  dueDate: string;
  proficiency: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface RackPatternReview {
  id: string;
  date: string;
  layoutLabel: string;
  plannedRoute: string;
  cleanerAlternative: string;
  routeEfficiencyScore: number;
  notes: string;
}

export interface PreShotRoutineLog {
  id: string;
  date: string;
  scenario: string;
  routineUsed: boolean;
  shotDifficulty: 1 | 2 | 3 | 4 | 5;
  outcome: 'made' | 'missed' | 'safe';
  notes: string;
}

export interface TournamentAutopsy {
  id: string;
  date: string;
  eventName: string;
  decisionErrors: string;
  executionErrors: string;
  emotionalErrors: string;
  preparationErrors: string;
  nextWeekPriority: string;
}

export interface ReadinessEntry {
  id: string;
  date: string;
  sleepHours: number;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  sorenessLevel: 1 | 2 | 3 | 4 | 5;
  focusLevel: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface ElitePerformanceLabData {
  shotDecisionEntries: ShotDecisionEntry[];
  pressureScenarioResults: PressureScenarioResult[];
  opponentIntel: OpponentPatternIntel[];
  breakOptimizationLog: BreakOptimizationEntry[];
  safetyKickDrills: SafetyKickPatternDrill[];
  rackPatternReviews: RackPatternReview[];
  preShotRoutineLogs: PreShotRoutineLog[];
  tournamentAutopsies: TournamentAutopsy[];
  readinessLog: ReadinessEntry[];
}

export interface EstimatedFargoModel {
  id: string;
  baseRating: number;
  ghostDrillPoints: number;
  drillRoomPoints: number;
  weeksTrainedPoints: number;
  estimatedFargoRating: number;
}

export interface TrackerDrillDefinition {
  id: string;
  name: string;
  app: 'WPB' | 'DrillRoom' | 'Bullseye';
  dayOfWeek: string;
  attemptsOrReps: string;
  successTarget: string;
  phaseIntroduced: string;
  description: string;
  notes: string;
  metricField:
    | 'drillRoomShotmakingPct'
    | 'bullseyeProximity'
    | 'ghostDrillWinRatePct'
    | 'lineUpShotCount'
    | 'safetyExchangeSuccessPct'
    | 'wpbLesson';
}

export interface DailyTemplate {
  day: string;
  focusArea: string;
  primaryApp: string;
  sessionLengthLabel: string;
  keyDrills: string[];
}

export interface TrackerSyncState {
  pendingLogIds: string[];
  lastSyncAt?: string;
  conflicts?: TrackerSyncConflict[];
}

export interface TrackerSyncConflict {
  id: string;
  date: string;
  existingId: string;
  incomingId: string;
  mergedAt: string;
  fieldsMerged: string[];
}

export interface AdaptiveTargetMetrics {
  drillRoomShotmakingPct: number;
  ghostDrillWinRatePct: number;
  safetyExchangeSuccessPct: number;
  lineUpShotCount: number;
  bullseyeProximity: number;
  wpbLessonsThisWeek: number;
}

export interface AdaptiveDailyPlan {
  id: string;
  generatedAt: string;
  forDate: string;
  weekNumber: number;
  focusKpiId: string;
  focusKpiName: string;
  rationale: string;
  recommendedMinutes: number;
  targetMetrics: AdaptiveTargetMetrics;
  actionChecklist: string[];
  prescribedDrills?: string[];
  eliteOverride?: {
    lockedForDate: string;
    source: string;
    promotedActions: string[];
    promotedFocusKpiName?: string;
    promotedRecommendedMinutes?: number;
  };
}

export interface RecoveryCheckpointMetrics {
  drillRoomShotmakingPct: number;
  ghostDrillWinRatePct: number;
  safetyExchangeSuccessPct: number;
  lineUpShotCount: number;
}

export interface RecoveryRecommendationPlan {
  id: string;
  generatedAt: string;
  forDate: string;
  horizonDays: number;
  trigger: 'weak-session' | 'competition-loss' | 'mixed';
  severity: 'medium' | 'high';
  focusKpiId: string;
  focusKpiName: string;
  recommendedFocusArea: string;
  rationale: string;
  actions: string[];
  checkpointMetrics: RecoveryCheckpointMetrics;
}
