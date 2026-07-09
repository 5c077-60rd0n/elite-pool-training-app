import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import type { BreakChartEntry, DrillSessionLog, KPIWeeklyEntry, MentalGameLogEntry, TournamentPrep } from '../types/models';

interface FargoPoint {
  date: string;
  rating: number;
}

interface ProgressState {
  fargoHistory: FargoPoint[];
  logs: DrillSessionLog[];
  weeklyKpis: KPIWeeklyEntry[];
  breakChartEntries: BreakChartEntry[];
  tournamentPreps: TournamentPrep[];
  mentalGameLogs: MentalGameLogEntry[];
  addFargoPoint: (point: FargoPoint) => void;
  addSessionLog: (log: DrillSessionLog) => void;
  upsertWeeklyKpi: (entry: KPIWeeklyEntry) => void;
  addBreakChartEntry: (entry: BreakChartEntry) => void;
  upsertTournamentPrep: (entry: TournamentPrep) => void;
  addMentalGameLog: (entry: MentalGameLogEntry) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      fargoHistory: [],
      logs: [],
      weeklyKpis: [],
      breakChartEntries: [],
      tournamentPreps: [],
      mentalGameLogs: [],
      addFargoPoint: (point) => set((state) => ({ fargoHistory: [...state.fargoHistory, point] })),
      addSessionLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
      upsertWeeklyKpi: (entry) =>
        set((state) => {
          const next = state.weeklyKpis.filter(
            (item) => !(item.kpiId === entry.kpiId && item.week === entry.week),
          );
          return { weeklyKpis: [...next, entry] };
        }),
      addBreakChartEntry: (entry) =>
        set((state) => ({
          breakChartEntries: [entry, ...state.breakChartEntries],
        })),
      upsertTournamentPrep: (entry) =>
        set((state) => {
          const next = state.tournamentPreps.filter((item) => item.id !== entry.id);
          return {
            tournamentPreps: [entry, ...next],
          };
        }),
      addMentalGameLog: (entry) =>
        set((state) => ({
          mentalGameLogs: [entry, ...state.mentalGameLogs.filter((item) => item.id !== entry.id)].slice(0, 200),
        })),
    }),
    {
      name: 'fargo-climb-progress',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
