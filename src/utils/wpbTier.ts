import type { DailySessionLog, WpbRatingTier } from '../types/tracker';

export const wpbTierWeightMap: Record<WpbRatingTier, number> = {
  Beginner: 1,
  Novice: 2,
  Intermediate: 3,
  Advanced: 4,
  Shortstop: 5,
  Pro: 6,
};

export function getWpbTierWeight(tier?: WpbRatingTier): number {
  if (!tier) return 1;
  return wpbTierWeightMap[tier] ?? 1;
}

export function getWpbLessonTierPoints(log: Pick<DailySessionLog, 'wpbLesson' | 'wpbTierAchieved'>): number {
  if (log.wpbLesson !== 'Yes') return 0;
  return getWpbTierWeight(log.wpbTierAchieved);
}
