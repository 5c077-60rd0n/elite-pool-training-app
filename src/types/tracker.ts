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

export interface MechanicsChecklistItem {
  id: string;
  checkpointItem: string;
  whatToVerify: string;
  toolToUse: string;
  frequency: string;
  lastCheckedDate?: string;
  status: 'Not Checked' | 'Pass' | 'Needs Work';
  notes: string;
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
