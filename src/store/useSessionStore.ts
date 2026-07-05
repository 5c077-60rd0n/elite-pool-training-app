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
  timerDate: string;
  timerRunning: boolean;
  timerStartedAt?: string;
  timerAccumulatedSeconds: number;
  saveDrillResult: (result: DrillResult) => void;
  setSessionNotes: (notes: string) => void;
  markComplete: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => number;
  resetTimer: () => void;
  resetSession: () => void;
}

const today = new Date().toISOString().slice(0, 10);

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      activeDate: today,
      activeFocus: 'Stroke & Mechanics',
      drillResults: [],
      isComplete: false,
      sessionNotes: '',
      timerDate: today,
      timerRunning: false,
      timerStartedAt: undefined,
      timerAccumulatedSeconds: 0,
      saveDrillResult: (result) =>
        set((state) => ({
          drillResults: [...state.drillResults.filter((entry) => entry.drillId !== result.drillId), result],
        })),
      setSessionNotes: (notes) => set({ sessionNotes: notes }),
      markComplete: () => set({ isComplete: true }),
      startTimer: () =>
        set(() => ({
          timerDate: new Date().toISOString().slice(0, 10),
          timerRunning: true,
          timerStartedAt: new Date().toISOString(),
          timerAccumulatedSeconds: 0,
        })),
      pauseTimer: () =>
        set((state) => {
          if (!state.timerRunning || !state.timerStartedAt) return {};
          const elapsed = Math.max(
            0,
            Math.floor((Date.now() - Date.parse(state.timerStartedAt)) / 1000),
          );
          return {
            timerRunning: false,
            timerStartedAt: undefined,
            timerAccumulatedSeconds: state.timerAccumulatedSeconds + elapsed,
          };
        }),
      resumeTimer: () =>
        set((state) => {
          if (state.timerRunning) return {};
          return {
            timerDate: new Date().toISOString().slice(0, 10),
            timerRunning: true,
            timerStartedAt: new Date().toISOString(),
          };
        }),
      stopTimer: (): number => {
        const state = get();
        if (!state.timerRunning || !state.timerStartedAt) {
          return state.timerAccumulatedSeconds;
        }

        const elapsed = Math.max(0, Math.floor((Date.now() - Date.parse(state.timerStartedAt)) / 1000));
        const total = state.timerAccumulatedSeconds + elapsed;
        set({
          timerRunning: false,
          timerStartedAt: undefined,
          timerAccumulatedSeconds: total,
        });
        return total;
      },
      resetTimer: () =>
        set(() => ({
          timerDate: new Date().toISOString().slice(0, 10),
          timerRunning: false,
          timerStartedAt: undefined,
          timerAccumulatedSeconds: 0,
        })),
      resetSession: () =>
        set({
          activeDate: new Date().toISOString().slice(0, 10),
          drillResults: [],
          isComplete: false,
          sessionNotes: '',
          timerDate: new Date().toISOString().slice(0, 10),
          timerRunning: false,
          timerStartedAt: undefined,
          timerAccumulatedSeconds: 0,
        }),
    }),
    {
      name: 'fargo-climb-session',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
