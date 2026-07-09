import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import type { UserProfile } from '../types/models';

interface SettingsState {
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;
  markOnboardingComplete: () => void;
}

const defaultProfile: UserProfile = {
  id: 'default-user',
  name: '',
  currentFargoRating: 550,
  planningFargoRating: 653,
  wpbFargoLastSyncedAt: '',
  targetFargoRating: 800,
  historicalPeakFargoRating: undefined,
  yearsAwayFromCompetition: 25,
  programStartDate: new Date().toISOString().slice(0, 10),
  currentPhase: 1,
  currentWeek: 1,
  dailyReminderTime: '19:00',
  reminderEnabled: false,
  preferredBreakGame: '9-ball',
  tableSize: '9ft',
  dominantHand: 'right',
  adhdModeEnabled: false,
  onboardingComplete: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      setProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
      markOnboardingComplete: () => set((state) => ({ profile: { ...state.profile, onboardingComplete: true } })),
    }),
    {
      name: 'fargo-climb-settings',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
