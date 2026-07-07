import { describe, expect, it } from 'vitest';
import { getWpbLessonTierPoints, getWpbTierWeight } from './wpbTier';

describe('wpbTier helpers', () => {
  it('maps tiers to ascending weights', () => {
    expect(getWpbTierWeight('Beginner')).toBe(1);
    expect(getWpbTierWeight('Intermediate')).toBe(3);
    expect(getWpbTierWeight('Pro')).toBe(6);
  });

  it('returns weighted lesson points only when WPB lesson is logged', () => {
    expect(getWpbLessonTierPoints({ wpbLesson: 'No', wpbTierAchieved: 'Pro' })).toBe(0);
    expect(getWpbLessonTierPoints({ wpbLesson: 'Yes', wpbTierAchieved: 'Advanced' })).toBe(4);
    expect(getWpbLessonTierPoints({ wpbLesson: 'Yes', wpbTierAchieved: undefined })).toBe(1);
  });
});
