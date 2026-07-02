import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import type { DrillResult } from '../types/models';

interface SessionState {
  activeDate: string;
  activeFocus: string;
  drillResults: DrillResult[];
  isComplete: boolean;
  sessionNotes: string;
  saveDrillResult: (result: DrillResult) => void;
  setSessionNotes: (notes: string) => void;
  markComplete: () => void;
  resetSession: () => void;
}

const today = new Date().toISOString().slice(0, 10);

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeDate: today,
      activeFocus: 'Stroke & Mechanics',
      drillResults: [],
      isComplete: false,
      sessionNotes: '',
      saveDrillResult: (result) =>
        set((state) => ({
          drillResults: [...state.drillResults.filter((entry) => entry.drillId !== result.drillId), result],
        })),
      setSessionNotes: (notes) => set({ sessionNotes: notes }),
      markComplete: () => set({ isComplete: true }),
      resetSession: () =>
        set({
          activeDate: new Date().toISOString().slice(0, 10),
          drillResults: [],
          isComplete: false,
          sessionNotes: '',
        }),
    }),
    {
      name: 'fargo-climb-session',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
