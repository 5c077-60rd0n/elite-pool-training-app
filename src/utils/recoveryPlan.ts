import { weeklyScheduleTemplate } from '../data/trackerPlan';
import type {
  AdaptiveDailyPlan,
  CompetitionLogEntry,
  DailySessionLog,
  RecoveryRecommendationPlan,
} from '../types/tracker';

function dayName(value = new Date()): string {
  return value.toLocaleDateString('en-US', { weekday: 'long' });
}

function tomorrowIso(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function containsLossSignal(result: string): boolean {
  const value = result.trim().toLowerCase();
  return value.includes('loss') || value.includes('lost') || value.includes('mixed');
}

function defaultActionsForKpi(kpiId: string): string[] {
  if (kpiId === 'ghost-drill-win-rate') {
    return [
      'Open with two short-race ghost sets focused on break-to-first-shot patterns.',
      'Run one pressure set with score penalty for missed starter balls.',
      'Finish with a 10-minute pattern recap and one tactical note.',
    ];
  }

  if (kpiId === 'safety-exchange-success') {
    return [
      'Start with 20 minutes of safety-to-kick response exchanges.',
      'Track no-shot outcomes and force 10 high-quality safety reps.',
      'Close with one race simulation emphasizing first safety choice.',
    ];
  }

  if (kpiId === 'lineup-efficiency') {
    return [
      'Run three timed line-up sets and record best shot count.',
      'Reset after every miss and repeat from the same layout once.',
      'Finish with one pressure line-up set at tournament pace.',
    ];
  }

  if (kpiId === 'bullseye-proximity') {
    return [
      'Run 25 focused Bullseye reps on weakest spin category.',
      'Track average proximity and note one recurring miss pattern.',
      'Close with 10 mixed-category pressure reps.',
    ];
  }

  if (kpiId === 'wpb-lessons-weekly') {
    return [
      'Complete one WPB lesson segment before table work.',
      'Apply lesson concept in a 15-minute guided drill block.',
      'Log one implementation note tied to match situations.',
    ];
  }

  return [
    'Open with a 20-minute quality block on the weakest KPI.',
    'Run one pressure-set simulation with score tracking.',
    'Capture one concrete adjustment for the next session.',
  ];
}

function weakSessionSignal(log: DailySessionLog): boolean {
  return (
    log.drillRoomShotmakingPct < 60 ||
    log.ghostDrillWinRatePct < 40 ||
    log.safetyExchangeSuccessPct < 45 ||
    log.lineUpShotCount > 22
  );
}

export function generateRecoveryRecommendation(
  logs: DailySessionLog[],
  competitionLog: CompetitionLogEntry[],
  adaptivePlan: AdaptiveDailyPlan | null,
): RecoveryRecommendationPlan | null {
  const latestLog = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  const latestCompetition = [...competitionLog].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];

  const weakSession = latestLog ? weakSessionSignal(latestLog) : false;
  const competitionLoss = latestCompetition ? containsLossSignal(latestCompetition.result) : false;

  if (!weakSession && !competitionLoss) {
    return null;
  }

  const trigger = weakSession && competitionLoss ? 'mixed' : weakSession ? 'weak-session' : 'competition-loss';
  const severity = trigger === 'mixed' ? 'high' : 'medium';

  const focusKpiId = adaptivePlan?.focusKpiId ?? 'ghost-drill-win-rate';
  const focusKpiName = adaptivePlan?.focusKpiName ?? 'Ghost Drill Win Rate';

  const tomorrowFocus = weeklyScheduleTemplate.find((item) => item.day === dayName())?.focusArea;
  const recommendedFocusArea = tomorrowFocus ?? focusKpiName;

  const rationaleParts: string[] = [];
  if (weakSession) {
    rationaleParts.push('Recent session metrics fell below baseline targets.');
  }
  if (competitionLoss) {
    rationaleParts.push('Latest competition result suggests tactical recovery is needed.');
  }

  const target = adaptivePlan?.targetMetrics;

  return {
    id: `recovery-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    forDate: tomorrowIso(),
    horizonDays: 3,
    trigger,
    severity,
    focusKpiId,
    focusKpiName,
    recommendedFocusArea,
    rationale: rationaleParts.join(' '),
    actions: defaultActionsForKpi(focusKpiId),
    checkpointMetrics: {
      drillRoomShotmakingPct: target?.drillRoomShotmakingPct ?? 65,
      ghostDrillWinRatePct: target?.ghostDrillWinRatePct ?? 45,
      safetyExchangeSuccessPct: target?.safetyExchangeSuccessPct ?? 50,
      lineUpShotCount: target?.lineUpShotCount ?? 20,
    },
  };
}
