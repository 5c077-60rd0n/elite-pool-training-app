export type ProgramPhaseId = 1 | 2 | 3 | 4 | 5;

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type DrillCategory =
  | 'stroke-mechanics'
  | 'aiming-systems'
  | 'cue-ball-control'
  | 'pattern-play'
  | 'safety'
  | 'break-optimization'
  | 'banking-kicking'
  | 'mental-game'
  | 'straight-pool'
  | 'integration';

export interface UserProfile {
  id: string;
  name: string;
  currentFargoRating: number;
  planningFargoRating?: number;
  targetFargoRating: number;
  lastOfficialFargoRating?: number;
  lastOfficialFargoDate?: string;
  historicalPeakFargoRating?: number;
  yearsAwayFromCompetition?: number;
  programStartDate: string;
  currentPhase: ProgramPhaseId;
  currentWeek: number;
  dailyReminderTime: string;
  reminderEnabled: boolean;
  preferredBreakGame: '9-ball' | '10-ball' | '8-ball';
  tableSize: '7ft' | '8ft' | '9ft';
  dominantHand: 'right' | 'left';
  adhdModeEnabled?: boolean;
  onboardingComplete: boolean;
}

export interface Phase {
  id: ProgramPhaseId;
  name: string;
  weeks: [number, number];
  fargoTarget: [number, number];
  description: string;
  focusAreas: string[];
  monthlyMilestones: MonthlyMilestone[];
}

export interface MonthlyMilestone {
  month: number;
  phase: number;
  weekRange: [number, number];
  fargoTarget: number;
  cbControlKPI: string;
  patternKPI: string;
  safetyKPI: string;
  breakKPI: string;
  mentalKPI: string;
  description: string;
}

export interface DaySession {
  dayOfWeek: DayOfWeek;
  focusArea: string;
  segments: SessionSegment[];
  totalMinutes: 60;
}

export interface SessionSegment {
  id: string;
  name: string;
  durationMinutes: number;
  drillIds: string[];
  notes: string;
}

export interface ProgramWeek {
  week: number;
  phase: ProgramPhaseId;
  month: number;
  theme: string;
  fargoRangeTarget: [number, number];
  dailySessions: Record<DayOfWeek, DaySession>;
  weeklyFocus: string;
  coachNote: string;
}

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  durationMinutes: number;
  applicablePhases: number[];
  description: string;
  setup: string;
  instructions: string[];
  scoringMethod: ScoringMethod;
  targetScore: DrillTarget;
  proTip: string;
  videoReference?: string;
  tableLayoutDescription: string;
}

export interface ScoringMethod {
  type: 'percentage' | 'count' | 'time' | 'binary' | 'rating';
  maxScore: number;
  unit: string;
  trackingFields: TrackingField[];
}

export interface TrackingField {
  id: string;
  label: string;
  type: 'number' | 'boolean' | 'select';
  options?: string[];
}

export interface DrillTarget {
  phase1: number;
  phase2: number;
  phase3: number;
  phase4: number;
  phase5?: number;
}

export interface KPI {
  id: string;
  name: string;
  category: DrillCategory;
  description: string;
  measurementUnit: string;
  benchmarks: KPIBenchmark;
  relatedDrillIds: string[];
}

export interface KPIBenchmark {
  fargo550: number;
  fargo600: number;
  fargo650: number;
  fargo700: number;
  fargo750: number;
  fargo800: number;
}

export interface DrillResult {
  drillId: string;
  startTime: string;
  endTime?: string;
  fieldValues: Record<string, number | string | boolean>;
  calculatedScore: number;
  targetScore: number;
  metTarget: boolean;
  notes: string;
}

export interface DrillSessionLog {
  id: string;
  date: string;
  week: number;
  phase: number;
  dayOfWeek: string;
  focusArea: string;
  sessionStartTime: string;
  sessionEndTime?: string;
  totalDurationMinutes?: number;
  completed: boolean;
  drillResults: DrillResult[];
  sessionNotes: string;
  mentalGameRating: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
}

export interface KPIWeeklyEntry {
  kpiId: string;
  week: number;
  month: number;
  phase: number;
  value: number;
  sessionCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface BreakChartEntry {
  date: string;
  game: string;
  position: string;
  ballMade: boolean;
  cbZone: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  ballsScattered: number;
  notes: string;
}

export interface PrepChecklist {
  id: string;
  label: string;
  daysOut: number;
  completed: boolean;
}

export interface PostEventAnalysis {
  result: string;
  bestDecisions: string[];
  weakestDecisions: string[];
  primarySkillGap: string;
  linkedFocusAreaId?: string;
  linkedDrillId?: string;
  notes: string;
}

export interface TournamentPrep {
  id: string;
  tournamentName: string;
  date: string;
  format: string;
  location: string;
  opponentPrepCardId?: string;
  prepStartDate: string;
  currentStep: number;
  checklistItems: PrepChecklist[];
  postEventAnalysis?: PostEventAnalysis;
}

export interface PlateauAction {
  step: number;
  action: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface PlateauStatus {
  isOnPlateau: boolean;
  weeksAtSameLevel: number;
  recommendedActions: PlateauAction[];
}

export interface MentalGameTip {
  id: string;
  category: 'focus' | 'resilience' | 'routine' | 'pressure';
  title: string;
  content: string;
}

export interface MentalGameLogEntry {
  id: string;
  date: string;
  tipId: string;
  category: MentalGameTip['category'];
  scenario: 'practice' | 'match' | 'post-miss' | 'closing-rack';
  used: boolean;
  effectScore: 1 | 2 | 3 | 4 | 5;
  notes: string;
}
