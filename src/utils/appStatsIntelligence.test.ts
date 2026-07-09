import { describe, expect, it } from 'vitest';
import type { DailySessionLog } from '../types/tracker';
import { createPostSessionCoachVerdict, scoreSessionApps } from './appStatsIntelligence';

function log(id: string, date: string): DailySessionLog {
  return {
    id,
    date,
    dayOfWeek: 'Wednesday',
    weekNumber: 1,
    focusArea: 'Triad Work',
    lengthMinutes: 45,
    drillRoomShotmakingPct: 70,
    bullseyeProximity: 2.4,
    bullseyeCategory: 'Mixed',
    drillRoomDrillName: 'Center-Ball Straight Shots',
    wpbLesson: 'Yes',
    wpbCategory: 'Position Play & Runouts',
    wpbModuleName: 'Progressive Rotation Runouts',
    wpbTierAchieved: 'Intermediate',
    ghostDrillPlayed: 'Yes',
    ghostDrillWinRatePct: 52,
    lineUpShotCount: 18,
    safetyExchangeSuccessPct: 57,
    notes: '',
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
    appStats: {
      drillRoom: {
        attempts: 20,
        score: 0.6,
        pocketingPct: 95,
        positioningPct: 66,
      },
      bullseye: {
        successfulAttempts: 42,
        totalAttempts: 69,
        shortRangePct: 90,
        midRangePct: 50,
        longRangePct: 53,
      },
      wpb: {
        highestScore: 6,
        currentAvgScore: 5,
        avgPracticeMinutes: 15.2,
      },
    },
  };
}

describe('app stats intelligence', () => {
  it('scores all app channels and transfer', () => {
    const scores = scoreSessionApps(log('a', '2026-07-09'));
    expect(scores.drillRoom).toBeGreaterThan(0);
    expect(scores.bullseye).toBeGreaterThan(0);
    expect(scores.wpb).toBeGreaterThan(0);
    expect(scores.transfer).toBeGreaterThan(0);
  });

  it('creates a verdict with exact next target', () => {
    const logs = [
      log('a', '2026-06-30'),
      log('b', '2026-07-02'),
      log('c', '2026-07-04'),
      log('d', '2026-07-06'),
      log('e', '2026-07-09'),
    ];

    logs[4].appStats!.wpb!.currentAvgScore = 3.2;

    const verdict = createPostSessionCoachVerdict(logs, new Date('2026-07-09T00:00:00.000Z'));

    expect(verdict).not.toBeNull();
    expect(verdict?.nextTarget.length).toBeGreaterThan(10);
    expect(verdict?.trendSignals.length).toBe(4);
  });
});
