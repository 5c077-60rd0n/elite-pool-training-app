import { describe, expect, it } from 'vitest';
import { buildPauseUntilIso, isPaused, shouldPauseSmartAlerts } from './notificationThrottle';

describe('notification throttling', () => {
  it('pauses alerts after three sends in 72 hours', () => {
    const now = new Date('2026-07-07T12:00:00.000Z');
    const history = [
      '2026-07-05T13:00:00.000Z',
      '2026-07-06T12:00:00.000Z',
      '2026-07-07T10:00:00.000Z',
    ];

    expect(shouldPauseSmartAlerts(history, now)).toBe(true);
  });

  it('detects pause windows correctly', () => {
    const now = new Date('2026-07-07T12:00:00.000Z');
    const pausedUntil = buildPauseUntilIso(now);
    expect(isPaused(pausedUntil, now)).toBe(true);
    expect(isPaused('2026-07-06T12:00:00.000Z', now)).toBe(false);
  });
});
