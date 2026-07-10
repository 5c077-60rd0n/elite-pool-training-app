import type {
  CompetitionLogEntry,
  ConfidenceIndexEntry,
  DailySessionLog,
  MatchSimulatorSession,
  RecoveryRecommendationPlan,
} from '../types/tracker';

interface FargoHistoryPoint {
  date: string;
  rating: number;
}

export interface FargoForecastResult {
  projectedDate?: string;
  weeklyGain: number;
  pointsRemaining: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface WeeklyReviewAssistant {
  headline: string;
  improved: string[];
  slipped: string[];
  nextFocus: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toIsoDate(offsetDays: number): string {
  const next = new Date();
  next.setDate(next.getDate() + offsetDays);
  return next.toISOString().slice(0, 10);
}

export function estimateGoalDate(
  currentRating: number,
  targetRating: number,
  history: FargoHistoryPoint[],
  sessionsPerWeek: number,
  qualityLiftPct: number,
): FargoForecastResult {
  const pointsRemaining = Math.max(0, targetRating - currentRating);
  const sorted = [...history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  let weeklyGain = 0.8;
  if (sorted.length >= 2) {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const weeks = Math.max(1, (Date.parse(last.date) - Date.parse(first.date)) / 604_800_000);
    weeklyGain = (last.rating - first.rating) / weeks;
  }

  weeklyGain = Math.max(0.2, weeklyGain);

  const sessionFactor = clamp(sessionsPerWeek / 4, 0.5, 1.8);
  const qualityFactor = clamp(1 + qualityLiftPct / 100, 0.8, 1.5);
  const adjustedWeeklyGain = Number((weeklyGain * sessionFactor * qualityFactor).toFixed(2));

  if (pointsRemaining === 0) {
    return {
      projectedDate: toIsoDate(0),
      weeklyGain: adjustedWeeklyGain,
      pointsRemaining,
      confidence: 'high',
    };
  }

  const projectedWeeks = pointsRemaining / Math.max(0.1, adjustedWeeklyGain);
  const projectedDays = Math.round(projectedWeeks * 7);

  const confidence: 'low' | 'medium' | 'high' =
    sorted.length >= 6 ? 'high' : sorted.length >= 3 ? 'medium' : 'low';

  return {
    projectedDate: projectedDays > 365 * 5 ? undefined : toIsoDate(projectedDays),
    weeklyGain: adjustedWeeklyGain,
    pointsRemaining,
    confidence,
  };
}

export function buildWeeklyReviewAssistant(
  logs: DailySessionLog[],
  sims: MatchSimulatorSession[],
  competition: CompetitionLogEntry[],
  weekNumber: number,
): WeeklyReviewAssistant {
  const thisWeek = logs.filter((item) => item.weekNumber === weekNumber);
  const prevWeek = logs.filter((item) => item.weekNumber === weekNumber - 1);

  const thisDrill = average(thisWeek.map((item) => item.drillRoomShotmakingPct));
  const prevDrill = average(prevWeek.map((item) => item.drillRoomShotmakingPct));
  const thisSafety = average(thisWeek.map((item) => item.safetyExchangeSuccessPct));
  const prevSafety = average(prevWeek.map((item) => item.safetyExchangeSuccessPct));

  const improved: string[] = [];
  const slipped: string[] = [];

  if (thisDrill - prevDrill >= 2) improved.push(`DrillRoom accuracy +${Math.round(thisDrill - prevDrill)}% vs last week.`);
  else if (prevWeek.length && prevDrill - thisDrill >= 2) slipped.push(`DrillRoom accuracy down ${Math.round(prevDrill - thisDrill)}%.`);

  if (thisSafety - prevSafety >= 3) improved.push(`Safety exchange success +${Math.round(thisSafety - prevSafety)}%.`);
  else if (prevWeek.length && prevSafety - thisSafety >= 3) slipped.push(`Safety exchange success dipped ${Math.round(prevSafety - thisSafety)}%.`);

  const recentSims = [...sims].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);
  if (recentSims.length) {
    const avgReadiness = Math.round(average(recentSims.map((item) => item.matchReadinessScore)));
    if (avgReadiness >= 72) improved.push(`Pressure simulator readiness holding at ${avgReadiness}.`);
    if (avgReadiness < 60) slipped.push(`Pressure simulator readiness needs work (${avgReadiness}).`);
  }

  const recentComp = [...competition].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);
  const compLosses = recentComp.filter((item) => item.result.toLowerCase().includes('loss')).length;
  if (compLosses >= 2) slipped.push('Recent competition losses indicate tactical resets needed.');

  const nextFocus: string[] = [];
  if (thisSafety < 50) nextFocus.push('Run 10 quality safety exchanges every session.');
  if (thisDrill < 70) nextFocus.push('Protect first 20 minutes for center-ball shotmaking quality.');
  if (!nextFocus.length) nextFocus.push('Maintain current load and add one high-pressure finish set.');

  const headline = thisWeek.length
    ? `Week ${weekNumber} review: ${thisWeek.length} sessions logged, keep pressing consistency.`
    : `Week ${weekNumber} review: no sessions logged yet.`;

  return {
    headline,
    improved,
    slipped,
    nextFocus,
  };
}

export function calculateTournamentReadinessScore(
  logs: DailySessionLog[],
  sims: MatchSimulatorSession[],
  confidenceHistory: ConfidenceIndexEntry[],
  recoveryPlan: RecoveryRecommendationPlan | null,
): { score: number; status: 'build' | 'close' | 'ready' } {
  const recentLogs = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
  const recentSims = [...sims].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 4);
  const confidence = confidenceHistory[0]?.score ?? 50;

  const drillScore = recentLogs.length
    ? average(recentLogs.map((item) => item.drillRoomShotmakingPct * 0.65 + item.safetyExchangeSuccessPct * 0.35))
    : 0;
  const simScore = recentSims.length
    ? average(recentSims.map((item) => item.matchReadinessScore))
    : 0;

  const recoveryPenalty = recoveryPlan?.severity === 'high' ? 10 : recoveryPlan ? 5 : 0;
  const score = Math.max(0, Math.min(100, Math.round(drillScore * 0.4 + simScore * 0.35 + confidence * 0.25 - recoveryPenalty)));

  if (score >= 75) return { score, status: 'ready' };
  if (score >= 60) return { score, status: 'close' };
  return { score, status: 'build' };
}
