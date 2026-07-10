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
export type TrackerKpiTier = 'primary' | 'supporting';
export type SkillDomain = 'accuracy' | 'position-play' | 'pattern-mastery';
export type AppSpecialization = 'shotmaking' | 'position-play' | 'pattern-mastery';

export type TrackerKpiDefinition = {
  id: string;
  name: string;
  measurementUnit: string;
  direction: TrackerKpiDirection;
  benchmarks: Benchmarks;
  getValue: (metrics: WeeklyMetrics) => number;
  tier: TrackerKpiTier;
  skill: SkillDomain;
  app: AppSpecialization;
  description: string;
};

export const trackerKpis: TrackerKpiDefinition[] = [
  // ===== ELITE ACCURACY =====
  // What: Consistent potting under variety of conditions
  // Why: Foundation of pool excellence — win through execution consistency
  // Pro Metric: Pocketing accuracy from DrillRoom (best isolation of this skill)
  {
    id: 'elite-accuracy',
    name: 'Elite Accuracy',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'primary',
    skill: 'accuracy',
    app: 'shotmaking',
    description: 'Consistent potting foundation — pocketing accuracy from all angles.',
    benchmarks: { fargo550: 60, fargo600: 65, fargo650: 70, fargo700: 75, fargo750: 80, fargo800: 85 },
    getValue: (metrics) => metrics.drillRoomPocketingPct,
  },
  // Supporting accuracy metrics
  {
    id: 'accuracy-positioning',
    name: 'Accuracy + Position',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'supporting',
    skill: 'accuracy',
    app: 'shotmaking',
    description: 'Post-shot position quality — how often potting sets up next shot.',
    benchmarks: { fargo550: 50, fargo600: 55, fargo650: 60, fargo700: 65, fargo750: 70, fargo800: 75 },
    getValue: (metrics) => metrics.drillRoomPositioningPct,
  },
  {
    id: 'accuracy-session-score',
    name: 'Accuracy Difficulty',
    measurementUnit: 'score',
    direction: 'higher',
    tier: 'supporting',
    skill: 'accuracy',
    app: 'shotmaking',
    description: 'Difficulty of drills attempted — progression indicator.',
    benchmarks: { fargo550: 3.5, fargo600: 4, fargo650: 4.5, fargo700: 5, fargo750: 5.5, fargo800: 6 },
    getValue: (metrics) => metrics.drillRoomSessionScore,
  },
  {
    id: 'accuracy-volume',
    name: 'Accuracy Volume',
    measurementUnit: 'count',
    direction: 'higher',
    tier: 'supporting',
    skill: 'accuracy',
    app: 'shotmaking',
    description: 'Drilling frequency — consistency of practice commitment.',
    benchmarks: { fargo550: 20, fargo600: 24, fargo650: 28, fargo700: 32, fargo750: 36, fargo800: 40 },
    getValue: (metrics) => metrics.drillRoomAttempts,
  },

  // ===== ELITE POSITION PLAY =====
  // What: Cue ball control across all distances and angles
  // Why: Separates good players from great — enables winning patterns
  // Pro Metric: Weighted position precision from Bullseye (best direct measurement)
  {
    id: 'elite-position-play',
    name: 'Elite Position Play',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'primary',
    skill: 'position-play',
    app: 'position-play',
    description: 'Cue ball control mastery — weighted success across all distances.',
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
  // Supporting position metrics from Bullseye
  {
    id: 'position-short-range',
    name: 'Position: Short Range',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'supporting',
    skill: 'position-play',
    app: 'position-play',
    description: 'Close-range cue ball control — foundational distance.',
    benchmarks: { fargo550: 65, fargo600: 70, fargo650: 75, fargo700: 80, fargo750: 85, fargo800: 90 },
    getValue: (metrics) => metrics.bullseyeShortRangePct,
  },
  {
    id: 'position-mid-range',
    name: 'Position: Mid Range',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'supporting',
    skill: 'position-play',
    app: 'position-play',
    description: 'Mid-table cue ball control — typical play distances.',
    benchmarks: { fargo550: 45, fargo600: 50, fargo650: 55, fargo700: 60, fargo750: 65, fargo800: 70 },
    getValue: (metrics) => metrics.bullseyeMidRangePct,
  },
  {
    id: 'position-long-range',
    name: 'Position: Long Range',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'supporting',
    skill: 'position-play',
    app: 'position-play',
    description: 'Extended cue ball travel — advanced distance control.',
    benchmarks: { fargo550: 35, fargo600: 40, fargo650: 45, fargo700: 50, fargo750: 55, fargo800: 60 },
    getValue: (metrics) => metrics.bullseyeLongRangePct,
  },
  {
    id: 'position-attempts',
    name: 'Position Practice Volume',
    measurementUnit: 'count',
    direction: 'higher',
    tier: 'supporting',
    skill: 'position-play',
    app: 'position-play',
    description: 'Position play drilling frequency.',
    benchmarks: { fargo550: 25, fargo600: 30, fargo650: 35, fargo700: 40, fargo750: 45, fargo800: 50 },
    getValue: (metrics) => metrics.bullseyeTotalAttempts,
  },
  // Cross-app support: positioning from accuracy training
  {
    id: 'position-from-accuracy',
    name: 'Position Insight (from Accuracy)',
    measurementUnit: '%',
    direction: 'higher',
    tier: 'supporting',
    skill: 'position-play',
    app: 'shotmaking',
    description: 'Position quality feedback loop from potting accuracy work.',
    benchmarks: { fargo550: 50, fargo600: 55, fargo650: 60, fargo700: 65, fargo750: 70, fargo800: 75 },
    getValue: (metrics) => metrics.drillRoomPositioningPct,
  },

  // ===== ELITE PATTERN MASTERY =====
  // What: Multi-shot sequence decision-making and execution
  // Why: Wins tournaments — combines accuracy + position into flow
  // Pro Metric: Pattern completion quality from WPB (best full-sequence measurement)
  {
    id: 'elite-pattern-mastery',
    name: 'Elite Pattern Mastery',
    measurementUnit: 'score',
    direction: 'higher',
    tier: 'primary',
    skill: 'pattern-mastery',
    app: 'pattern-mastery',
    description: 'Multi-shot runout and pattern quality under sequence pressure.',
    benchmarks: { fargo550: 3, fargo600: 3.5, fargo650: 4, fargo700: 4.5, fargo750: 5, fargo800: 5.5 },
    getValue: (metrics) => metrics.wpbCurrentAvgScore,
  },
  // Supporting pattern metrics
  {
    id: 'pattern-peak-performance',
    name: 'Pattern Peak Performance',
    measurementUnit: 'score',
    direction: 'higher',
    tier: 'supporting',
    skill: 'pattern-mastery',
    app: 'pattern-mastery',
    description: 'Best single session runout/pattern score — peak capability.',
    benchmarks: { fargo550: 4, fargo600: 4.5, fargo650: 5, fargo700: 5.5, fargo750: 6, fargo800: 6.5 },
    getValue: (metrics) => metrics.wpbHighestScore,
  },
  {
    id: 'pattern-volume',
    name: 'Pattern Practice Commitment',
    measurementUnit: 'minutes',
    direction: 'higher',
    tier: 'supporting',
    skill: 'pattern-mastery',
    app: 'pattern-mastery',
    description: 'Time invested in sequence/runout practice.',
    benchmarks: { fargo550: 10, fargo600: 12, fargo650: 14, fargo700: 16, fargo750: 18, fargo800: 20 },
    getValue: (metrics) => metrics.wpbAvgPracticeMinutes,
  },
  // Cross-app support: difficulty progression from accuracy training feeds patterns
  {
    id: 'pattern-from-accuracy-difficulty',
    name: 'Pattern Complexity (from Accuracy)',
    measurementUnit: 'score',
    direction: 'higher',
    tier: 'supporting',
    skill: 'pattern-mastery',
    app: 'shotmaking',
    description: 'Shooting difficulty feedback — how complex shots are practiced.',
    benchmarks: { fargo550: 3.5, fargo600: 4, fargo650: 4.5, fargo700: 5, fargo750: 5.5, fargo800: 6 },
    getValue: (metrics) => metrics.drillRoomSessionScore,
  },
];

// Helper functions for KPI organization by skill
export function getPrimaryKpis(): TrackerKpiDefinition[] {
  return trackerKpis.filter((kpi) => kpi.tier === 'primary');
}

export function getSupportingKpis(): TrackerKpiDefinition[] {
  return trackerKpis.filter((kpi) => kpi.tier === 'supporting');
}

export function getKpisBySkill(skill: SkillDomain): TrackerKpiDefinition[] {
  return trackerKpis.filter((kpi) => kpi.skill === skill);
}

export function getPrimaryKpiForSkill(skill: SkillDomain): TrackerKpiDefinition | undefined {
  return trackerKpis.find((kpi) => kpi.tier === 'primary' && kpi.skill === skill);
}

export function getSupportingKpisForSkill(skill: SkillDomain): TrackerKpiDefinition[] {
  return trackerKpis.filter((kpi) => kpi.tier === 'supporting' && kpi.skill === skill);
}
