import { describe, expect, it } from 'vitest';
import { buildPerformanceInsights } from './performanceInsights';
import type { CompetitionLogEntry, DailySessionLog, MatchSimulatorSession } from '../types/tracker';

function sampleLog(id: string, date: string, focusArea: string, overrides: Partial<DailySessionLog> = {}): DailySessionLog {
  return {
    id,
    date,
    dayOfWeek: 'Monday',
    weekNumber: 1,
    focusArea,
    lengthMinutes: 75,
    drillRoomShotmakingPct: 78,
    bullseyeProximity: 2.1,
    bullseyeCategory: 'Mixed',
    wpbLesson: 'Yes',
    wpbCategory: 'Fundamentals',
    wpbModuleName: 'Core Pattern',
    ghostDrillPlayed: 'Yes',
    ghostDrillWinRatePct: 61,
    lineUpShotCount: 18,
    safetyExchangeSuccessPct: 66,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    ...overrides,
  };
}

function sampleCompetition(id: string, date: string, result: string): CompetitionLogEntry {
  return {
    id,
    date,
    eventName: `Event ${id}`,
    format: 'Race to 7',
    result,
    notes: '',
  };
}

function sampleSim(id: string, date: string, overrides: Partial<MatchSimulatorSession> = {}): MatchSimulatorSession {
  return {
    id,
    date,
    opponentArchetype: 'Aggressive breaker',
    raceTo: 7,
    inningsPlayed: 12,
    breaksMade: 8,
    breakAndRuns: 3,
    safetyWins: 4,
    pressureLevel: 'high',
    pressureShotsMade: 6,
    pressureShotsAttempted: 8,
    hillHillResult: 'N/A',
    result: 'Win',
    matchReadinessScore: 84,
    drillReadinessScore: 74,
    notes: '',
    createdAt: `${date}T11:00:00.000Z`,
    ...overrides,
  };
}

describe('buildPerformanceInsights', () => {
  it('derives personal records across training and simulation data', () => {
    const logs: DailySessionLog[] = [
      sampleLog('l1', '2026-07-01', 'Pattern Play', { drillRoomShotmakingPct: 80 }),
      sampleLog('l2', '2026-07-02', 'Safety', { ghostDrillWinRatePct: 65, lineUpShotCount: 14 }),
    ];
    const competition: CompetitionLogEntry[] = [sampleCompetition('c1', '2026-07-02', 'Win')];
    const sims: MatchSimulatorSession[] = [sampleSim('s1', '2026-07-03', { matchReadinessScore: 90 })];

    const result = buildPerformanceInsights({
      logs,
      competitionLog: competition,
      matchSimSessions: sims,
    });

    expect(result.personalRecords.length).toBeGreaterThanOrEqual(5);
    expect(result.personalRecords.some((record) => record.id === 'pr-match-readiness')).toBe(true);
  });

  it('builds a bounded confidence score with rationale text', () => {
    const logs: DailySessionLog[] = [
      sampleLog('l1', '2026-06-28', 'Pattern Play'),
      sampleLog('l2', '2026-06-29', 'Safety'),
      sampleLog('l3', '2026-06-30', 'Break'),
      sampleLog('l4', '2026-07-01', 'Mental Game'),
      sampleLog('l5', '2026-07-02', 'Pattern Play'),
    ];
    const competition: CompetitionLogEntry[] = [
      sampleCompetition('c1', '2026-07-01', 'Win'),
      sampleCompetition('c2', '2026-07-02', 'Loss'),
    ];
    const sims: MatchSimulatorSession[] = [sampleSim('s1', '2026-07-02')];

    const result = buildPerformanceInsights({
      logs,
      competitionLog: competition,
      matchSimSessions: sims,
    });

    expect(result.confidenceIndex.score).toBeGreaterThanOrEqual(0);
    expect(result.confidenceIndex.score).toBeLessThanOrEqual(100);
    expect(result.confidenceIndex.rationale.length).toBeGreaterThan(10);
  });
});
