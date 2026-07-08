import { describe, expect, it } from 'vitest';
import { getAdhdModeRecommendedMinutes, getAdhdSessionMode } from './adhdMode';
import type { DailySessionLog } from '../types/tracker';

function log(id: string, date: string, lengthMinutes = 60): DailySessionLog {
  return {
    id,
    date,
    dayOfWeek: 'Monday',
    weekNumber: 1,
    focusArea: 'Pattern Play',
    lengthMinutes,
    drillRoomShotmakingPct: 75,
    bullseyeProximity: 2.5,
    bullseyeCategory: 'Mixed',
    wpbLesson: 'Yes',
    wpbCategory: 'Fundamentals',
    wpbModuleName: 'Module',
    ghostDrillPlayed: 'Yes',
    ghostDrillWinRatePct: 55,
    lineUpShotCount: 15,
    safetyExchangeSuccessPct: 60,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
  };
}

describe('adhd mode session logic', () => {
  it('selects recovery mode after two idle days', () => {
    const logs = [log('a', '2026-07-01', 60)];
    expect(getAdhdSessionMode(logs, '2026-07-03')).toBe('recovery');
  });

  it('selects quick mode after one idle day', () => {
    const logs = [log('a', '2026-07-01', 60)];
    expect(getAdhdSessionMode(logs, '2026-07-02')).toBe('quick');
  });

  it('provides mode-based recommended minutes', () => {
    expect(getAdhdModeRecommendedMinutes('quick')).toBe(25);
    expect(getAdhdModeRecommendedMinutes('recovery')).toBe(15);
    expect(getAdhdModeRecommendedMinutes('standard')).toBe(60);
  });
});
