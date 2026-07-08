import type { DailySessionLog, WpbCategory, WpbRatingTier } from '../types/tracker';

export const wpbTierWeightMap: Record<WpbRatingTier, number> = {
  Beginner: 1,
  Novice: 2,
  Intermediate: 3,
  Advanced: 4,
  Shortstop: 5,
  Pro: 6,
};

export const wpbCategoryWeightMap: Record<WpbCategory, number> = {
  Fundamentals: 1,
  'Aiming & Shotmaking': 1,
  'Cue Ball Control': 1,
  'Position Play & Runouts': 2,
  Defense: 2,
  'Jump Shots': 2,
};

export function getWpbTierWeight(tier?: WpbRatingTier): number {
  if (!tier) return 1;
  return wpbTierWeightMap[tier] ?? 1;
}

export function getWpbLessonTierPoints(log: Pick<DailySessionLog, 'wpbLesson' | 'wpbTierAchieved' | 'wpbCategory'>): number {
  if (log.wpbLesson !== 'Yes') return 0;
  const tierWeight = getWpbTierWeight(log.wpbTierAchieved);
  const categoryWeight = log.wpbCategory ? wpbCategoryWeightMap[log.wpbCategory] ?? 1 : 1;
  return tierWeight + categoryWeight - 1;
}
