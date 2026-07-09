import { trackerKpis } from '../data/trackerKpis';
import { trackerDrills } from '../data/trackerPlan';
import type { AdaptiveDailyPlan, DailySessionLog } from '../types/tracker';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function interpolateBenchmark(
  benchmarks: { fargo550: number; fargo600: number; fargo650: number; fargo700: number; fargo750: number; fargo800: number },
  rating: number,
): number {
  const points: Array<[number, number]> = [
    [550, benchmarks.fargo550],
    [600, benchmarks.fargo600],
    [650, benchmarks.fargo650],
    [700, benchmarks.fargo700],
    [750, benchmarks.fargo750],
    [800, benchmarks.fargo800],
  ];

  if (rating <= points[0][0]) return points[0][1];
  if (rating >= points[points.length - 1][0]) return points[points.length - 1][1];

  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    if (rating >= x1 && rating <= x2) {
      const t = (rating - x1) / (x2 - x1);
      return y1 + (y2 - y1) * t;
    }
  }

  return points[0][1];
}

function valueForMetric(log: DailySessionLog, metricId: string): number {
  switch (metricId) {
    case 'drillroom-shotmaking':
      return log.drillRoomShotmakingPct;
    case 'ghost-drill-win-rate':
      return log.ghostDrillWinRatePct;
    case 'safety-exchange-success':
      return log.safetyExchangeSuccessPct;
    case 'lineup-efficiency':
      return log.lineUpShotCount;
    case 'bullseye-proximity':
      return log.bullseyeProximity;
    case 'wpb-lessons-weekly':
      return log.wpbLesson === 'Yes' ? 1 : 0;
    default:
      return 0;
  }
}

function defaultPlan(currentWeek: number, forDate: string): AdaptiveDailyPlan {
  return {
    id: `adaptive-${currentWeek}-${forDate}`,
    generatedAt: new Date().toISOString(),
    forDate,
    weekNumber: currentWeek,
    focusKpiId: 'drillroom-shotmaking',
    focusKpiName: 'DrillRoom Shotmaking',
    rationale: 'Build shotmaking consistency baseline before tightening pressure metrics.',
    recommendedMinutes: 75,
    targetMetrics: {
      drillRoomShotmakingPct: 60,
      ghostDrillWinRatePct: 30,
      safetyExchangeSuccessPct: 40,
      lineUpShotCount: 22,
      bullseyeProximity: 3.5,
      wpbLessonsThisWeek: 1,
    },
    actionChecklist: [
      'Start with 15 minutes of stroke and potting calibration.',
      'Run one pressure set at race pace before ending the session.',
      'Log one objective adjustment note for tomorrow.',
    ],
    prescribedDrills: [
      'Center-Ball Straight Shots',
      'Progressive Rotation Runs',
      'Consecutive Containing Safes',
    ],
  };
}

function prescribedDrillsForMetric(metricId: string): string[] {
  const metricMap: Record<string, string> = {
    'drillroom-shotmaking': 'drillRoomShotmakingPct',
    'ghost-drill-win-rate': 'ghostDrillWinRatePct',
    'safety-exchange-success': 'safetyExchangeSuccessPct',
    'lineup-efficiency': 'lineUpShotCount',
    'bullseye-proximity': 'bullseyeProximity',
    'wpb-lessons-weekly': 'wpbLesson',
  };

  const metricField = metricMap[metricId];
  if (!metricField) return [];

  return trackerDrills
    .filter((drill) => drill.metricField === metricField)
    .slice(0, 3)
    .map((drill) => drill.name);
}

export function generateAdaptiveDailyPlan(
  logs: DailySessionLog[],
  currentFargoRating: number,
  currentWeek: number,
): AdaptiveDailyPlan {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const forDate = tomorrow.toISOString().slice(0, 10);

  if (!logs.length) {
    return defaultPlan(currentWeek, forDate);
  }

  const recent = [...logs]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 7);

  const metricStatus = trackerKpis.map((kpi) => {
    const values = recent.map((log) => valueForMetric(log, kpi.id)).filter((value) => value > 0);
    const current = average(values);
    const benchmark = interpolateBenchmark(kpi.benchmarks, currentFargoRating);

    let normalized = 0;
    if (current > 0 && benchmark > 0) {
      normalized =
        kpi.direction === 'lower'
          ? Math.min(130, (benchmark / current) * 100)
          : Math.min(130, (current / benchmark) * 100);
    }

    return {
      id: kpi.id,
      name: kpi.name,
      current,
      benchmark,
      normalized,
      deficit: 100 - normalized,
      direction: kpi.direction,
    };
  });

  const weakest = [...metricStatus].sort((a, b) => b.deficit - a.deficit)[0] ?? metricStatus[0];

  const drillRoomTarget = Math.round(interpolateBenchmark(trackerKpis[0].benchmarks, currentFargoRating));
  const ghostTarget = Math.round(interpolateBenchmark(trackerKpis[1].benchmarks, currentFargoRating));
  const safetyTarget = Math.round(interpolateBenchmark(trackerKpis[2].benchmarks, currentFargoRating));
  const lineUpTarget = Math.round(interpolateBenchmark(trackerKpis[3].benchmarks, currentFargoRating));
  const bullseyeTarget = Number(interpolateBenchmark(trackerKpis[4].benchmarks, currentFargoRating).toFixed(1));
  const wpbTarget = Math.round(interpolateBenchmark(trackerKpis[5].benchmarks, currentFargoRating));

  const rationale = `${weakest.name} is below target (${Math.round(weakest.current)} vs ${Math.round(
    weakest.benchmark,
  )}). Prioritize this block first while maintaining baseline targets in other metrics.`;

  return {
    id: `adaptive-${currentWeek}-${forDate}`,
    generatedAt: new Date().toISOString(),
    forDate,
    weekNumber: currentWeek,
    focusKpiId: weakest.id,
    focusKpiName: weakest.name,
    rationale,
    recommendedMinutes: clamp(75 + Math.round(Math.max(0, weakest.deficit) / 4), 60, 95),
    targetMetrics: {
      drillRoomShotmakingPct: drillRoomTarget,
      ghostDrillWinRatePct: ghostTarget,
      safetyExchangeSuccessPct: safetyTarget,
      lineUpShotCount: lineUpTarget,
      bullseyeProximity: bullseyeTarget,
      wpbLessonsThisWeek: wpbTarget,
    },
    actionChecklist: [
      `Open with focused reps on ${weakest.name} for 20-25 minutes.`,
      'Run one race-pace pressure set and compare against target metrics.',
      'Record one tactical adjustment in notes before ending the session.',
    ],
    prescribedDrills: prescribedDrillsForMetric(weakest.id),
  };
}
