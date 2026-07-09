import type { DailySessionLog } from '../types/tracker';

interface WpbStatsInput {
  highestScore?: number;
  currentAvgScore?: number;
  avgPracticeMinutes?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasMeaningfulWpbStats(stats: WpbStatsInput): boolean {
  return (stats.highestScore ?? 0) > 0 || (stats.currentAvgScore ?? 0) > 0 || (stats.avgPracticeMinutes ?? 0) > 0;
}

export function estimateWpbFargo(stats: WpbStatsInput): number | null {
  if (!hasMeaningfulWpbStats(stats)) return null;

  const highest = clamp(stats.highestScore ?? 0, 0, 15);
  const average = clamp(stats.currentAvgScore ?? 0, 0, 15);
  const minutes = clamp(stats.avgPracticeMinutes ?? 0, 0, 60);

  const wpbPerformanceScore =
    clamp(highest * 6.67, 0, 100) * 0.4 +
    clamp(average * 6.67, 0, 100) * 0.4 +
    clamp((minutes / 20) * 100, 0, 100) * 0.2;

  return Math.round(clamp(300 + wpbPerformanceScore * 5.5, 300, 850));
}

export function estimateLatestWpbFargo(logs: DailySessionLog[]): number | null {
  const latestWithWpbStats = [...logs]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .find((log) => hasMeaningfulWpbStats(log.appStats?.wpb ?? {}));

  if (!latestWithWpbStats) return null;

  return estimateWpbFargo(latestWithWpbStats.appStats?.wpb ?? {});
}
