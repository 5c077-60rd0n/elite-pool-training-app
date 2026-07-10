import { useMemo } from 'react';
import {
  trackerKpis,
  type Benchmarks,
  type TrackerKpiDirection,
  type WeeklyMetrics,
} from '../data/trackerKpis';
import type { DailySessionLog } from '../types/tracker';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { getActiveTrainingFargo } from '../utils/fargoProfile';

type TrackerWeeklyKpi = {
  kpiId: string;
  week: number;
  value: number;
};

function interpolateBenchmark(
  benchmarks: Benchmarks,
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

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeScore(value: number, benchmarkTarget: number, direction: TrackerKpiDirection): number {
  if (benchmarkTarget <= 0 || value <= 0) return 0;
  const ratio = direction === 'lower' ? benchmarkTarget / value : value / benchmarkTarget;
  return Math.max(0, Math.min(130, Math.round(ratio * 100)));
}

function weeklyMetricsFromDailyLogs(
  logs: DailySessionLog[],
): WeeklyMetrics[] {
  const grouped = new Map<number, DailySessionLog[]>();
  logs.forEach((log) => {
    const list = grouped.get(log.weekNumber) ?? [];
    list.push(log);
    grouped.set(log.weekNumber, list);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, weekLogs]) => {
      const drillRoomStats = weekLogs.map((item) => item.appStats?.drillRoom).filter(Boolean);
      const bullseyeStats = weekLogs.map((item) => item.appStats?.bullseye).filter(Boolean);
      const wpbStats = weekLogs.map((item) => item.appStats?.wpb).filter(Boolean);

      return {
        week,
        drillRoomAttempts: Math.round(average(drillRoomStats.map((item) => item?.attempts ?? 0).filter((v) => v > 0))),
        drillRoomSessionScore: Number(average(drillRoomStats.map((item) => item?.score ?? 0).filter((v) => v > 0)).toFixed(1)),
        drillRoomPocketingPct: Math.round(average(drillRoomStats.map((item) => item?.pocketingPct ?? 0).filter((v) => v > 0))),
        drillRoomPositioningPct: Math.round(average(drillRoomStats.map((item) => item?.positioningPct ?? 0).filter((v) => v > 0))),
        bullseyeSuccessfulAttempts: Math.round(average(bullseyeStats.map((item) => item?.successfulAttempts ?? 0).filter((v) => v > 0))),
        bullseyeTotalAttempts: Math.round(average(bullseyeStats.map((item) => item?.totalAttempts ?? 0).filter((v) => v > 0))),
        bullseyeShortRangePct: Math.round(average(bullseyeStats.map((item) => item?.shortRangePct ?? 0).filter((v) => v > 0))),
        bullseyeMidRangePct: Math.round(average(bullseyeStats.map((item) => item?.midRangePct ?? 0).filter((v) => v > 0))),
        bullseyeLongRangePct: Math.round(average(bullseyeStats.map((item) => item?.longRangePct ?? 0).filter((v) => v > 0))),
        wpbHighestScore: Math.round(average(wpbStats.map((item) => item?.highestScore ?? 0).filter((v) => v > 0))),
        wpbCurrentAvgScore: Number(average(wpbStats.map((item) => item?.currentAvgScore ?? 0).filter((v) => v > 0)).toFixed(1)),
        wpbAvgPracticeMinutes: Number(average(wpbStats.map((item) => item?.avgPracticeMinutes ?? 0).filter((v) => v > 0)).toFixed(1)),
      };
    });
}

export function useKPICalc() {
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const profile = useSettingsStore((s) => s.profile);
  const rating = getActiveTrainingFargo(profile);

  const sourceWeeklyKpis = useMemo(() => {
    const merged = weeklyMetricsFromDailyLogs(logs);
    return trackerKpis.flatMap((kpi) =>
      merged
        .map((metrics) => ({
          kpiId: kpi.id,
          week: metrics.week,
          value: kpi.getValue(metrics),
        }))
        .filter((entry) => entry.value > 0),
    );
  }, [logs]);

  const kpiScores = useMemo(() => {
    return trackerKpis.map((kpi) => {
      const latest = sourceWeeklyKpis
        .filter((entry) => entry.kpiId === kpi.id)
        .sort((a, b) => b.week - a.week)[0];
      const benchmarkTarget = interpolateBenchmark(kpi.benchmarks, rating);
      const rawScore = latest?.value ?? 0;
      const normalizedScore = normalizeScore(rawScore, benchmarkTarget, kpi.direction);
      return { ...kpi, score: rawScore, benchmarkTarget, normalizedScore };
    });
  }, [rating, sourceWeeklyKpis]);

  const radarData = useMemo(
    () =>
      kpiScores
        .filter((kpi) => kpi.tier === 'primary')
        .map((entry) => ({
          subject: entry.name,
          value: entry.normalizedScore,
          fullMark: 130,
        })),
    [kpiScores],
  );

  const primaryKpiScores = useMemo(() => {
    return kpiScores.filter((kpi) => kpi.tier === 'primary');
  }, [kpiScores]);

  const supportingKpiScores = useMemo(() => {
    return kpiScores.filter((kpi) => kpi.tier === 'supporting');
  }, [kpiScores]);

  const kpisBySkill = useMemo(() => {
    const map = new Map();
    ['accuracy', 'position-play', 'pattern-mastery'].forEach((skill) => {
      const primary = kpiScores.find((kpi) => kpi.tier === 'primary' && kpi.skill === skill);
      const supporting = kpiScores.filter((kpi) => kpi.tier === 'supporting' && kpi.skill === skill);
      if (primary) {
        map.set(skill, { primary, supporting });
      }
    });
    return map;
  }, [kpiScores]);

  const trends = useMemo(() => {
    return kpiScores.map((entry) => {
      const history: TrackerWeeklyKpi[] = sourceWeeklyKpis
        .filter((item) => item.kpiId === entry.id)
        .sort((a, b) => a.week - b.week);
      const recent = history.slice(-6);
      if (recent.length < 2) return { kpiId: entry.id, trend: 'stable' as const, delta: 0, weeks: history.length };
      const delta = recent[recent.length - 1].value - recent[0].value;
      const directionAdjustedDelta = entry.direction === 'lower' ? -delta : delta;
      if (directionAdjustedDelta > 2) {
        return { kpiId: entry.id, trend: 'improving' as const, delta: directionAdjustedDelta, weeks: history.length };
      }
      if (directionAdjustedDelta < -2) {
        return { kpiId: entry.id, trend: 'declining' as const, delta: directionAdjustedDelta, weeks: history.length };
      }
      return { kpiId: entry.id, trend: 'stable' as const, delta: directionAdjustedDelta, weeks: history.length };
    });
  }, [kpiScores, sourceWeeklyKpis]);

  return {
    kpiScores,
    primaryKpiScores,
    supportingKpiScores,
    kpisBySkill,
    radarData,
    trends,
    weeklyHistory: sourceWeeklyKpis,
  };
}
