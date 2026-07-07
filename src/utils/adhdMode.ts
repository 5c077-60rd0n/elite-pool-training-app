import type { DailySessionLog } from '../types/tracker';

export type AdhdSessionMode = 'quick' | 'standard' | 'recovery';

function toEpochDay(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00`);
  if (Number.isNaN(parsed)) return 0;
  return Math.floor(parsed / (24 * 60 * 60 * 1000));
}

export function getAdhdSessionMode(
  logs: DailySessionLog[],
  nowIso: string,
): AdhdSessionMode {
  if (!logs.length) return 'standard';

  const sorted = [...logs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const currentDay = toEpochDay(nowIso);
  const last = sorted[sorted.length - 1];
  const daysIdle = Math.max(0, currentDay - toEpochDay(last.date));

  const recent10 = sorted.filter((item) => currentDay - toEpochDay(item.date) <= 10);
  const shortSessions = recent10.filter((item) => item.lengthMinutes > 0 && item.lengthMinutes < 20).length;
  if (daysIdle >= 2 || shortSessions >= 3) return 'recovery';

  const recent3 = sorted.slice(-3);
  const recentShortStreak = recent3.length >= 2 && recent3.slice(-2).every((item) => item.lengthMinutes > 0 && item.lengthMinutes < 35);
  if (daysIdle >= 1 || recentShortStreak) return 'quick';

  return 'standard';
}

export function getAdhdModeRecommendedMinutes(mode: AdhdSessionMode): number {
  if (mode === 'quick') return 25;
  if (mode === 'recovery') return 15;
  return 60;
}

export function getAdhdRecommendationLimit(adhdModeEnabled: boolean): number {
  return adhdModeEnabled ? 3 : Number.POSITIVE_INFINITY;
}
