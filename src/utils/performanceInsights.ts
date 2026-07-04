import type {
  CompetitionLogEntry,
  ConfidenceIndexComponents,
  ConfidenceIndexEntry,
  DailySessionLog,
  MatchSimulatorSession,
  PersonalRecord,
} from '../types/tracker';

interface PerformanceInsightsInput {
  logs: DailySessionLog[];
  competitionLog: CompetitionLogEntry[];
  matchSimSessions: MatchSimulatorSession[];
}

interface PerformanceInsightsResult {
  personalRecords: PersonalRecord[];
  confidenceIndex: ConfidenceIndexEntry;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function latestDate(dates: string[]): string {
  if (!dates.length) return new Date().toISOString().slice(0, 10);
  return [...dates].sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

function findBestLog(
  logs: DailySessionLog[],
  selector: (log: DailySessionLog) => number,
): DailySessionLog | undefined {
  return [...logs].sort((a, b) => selector(b) - selector(a))[0];
}

function personalRecordsFromLogs(logs: DailySessionLog[]): PersonalRecord[] {
  if (!logs.length) return [];

  const bestDrillRoom = findBestLog(logs, (log) => log.drillRoomShotmakingPct);
  const bestGhost = findBestLog(logs, (log) => log.ghostDrillWinRatePct);
  const bestSafety = findBestLog(logs, (log) => log.safetyExchangeSuccessPct);
  const bestLineUp = findBestLog(logs, (log) => log.lineUpShotCount);

  const records: PersonalRecord[] = [];
  if (bestDrillRoom) {
    records.push({
      id: 'pr-drillroom',
      label: 'Best DrillRoom Accuracy',
      value: bestDrillRoom.drillRoomShotmakingPct,
      unit: '%',
      achievedAt: bestDrillRoom.date,
      source: 'training',
    });
  }
  if (bestGhost) {
    records.push({
      id: 'pr-ghost',
      label: 'Best Ghost Drill Win Rate',
      value: bestGhost.ghostDrillWinRatePct,
      unit: '%',
      achievedAt: bestGhost.date,
      source: 'training',
    });
  }
  if (bestSafety) {
    records.push({
      id: 'pr-safety',
      label: 'Best Safety Exchange Success',
      value: bestSafety.safetyExchangeSuccessPct,
      unit: '%',
      achievedAt: bestSafety.date,
      source: 'training',
    });
  }
  if (bestLineUp) {
    records.push({
      id: 'pr-lineup',
      label: 'Best Line-Up Count',
      value: bestLineUp.lineUpShotCount,
      unit: 'balls',
      achievedAt: bestLineUp.date,
      source: 'training',
    });
  }

  return records;
}

function personalRecordFromSims(matchSimSessions: MatchSimulatorSession[]): PersonalRecord[] {
  if (!matchSimSessions.length) return [];
  const bestMatchReadiness = [...matchSimSessions].sort(
    (a, b) => b.matchReadinessScore - a.matchReadinessScore,
  )[0];
  const bestPressureExecution = [...matchSimSessions].sort((a, b) => {
    const aPct = a.pressureShotsAttempted > 0 ? (a.pressureShotsMade / a.pressureShotsAttempted) * 100 : 0;
    const bPct = b.pressureShotsAttempted > 0 ? (b.pressureShotsMade / b.pressureShotsAttempted) * 100 : 0;
    return bPct - aPct;
  })[0];

  const records: PersonalRecord[] = [];
  records.push({
    id: 'pr-match-readiness',
    label: 'Best Match Readiness',
    value: bestMatchReadiness.matchReadinessScore,
    unit: 'score',
    achievedAt: bestMatchReadiness.date,
    source: 'simulation',
  });

  const pressurePct =
    bestPressureExecution.pressureShotsAttempted > 0
      ? (bestPressureExecution.pressureShotsMade / bestPressureExecution.pressureShotsAttempted) * 100
      : 0;
  records.push({
    id: 'pr-pressure-execution',
    label: 'Best Pressure Execution',
    value: Math.round(pressurePct),
    unit: '%',
    achievedAt: bestPressureExecution.date,
    source: 'simulation',
  });

  return records;
}

function calculateConfidenceComponents(input: PerformanceInsightsInput): ConfidenceIndexComponents {
  const recentLogs = [...input.logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 7);
  const activeDays = new Set(recentLogs.map((log) => log.date)).size;
  const trainingConsistency = clampScore((activeDays / 7) * 100);

  const recentSims = [...input.matchSimSessions]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5);
  const matchReadiness = recentSims.length
    ? clampScore(
        recentSims.reduce((sum, sim) => sum + sim.matchReadinessScore, 0) /
          Math.max(1, recentSims.length),
      )
    : 0;

  const recentCompetition = [...input.competitionLog]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5);
  const wins = recentCompetition.filter((entry) => entry.result.toLowerCase() === 'win').length;
  const recentResults = recentCompetition.length
    ? clampScore((wins / recentCompetition.length) * 100)
    : 50;

  const pressureExecution = recentSims.length
    ? clampScore(
        (recentSims.reduce((sum, sim) => {
          if (sim.pressureShotsAttempted <= 0) return sum;
          return sum + (sim.pressureShotsMade / sim.pressureShotsAttempted) * 100;
        }, 0) / recentSims.length) * 1,
      )
    : 0;

  return {
    trainingConsistency,
    matchReadiness,
    recentResults,
    pressureExecution,
  };
}

function confidenceRationale(components: ConfidenceIndexComponents): string {
  const strongest = Object.entries(components).sort((a, b) => b[1] - a[1])[0];
  const weakest = Object.entries(components).sort((a, b) => a[1] - b[1])[0];
  return `Strongest: ${strongest[0]} (${strongest[1]}). Focus next: ${weakest[0]} (${weakest[1]}).`;
}

export function buildPerformanceInsights(input: PerformanceInsightsInput): PerformanceInsightsResult {
  const personalRecords = [
    ...personalRecordsFromLogs(input.logs),
    ...personalRecordFromSims(input.matchSimSessions),
  ].sort((a, b) => b.value - a.value);

  const components = calculateConfidenceComponents(input);
  const score = clampScore(
    components.trainingConsistency * 0.3 +
      components.matchReadiness * 0.35 +
      components.recentResults * 0.2 +
      components.pressureExecution * 0.15,
  );

  const confidenceIndex: ConfidenceIndexEntry = {
    id: `confidence-${Date.now()}`,
    date: latestDate([
      ...input.logs.map((log) => log.date),
      ...input.competitionLog.map((entry) => entry.date),
      ...input.matchSimSessions.map((entry) => entry.date),
    ]),
    score,
    components,
    rationale: confidenceRationale(components),
  };

  return {
    personalRecords,
    confidenceIndex,
  };
}
