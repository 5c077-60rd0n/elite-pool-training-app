import { describe, expect, it } from 'vitest';
import { getTrackerGamificationSnapshot } from './trackerGamification';
import type { DailySessionLog } from '../types/tracker';

function session(id: string, date: string, focusArea: string, qualitySeed = 0): DailySessionLog {
  return {
    id,
    date,
    dayOfWeek: 'Monday',
    weekNumber: 1,
    focusArea,
    lengthMinutes: 90,
    drillRoomShotmakingPct: 76 + qualitySeed,
    bullseyeProximity: 2.0,
    bullseyeCategory: 'Mixed',
    wpbLesson: 'Yes',
    wpbCategory: 'Fundamentals',
    wpbModuleName: 'Module',
    wpbTierAchieved: 'Intermediate',
    ghostDrillPlayed: 'Yes',
    lineUpShotCount: 16,
    safetyExchangeSuccessPct: 68,
    pressureAttempts: 0,
    pressureSuccessPct: 0,
    bankKickAttempts: 0,
    bankKickSuccessPct: 0,
    jumpShotAttempts: 0,
    jumpShotSuccessPct: 0,
    safetyAttempts: 0,
    safetySuccessPct: 0,
    notes: '',
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

describe('getTrackerGamificationSnapshot seasonal data', () => {
  it('returns season metadata and challenge structures', () => {
    const logs = [
      session('a', '2026-07-01', 'Pattern Play', 2),
      session('b', '2026-07-02', 'Safety', 3),
      session('c', '2026-07-03', 'Break', 4),
    ];

    const snapshot = getTrackerGamificationSnapshot(logs, new Date('2026-07-04T00:00:00.000Z'));

    expect(snapshot.seasonMeta.id).toContain('Q3');
    expect(snapshot.seasonChallenges.themedQuestChain.length).toBe(3);
    expect(snapshot.seasonChallenges.bossChallenges.length).toBe(2);
  });

  it('marks challenge progress based on quality and variety', () => {
    const logs = [
      session('a', '2026-07-01', 'Pattern Play', 24),
      session('b', '2026-07-02', 'Safety', 24),
      session('c', '2026-07-03', 'Break', 24),
      session('d', '2026-07-04', 'Mental Game', 24),
      session('e', '2026-07-05', 'Pattern Play', 24),
    ];

    const snapshot = getTrackerGamificationSnapshot(logs, new Date('2026-07-05T00:00:00.000Z'));
    const qualityCadence = snapshot.seasonChallenges.themedQuestChain.find(
      (item) => item.id === 'season-quality-cadence',
    );
    const variety = snapshot.seasonChallenges.themedQuestChain.find(
      (item) => item.id === 'season-variety-run',
    );

    expect(qualityCadence?.completed).toBe(true);
    expect(variety?.progress).toBeGreaterThanOrEqual(4);
  });

  it('awards more progression for higher WPB tier achievements', () => {
    const beginnerLog = session('a', '2026-07-01', 'Pattern Play', 3);
    beginnerLog.wpbTierAchieved = 'Beginner';

    const proLog = session('b', '2026-07-02', 'Pattern Play', 3);
    proLog.wpbTierAchieved = 'Pro';

    const beginnerSnapshot = getTrackerGamificationSnapshot([beginnerLog], new Date('2026-07-03T00:00:00.000Z'));
    const proSnapshot = getTrackerGamificationSnapshot([proLog], new Date('2026-07-03T00:00:00.000Z'));

    expect((proSnapshot.latestSession?.xpEarned ?? 0)).toBeGreaterThan(beginnerSnapshot.latestSession?.xpEarned ?? 0);
  });

  it('awards protocol and triad bonuses for aligned sessions', () => {
    const aligned = session('aligned', '2026-07-06', 'Pattern Play', 4);
    aligned.lengthMinutes = 45;
    aligned.ghostDrillPlayed = 'Yes';
    aligned.wpbLesson = 'Yes';

    const offProtocol = session('off', '2026-07-07', 'Pattern Play', 4);
    offProtocol.lengthMinutes = 95;
    offProtocol.ghostDrillPlayed = 'No';
    offProtocol.wpbLesson = 'No';

    const alignedSnapshot = getTrackerGamificationSnapshot([aligned], new Date('2026-07-08T00:00:00.000Z'));
    const offSnapshot = getTrackerGamificationSnapshot([offProtocol], new Date('2026-07-08T00:00:00.000Z'));

    expect(alignedSnapshot.latestSession?.bonusTags).toContain('Training triad');
    expect(alignedSnapshot.latestSession?.bonusTags).toContain('Protocol adherence');
    expect((alignedSnapshot.latestSession?.xpEarned ?? 0)).toBeGreaterThan(offSnapshot.latestSession?.xpEarned ?? 0);
  });

  it('does not over-reward zero bullseye proximity defaults', () => {
    const realistic = session('real', '2026-07-08', 'Pattern Play', 2);
    realistic.bullseyeProximity = 2.0;

    const defaultZero = session('zero', '2026-07-09', 'Pattern Play', 2);
    defaultZero.bullseyeProximity = 0;

    const realisticSnapshot = getTrackerGamificationSnapshot([realistic], new Date('2026-07-10T00:00:00.000Z'));
    const zeroSnapshot = getTrackerGamificationSnapshot([defaultZero], new Date('2026-07-10T00:00:00.000Z'));

    expect((zeroSnapshot.latestSession?.qualityScore ?? 0)).toBeLessThanOrEqual(realisticSnapshot.latestSession?.qualityScore ?? 0);
  });
});
