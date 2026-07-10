import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import { programWeeks } from '../data/program';
import { monthlyMilestones } from '../data/milestones';

interface ProgramState {
  currentWeek: number;
  setCurrentWeek: (week: number) => void;
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      currentWeek: 1,
      setCurrentWeek: (week) => set({ currentWeek: Math.max(1, Math.min(52, week)) }),
    }),
    {
      name: 'fargo-climb-program',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);

export const getProgramWeek = (week: number) =>
  programWeeks.find((item) => item.week === week) ?? programWeeks[0];

export const getMilestonesByPhase = (phase: number) =>
  monthlyMilestones.filter((item) => item.phase === phase);
