import type {
  CoachReviewExportPayload,
  CompetitionLogEntry,
  ConfidenceIndexEntry,
  DailySessionLog,
  PersonalRecord,
  WeeklySummary,
} from '../types/tracker';

interface CoachExportInput {
  athlete: {
    name: string;
    currentFargoRating: number;
    targetFargoRating: number;
    currentWeek: number;
  };
  logs: DailySessionLog[];
  weeklySummaries: WeeklySummary[];
  competitionLog: CompetitionLogEntry[];
  confidenceIndexHistory: ConfidenceIndexEntry[];
  personalRecords: PersonalRecord[];
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildCoachReviewExport(input: CoachExportInput): CoachReviewExportPayload {
  const recentLogs = [...input.logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 7);
  const orderedRecent = [...recentLogs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const latestWeeklySummary = [...input.weeklySummaries].sort((a, b) => b.weekNumber - a.weekNumber)[0];
  const recentCompetition = [...input.competitionLog]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 8);

  const wins = recentCompetition.filter((entry) => entry.result.toLowerCase() === 'win').length;
  const losses = recentCompetition.filter((entry) => entry.result.toLowerCase() !== 'win').length;

  const recentKpis = {
    drillRoomShotmakingPct: avg(recentLogs.map((item) => item.drillRoomShotmakingPct)),
    safetyExchangeSuccessPct: avg(recentLogs.map((item) => item.safetyExchangeSuccessPct)),
    lineUpShotCount: avg(recentLogs.map((item) => item.lineUpShotCount)),
    wpbLessonsCompleted: recentLogs.filter((item) => item.wpbLesson === 'Yes').length,
  };

  const focusPriorities: string[] = [];
  if (recentKpis.drillRoomShotmakingPct < 72) focusPriorities.push('Raise DrillRoom shotmaking above 72% under timed sets.');
  if (recentKpis.safetyExchangeSuccessPct < 60)
    focusPriorities.push('Prioritize first-safe quality and kick-distance management.');
  if (!focusPriorities.length)
    focusPriorities.push('Maintain current baseline and sharpen pressure execution before events.');

  const coachNotes = [
    `Sessions in window: ${recentLogs.length}.`,
    `Competition snapshot (last ${recentCompetition.length}): ${wins} wins / ${losses} losses.`,
    `Current Fargo ${input.athlete.currentFargoRating} targeting ${input.athlete.targetFargoRating}.`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    athlete: input.athlete,
    period: {
      startDate: orderedRecent[0]?.date,
      endDate: orderedRecent.at(-1)?.date,
      sessionCount: recentLogs.length,
    },
    weeklySummary: latestWeeklySummary,
    recentKpis,
    competitionSnapshot: {
      eventsPlayed: recentCompetition.length,
      wins,
      losses,
      latestEvent: recentCompetition[0]?.eventName,
    },
    confidenceIndex: input.confidenceIndexHistory[0],
    personalRecords: input.personalRecords.slice(0, 8),
    focusPriorities,
    coachNotes,
  };
}
