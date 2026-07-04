import type { ElitePerformanceLabData } from '../types/tracker';

export const eliteLabSeed: ElitePerformanceLabData = {
  shotDecisionEntries: [],
  pressureScenarioResults: [],
  opponentIntel: [],
  breakOptimizationLog: [],
  safetyKickDrills: [
    {
      id: 'drill-kick-2rail',
      name: 'Two-Rail Kick Escape',
      family: 'kick',
      intervalDays: 3,
      dueDate: new Date().toISOString().slice(0, 10),
      proficiency: 2,
      notes: 'Head rail to long rail kick speed control.',
    },
    {
      id: 'drill-safety-distance',
      name: 'Distance Safety Lockup',
      family: 'safety',
      intervalDays: 4,
      dueDate: new Date().toISOString().slice(0, 10),
      proficiency: 2,
      notes: 'Cue-ball separation plus blocker priority.',
    },
  ],
  rackPatternReviews: [],
  preShotRoutineLogs: [],
  tournamentAutopsies: [],
  readinessLog: [],
};
