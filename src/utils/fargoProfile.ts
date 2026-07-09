import type { UserProfile } from '../types/models';

export function getActiveTrainingFargo(profile: UserProfile): number {
  const planning = profile.planningFargoRating;
  return Number.isFinite(planning) ? Math.round(planning as number) : profile.currentFargoRating;
}
