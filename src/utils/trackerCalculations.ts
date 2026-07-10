import type {
  DailySessionLog,
  FargoRatingLogEntry,
  MilestonePhaseStatus,
  MilestoneTrackerRow,
  TrackerPhaseId,
  WeeklySummary,
} from '../types/tracker';
import { phaseTargets } from '../data/trackerPlan';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function startOfWeek(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function endOfWeek(dateIso: string): string {
  const start = new Date(`${startOfWeek(dateIso)}T00:00:00`);
  start.setDate(start.getDate() + 6);
  return start.toISOString().slice(0, 10);
}

export function calculateRate(successes: number, attempts: number): number {
  if (attempts <= 0) return 0;
  return clamp((successes / attempts) * 100, 0, 100);
}

export function estimateFargo(
  currentFargo: number,
  logs: DailySessionLog[],
  ratings: FargoRatingLogEntry[],
): number {
  const official = [...ratings].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).at(-1);
  const baseline = Math.max(currentFargo, official?.newFargoRating ?? currentFargo);
  if (!logs.length) return baseline;

  const recent = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 21);
  const drillRoom = average(recent.map((item) => item.drillRoomShotmakingPct));
  const bullseye = average(recent.map((item) => item.bullseyeProximity));
  const safety = average(recent.map((item) => item.safetyExchangeSuccessPct));
  const lineup = average(recent.map((item) => item.lineUpShotCount));

  const drillRoomPoints =
    drillRoom >= 85 ? 50 : drillRoom >= 75 ? 35 : drillRoom >= 65 ? 20 : drillRoom >= 50 ? 10 : 0;
  const weeks = new Set(logs.map((item) => item.weekNumber)).size;
  const weeksPoints = weeks >= 20 ? 30 : weeks >= 12 ? 20 : weeks >= 6 ? 10 : weeks >= 2 ? 5 : 0;

  const bullseyeAdj = Math.round((3.5 - bullseye) * 4);
  const lineupAdj = lineup >= 24 ? 8 : lineup >= 18 ? 4 : 0;
  const safetyAdj = safety >= 60 ? 8 : safety >= 40 ? 4 : 0;
  return clamp(baseline + drillRoomPoints + weeksPoints + bullseyeAdj + lineupAdj + safetyAdj, 300, 850);
}

export function calculateWeeklySummary(
  logs: DailySessionLog[],
  weekNumber: number,
  existingSummaries: WeeklySummary[],
): WeeklySummary | null {
  const weekLogs = logs.filter((item) => item.weekNumber === weekNumber);
  if (!weekLogs.length) return null;

  const sorted = [...weekLogs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const avgDrillRoom = Math.round(average(weekLogs.map((item) => item.drillRoomShotmakingPct).filter((v) => v > 0)));
  const avgBullseye = Math.round(average(weekLogs.map((item) => item.bullseyeProximity).filter((v) => v > 0)));
  const lessons = weekLogs.filter((item) => item.wpbLesson === 'Yes').length;
  const lineupBest = Math.max(...weekLogs.map((item) => item.lineUpShotCount).filter((v) => v > 0));

  const prior = [...existingSummaries.filter((item) => item.weekNumber < weekNumber), {
    id: `w-${weekNumber}`,
    weekNumber,
    startDate: '',
    endDate: '',
    sessionsCompleted: 0,
    totalTrainingMinutes: 0,
    avgDrillRoomShotmakingPct: avgDrillRoom || 0,
    avgBullseyeProximityScore: avgBullseye || 0,
    wpbLessonsCompleted: lessons,
    lineUpBestScore: Number.isFinite(lineupBest) ? lineupBest : 0,
    rolling4WeekAvgDrillRoomPct: 0,
    notesAdjustments: '',
    generatedAt: '',
  }]
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .slice(-4);

  const rollingDrillRoom = Math.round(average(prior.map((item) => item.avgDrillRoomShotmakingPct).filter((v) => v > 0)));

  return {
    id: `weekly-${weekNumber}`,
    weekNumber,
    startDate: startOfWeek(sorted[0].date),
    endDate: endOfWeek(sorted[0].date),
    sessionsCompleted: weekLogs.length,
    totalTrainingMinutes: weekLogs.reduce((sum, item) => sum + item.lengthMinutes, 0),
    avgDrillRoomShotmakingPct: avgDrillRoom || 0,
    avgBullseyeProximityScore: avgBullseye || 0,
    wpbLessonsCompleted: lessons,
    lineUpBestScore: Number.isFinite(lineupBest) ? lineupBest : 0,
    rolling4WeekAvgDrillRoomPct: rollingDrillRoom || 0,
    notesAdjustments: '',
    generatedAt: new Date().toISOString(),
  };
}

export function milestoneStatusRows(
  rows: MilestoneTrackerRow[],
  estimatedFargo: number,
): MilestoneTrackerRow[] {
  return rows.map((row) => {
    const target =
      row.phase === 1 ? 600 : row.phase === 2 ? 650 : row.phase === 3 ? 700 : row.phase === 4 ? 750 : 800;
    return {
      ...row,
      status: estimatedFargo >= target ? 'Met' : 'Not Met',
    };
  });
}

export function milestonePhaseStatus(
  statuses: MilestonePhaseStatus[],
  rows: MilestoneTrackerRow[],
): MilestonePhaseStatus[] {
  return statuses.map((status) => {
    const phaseRows = rows.filter((row) => row.phase === status.phase);
    const metCount = phaseRows.filter((row) => row.status === 'Met').length;
    if (metCount === phaseRows.length && metCount > 0) {
      return { ...status, phaseStatus: 'Met' };
    }
    if (metCount > 0) {
      return { ...status, phaseStatus: 'In Progress' };
    }
    return { ...status, phaseStatus: 'Not Started' };
  });
}

export function phaseFromFargo(estimatedFargo: number): TrackerPhaseId {
  if (estimatedFargo >= phaseTargets[5]) return 5;
  if (estimatedFargo >= phaseTargets[4]) return 4;
  if (estimatedFargo >= phaseTargets[3]) return 3;
  if (estimatedFargo >= phaseTargets[2]) return 2;
  return 1;
}
