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
  drillRoomAttempts: number;
  drillRoomSessionScore: number;
  drillRoomPocketingPct: number;
  drillRoomPositioningPct: number;
  bullseyeSuccessfulAttempts: number;
  bullseyeTotalAttempts: number;
  bullseyeShortRangePct: number;
  bullseyeMidRangePct: number;
  bullseyeLongRangePct: number;
  wpbHighestScore: number;
  wpbCurrentAvgScore: number;
  wpbAvgPracticeMinutes: number;
};

export type TrackerKpiDirection = 'higher' | 'lower';
export type TrackerKpiTier = 'primary' | 'advanced';
export type AppSpecialization = 'shotmaking' | 'position-play' | 'pattern-mastery';

export type TrackerKpiDefinition = {
  id: string;
  name: string;
  measurementUnit: string;
  direction: TrackerKpiDirection;
  benchmarks: Benchmarks;
  getValue: (metrics: WeeklyMetrics) => number;
  tier: TrackerKpiTier;
  app: AppSpecialization;
  description: string;
};

export const trackerKpis: TrackerKpiDefinition[] = [
  // PRIMARY KPIs - One per app representing core training purpose
  {
    id: 'drillroom-shotmaking-foundation',
    name: 'Shotmaking Foundation',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'primary',
    app: 'shotmaking',
    description: 'Pocketing accuracy — foundation of all potting consistency.',
    benchmarks: { fargo550: 60, fargo600: 65, fargo650: 70, fargo700: 75, fargo750: 80, fargo800: 85 },
    getValue: (metrics) => metrics.drillRoomPocketingPct,
  },
  {
    id: 'bullseye-position-precision',
    name: 'Position Precision',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'primary',
    app: 'position-play',
    description: 'Weighted cue ball control across distances (40% short, 35% mid, 25% long).',
    benchmarks: { 
      fargo550: 58, 
      fargo600: 63, 
      fargo650: 68, 
      fargo700: 73, 
      fargo750: 78, 
      fargo800: 83 
    },
    getValue: (metrics) => 
      Math.round(
        metrics.bullseyeShortRangePct * 0.4 + 
        metrics.bullseyeMidRangePct * 0.35 + 
        metrics.bullseyeLongRangePct * 0.25
      ),
  },
  {
    id: 'wpb-pattern-execution',
    name: 'Pattern Execution',
    measurementUnit: 'score',
    direction: 'higher',
    tier: 'primary',
    app: 'pattern-mastery',
    description: 'Multi-shot runout & pattern quality — measures decision-making under sequence pressure.',
    benchmarks: { fargo550: 3, fargo600: 3.5, fargo650: 4, fargo700: 4.5, fargo750: 5, fargo800: 5.5 },
    getValue: (metrics) => metrics.wpbCurrentAvgScore,
  },

  // ADVANCED KPIs - Detailed metrics by app for power users & diagnostics
  // DrillRoom - Shotmaking Foundations
  {
    id: 'drillroom-attempts',
    name: 'DrillRoom Attempts',
    measurementUnit: 'count',
    direction: 'higher',
    tier: 'advanced',
    app: 'shotmaking',
    description: 'Volume indicator — drilling consistency and session intensity.',
    benchmarks: { fargo550: 20, fargo600: 24, fargo650: 28, fargo700: 32, fargo750: 36, fargo800: 40 },
    getValue: (metrics) => metrics.drillRoomAttempts,
  },
  {
    id: 'drillroom-session-score',
    name: 'DrillRoom Session Score',
    measurementUnit: 'score',
    direction: 'higher',
    tier: 'advanced',
    app: 'shotmaking',
    description: 'Aggregate drilling performance — difficulty of drills completed.',
    benchmarks: { fargo550: 3.5, fargo600: 4, fargo650: 4.5, fargo700: 5, fargo750: 5.5, fargo800: 6 },
    getValue: (metrics) => metrics.drillRoomSessionScore,
  },
  {
    id: 'drillroom-positioning-pct',
    name: 'DrillRoom Positioning %',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'advanced',
    app: 'shotmaking',
    description: 'Post-shot position control — secondary to pocketing but critical for sequence play.',
    benchmarks: { fargo550: 50, fargo600: 55, fargo650: 60, fargo700: 65, fargo750: 70, fargo800: 75 },
    getValue: (metrics) => metrics.drillRoomPositioningPct,
  },

  // Bullseye - Position Play
  {
    id: 'bullseye-successful-attempts',
    name: 'Bullseye Successful Attempts',
    measurementUnit: 'count',
    direction: 'higher',
    tier: 'advanced',
    app: 'position-play',
    description: 'Volume of successful position plays — drilling frequency.',
    benchmarks: { fargo550: 15, fargo600: 18, fargo650: 22, fargo700: 26, fargo750: 30, fargo800: 34 },
    getValue: (metrics) => metrics.bullseyeSuccessfulAttempts,
  },
  {
    id: 'bullseye-total-attempts',
    name: 'Bullseye Total Attempts',
    measurementUnit: 'count',
    direction: 'higher',
    tier: 'advanced',
    app: 'position-play',
    description: 'Total position play attempts — session volume indicator.',
    benchmarks: { fargo550: 25, fargo600: 30, fargo650: 35, fargo700: 40, fargo750: 45, fargo800: 50 },
    getValue: (metrics) => metrics.bullseyeTotalAttempts,
  },
  {
    id: 'bullseye-short-range-pct',
    name: 'Bullseye Short Range %',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'advanced',
    app: 'position-play',
    description: 'Close-range position control — foundational distance.',
    benchmarks: { fargo550: 65, fargo600: 70, fargo650: 75, fargo700: 80, fargo750: 85, fargo800: 90 },
    getValue: (metrics) => metrics.bullseyeShortRangePct,
  },
  {
    id: 'bullseye-mid-range-pct',
    name: 'Bullseye Mid Range %',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'advanced',
    app: 'position-play',
    description: 'Mid-table position control — typical table positioning.',
    benchmarks: { fargo550: 45, fargo600: 50, fargo650: 55, fargo700: 60, fargo750: 65, fargo800: 70 },
    getValue: (metrics) => metrics.bullseyeMidRangePct,
  },
  {
    id: 'bullseye-long-range-pct',
    name: 'Bullseye Long Range %',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'advanced',
    app: 'position-play',
    description: 'Long-distance position control — advanced cue ball travel.',
    benchmarks: { fargo550: 35, fargo600: 40, fargo650: 45, fargo700: 50, fargo750: 55, fargo800: 60 },
    getValue: (metrics) => metrics.bullseyeLongRangePct,
  },

  // WPB - Pattern Mastery
  {
    id: 'wpb-highest-score',
    name: 'WPB Highest Score',
    measurementUnit: 'score',
    direction: 'higher',
    tier: 'advanced',
    app: 'pattern-mastery',
    description: 'Best single-session runout/pattern score — peak capability indicator.',
    benchmarks: { fargo550: 4, fargo600: 4.5, fargo650: 5, fargo700: 5.5, fargo750: 6, fargo800: 6.5 },
    getValue: (metrics) => metrics.wpbHighestScore,
  },
  {
    id: 'wpb-avg-practice-minutes',
    name: 'WPB Avg Practice Minutes',
    measurementUnit: 'minutes',
    direction: 'higher',
    tier: 'advanced',
    app: 'pattern-mastery',
    description: 'Session time investment — drilling consistency and volume.',
    benchmarks: { fargo550: 10, fargo600: 12, fargo650: 14, fargo700: 16, fargo750: 18, fargo800: 20 },
    getValue: (metrics) => metrics.wpbAvgPracticeMinutes,
  },
];

// Helper functions for KPI organization
export function getPrimaryKpis(): TrackerKpiDefinition[] {
  return trackerKpis.filter((kpi) => kpi.tier === 'primary');
}

export function getAdvancedKpis(): TrackerKpiDefinition[] {
  return trackerKpis.filter((kpi) => kpi.tier === 'advanced');
}

export function getKpisByApp(app: AppSpecialization): TrackerKpiDefinition[] {
  return trackerKpis.filter((kpi) => kpi.app === app);
}

export function getPrimaryKpiForApp(app: AppSpecialization): TrackerKpiDefinition | undefined {
  return trackerKpis.find((kpi) => kpi.tier === 'primary' && kpi.app === app);
}
