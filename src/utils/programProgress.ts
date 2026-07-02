import { differenceInCalendarDays } from './timeMath';
import type { DayOfWeek, ProgramPhaseId } from '../types/models';

export interface ProgramProgress {
  week: number;
  phase: ProgramPhaseId;
  dayKey: DayOfWeek;
}

const dayOrder: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function weekToPhase(week: number): ProgramPhaseId {
  if (week <= 13) return 1;
  if (week <= 26) return 2;
  if (week <= 39) return 3;
  return 4;
}

export function calculateProgramProgress(startDateIso: string, now = new Date()): ProgramProgress {
  const startDate = new Date(`${startDateIso}T00:00:00`);
  const elapsedDays = Math.max(0, differenceInCalendarDays(startDate, now));
  const week = Math.min(52, Math.max(1, Math.floor(elapsedDays / 7) + 1));
  return {
    week,
    phase: weekToPhase(week),
    dayKey: dayOrder[now.getDay()],
  };
}
