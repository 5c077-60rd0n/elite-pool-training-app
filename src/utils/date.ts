import type { DayOfWeek } from '../types/models';

const map: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function getTodayDayKey(date = new Date()): DayOfWeek {
  return map[date.getDay()];
}

export function formatClockTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
