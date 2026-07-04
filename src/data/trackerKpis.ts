export type Benchmarks = {
  fargo550: number;
  fargo600: number;
  fargo650: number;
  fargo700: number;
  fargo750: number;
  fargo800: number;
};

export type WeeklyMetrics = {
  week: number;
  drillRoomShotmakingPct: number;
  bullseyeProximity: number;
  ghostDrillWinRatePct: number;
  lineUpShotCount: number;
  safetyExchangeSuccessPct: number;
  wpbLessonsCompleted: number;
};

export type TrackerKpiDirection = 'higher' | 'lower';

export type TrackerKpiDefinition = {
  id: string;
  name: string;
  measurementUnit: string;
  direction: TrackerKpiDirection;
  benchmarks: Benchmarks;
  getValue: (metrics: WeeklyMetrics) => number;
};

export const trackerKpis: TrackerKpiDefinition[] = [
  {
    id: 'drillroom-shotmaking',
    name: 'DrillRoom Shotmaking',
    measurementUnit: '%',
    direction: 'higher',
    benchmarks: { fargo550: 50, fargo600: 60, fargo650: 65, fargo700: 75, fargo750: 80, fargo800: 85 },
    getValue: (metrics) => metrics.drillRoomShotmakingPct,
  },
  {
    id: 'ghost-drill-win-rate',
    name: 'Ghost Drill Win Rate',
    measurementUnit: '%',
    direction: 'higher',
    benchmarks: { fargo550: 30, fargo600: 30, fargo650: 50, fargo700: 60, fargo750: 65, fargo800: 70 },
    getValue: (metrics) => metrics.ghostDrillWinRatePct,
  },
  {
    id: 'safety-exchange-success',
    name: 'Safety Exchange Success',
    measurementUnit: '%',
    direction: 'higher',
    benchmarks: { fargo550: 40, fargo600: 50, fargo650: 60, fargo700: 70, fargo750: 72, fargo800: 75 },
    getValue: (metrics) => metrics.safetyExchangeSuccessPct,
  },
  {
    id: 'lineup-efficiency',
    name: 'Line-Up Efficiency',
    measurementUnit: 'shots',
    direction: 'lower',
    benchmarks: { fargo550: 24, fargo600: 22, fargo650: 16, fargo700: 14, fargo750: 12, fargo800: 10 },
    getValue: (metrics) => metrics.lineUpShotCount,
  },
  {
    id: 'bullseye-proximity',
    name: 'Bullseye Proximity',
    measurementUnit: 'score',
    direction: 'lower',
    benchmarks: { fargo550: 4, fargo600: 3.5, fargo650: 3, fargo700: 2.6, fargo750: 2.2, fargo800: 1.8 },
    getValue: (metrics) => metrics.bullseyeProximity,
  },
  {
    id: 'wpb-lessons-weekly',
    name: 'WPB Lessons / Week',
    measurementUnit: 'count',
    direction: 'higher',
    benchmarks: { fargo550: 1, fargo600: 1, fargo650: 1, fargo700: 2, fargo750: 2, fargo800: 3 },
    getValue: (metrics) => metrics.wpbLessonsCompleted,
  },
];
