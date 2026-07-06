import type {
  AdaptiveDailyPlan,
  CompetitionLogEntry,
  DailySessionLog,
  RecoveryRecommendationPlan,
} from '../types/tracker';

export interface SmartSessionAutofillSuggestion {
  focusArea: string;
  lengthMinutes: number;
  drillRoomShotmakingPct: number;
  ghostDrillWinRatePct: number;
  safetyExchangeSuccessPct: number;
  lineUpShotCount: number;
  bullseyeProximity: number;
  rationale: string;
  fatigueLevel: 'low' | 'medium' | 'high';
  upcomingEvent?: {
    name: string;
    daysOut: number;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function findUpcomingEvent(competitionLog: CompetitionLogEntry[]): { name: string; daysOut: number } | undefined {
  const now = Date.now();
  const upcoming = competitionLog
    .map((item) => ({ ...item, daysOut: Math.round((Date.parse(item.date) - now) / 86_400_000) }))
    .filter((item) => Number.isFinite(item.daysOut) && item.daysOut >= 0)
    .sort((a, b) => a.daysOut - b.daysOut)[0];

  if (!upcoming) return undefined;
  return {
    name: upcoming.eventName,
    daysOut: upcoming.daysOut,
  };
}

function fatigueFromRecent(logs: DailySessionLog[]): 'low' | 'medium' | 'high' {
  const recent = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 4);
  if (recent.length < 2) return 'low';

  const avgMinutes = avg(recent.map((item) => item.lengthMinutes));
  const accuracyTrend = recent[0].drillRoomShotmakingPct - recent[recent.length - 1].drillRoomShotmakingPct;
  const safetyTrend = recent[0].safetyExchangeSuccessPct - recent[recent.length - 1].safetyExchangeSuccessPct;

  const dipSignal = accuracyTrend < -6 || safetyTrend < -6;
  const loadSignal = avgMinutes >= 95;
  const mediumSignal = avgMinutes >= 80 || accuracyTrend < -3;

  if (loadSignal && dipSignal) return 'high';
  if (mediumSignal || dipSignal) return 'medium';
  return 'low';
}

export function generateSmartSessionAutofill(
  logs: DailySessionLog[],
  adaptiveDailyPlan: AdaptiveDailyPlan | null,
  recoveryRecommendationPlan: RecoveryRecommendationPlan | null,
  competitionLog: CompetitionLogEntry[],
): SmartSessionAutofillSuggestion {
  const fatigueLevel = fatigueFromRecent(logs);
  const upcomingEvent = findUpcomingEvent(competitionLog);
  const latest = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];

  const baseMinutes = adaptiveDailyPlan?.recommendedMinutes ?? latest?.lengthMinutes ?? 75;
  const target = adaptiveDailyPlan?.targetMetrics;

  let lengthMinutes = baseMinutes;
  if (fatigueLevel === 'high') lengthMinutes = Math.round(baseMinutes * 0.78);
  if (fatigueLevel === 'medium') lengthMinutes = Math.round(baseMinutes * 0.9);
  if (upcomingEvent && upcomingEvent.daysOut <= 2) {
    lengthMinutes = Math.min(lengthMinutes, 65);
  }

  if (recoveryRecommendationPlan?.severity === 'high') {
    lengthMinutes = Math.min(lengthMinutes, 60);
  }

  const taperBoost = upcomingEvent && upcomingEvent.daysOut <= 4 ? 3 : 0;

  const drillRoomShotmakingPct = clamp(
    Math.round((target?.drillRoomShotmakingPct ?? latest?.drillRoomShotmakingPct ?? 60) + taperBoost),
    0,
    100,
  );
  const ghostDrillWinRatePct = clamp(
    Math.round((target?.ghostDrillWinRatePct ?? latest?.ghostDrillWinRatePct ?? 35) + taperBoost),
    0,
    100,
  );
  const safetyExchangeSuccessPct = clamp(
    Math.round((target?.safetyExchangeSuccessPct ?? latest?.safetyExchangeSuccessPct ?? 45) + taperBoost),
    0,
    100,
  );
  const lineUpShotCount = Math.max(0, Math.round(target?.lineUpShotCount ?? latest?.lineUpShotCount ?? 18));
  const bullseyeProximity = Math.max(0, Number((target?.bullseyeProximity ?? latest?.bullseyeProximity ?? 3.5).toFixed(1)));

  const rationaleParts: string[] = [];
  rationaleParts.push(`Fatigue profile: ${fatigueLevel}.`);
  if (adaptiveDailyPlan?.focusKpiName) {
    rationaleParts.push(`Priority KPI: ${adaptiveDailyPlan.focusKpiName}.`);
  }
  if (upcomingEvent) {
    rationaleParts.push(`Upcoming event in ${upcomingEvent.daysOut} days: ${upcomingEvent.name}.`);
  }
  if (recoveryRecommendationPlan) {
    rationaleParts.push(`Recovery protocol active (${recoveryRecommendationPlan.severity}).`);
  }

  return {
    focusArea: adaptiveDailyPlan?.focusKpiName ?? latest?.focusArea ?? 'Execution consistency',
    lengthMinutes: clamp(lengthMinutes, 40, 120),
    drillRoomShotmakingPct,
    ghostDrillWinRatePct,
    safetyExchangeSuccessPct,
    lineUpShotCount,
    bullseyeProximity,
    rationale: rationaleParts.join(' '),
    fatigueLevel,
    upcomingEvent,
  };
}
