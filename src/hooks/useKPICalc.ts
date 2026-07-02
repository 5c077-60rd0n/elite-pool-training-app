import { useMemo } from 'react';
import { kpis } from '../data/kpis';
import { useProgressStore } from '../store/useProgressStore';
import { useSettingsStore } from '../store/useSettingsStore';

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

export function useKPICalc() {
  const { weeklyKpis, logs } = useProgressStore();
  const rating = useSettingsStore((s) => s.profile.currentFargoRating);

  const weeklyKpisFromLogs = useMemo(() => {
    return kpis.flatMap((kpi) => {
      const rows = logs
        .map((log) => {
          const related = log.drillResults.filter((result) => kpi.relatedDrillIds.includes(result.drillId));
          if (!related.length) return null;
          const avg = related.reduce((sum, result) => sum + result.calculatedScore, 0) / related.length;
          return {
            kpiId: kpi.id,
            week: log.week,
            month: Math.max(1, Math.ceil(log.week / 4.34)),
            phase: log.phase,
            value: Math.round(avg),
            sessionCount: related.length,
            trend: 'stable' as const,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      const dedup = new Map<number, (typeof rows)[number]>();
      rows.forEach((row) => {
        const existing = dedup.get(row.week);
        if (!existing) {
          dedup.set(row.week, row);
          return;
        }
        const mergedCount = existing.sessionCount + row.sessionCount;
        dedup.set(row.week, {
          ...row,
          value: Math.round((existing.value * existing.sessionCount + row.value * row.sessionCount) / mergedCount),
          sessionCount: mergedCount,
        });
      });

      return Array.from(dedup.values());
    });
  }, [logs]);

  const sourceWeeklyKpis = weeklyKpis.length > 0 ? weeklyKpis : weeklyKpisFromLogs;

  const kpiScores = useMemo(() => {
    return kpis.map((kpi) => {
      const latest = sourceWeeklyKpis
        .filter((entry) => entry.kpiId === kpi.id)
        .sort((a, b) => b.week - a.week)[0];
      const benchmarkTarget = interpolateBenchmark(kpi.benchmarks, rating);
      const rawScore = latest?.value ?? 0;
      const normalizedScore = benchmarkTarget > 0 ? Math.min(100, Math.round((rawScore / benchmarkTarget) * 100)) : 0;
      return { ...kpi, score: rawScore, benchmarkTarget, normalizedScore };
    });
  }, [rating, sourceWeeklyKpis]);

  const radarData = useMemo(
    () =>
      kpiScores.map((entry) => ({
        subject: entry.name,
        value: entry.normalizedScore,
        fullMark: 100,
      })),
    [kpiScores],
  );

  const trends = useMemo(() => {
    return kpiScores.map((entry) => {
      const history = sourceWeeklyKpis.filter((item) => item.kpiId === entry.id).sort((a, b) => a.week - b.week);
      const recent = history.slice(-6);
      if (recent.length < 2) return { kpiId: entry.id, trend: 'stable' as const, delta: 0, weeks: history.length };
      const delta = recent[recent.length - 1].value - recent[0].value;
      if (delta > 2) return { kpiId: entry.id, trend: 'improving' as const, delta, weeks: history.length };
      if (delta < -2) return { kpiId: entry.id, trend: 'declining' as const, delta, weeks: history.length };
      return { kpiId: entry.id, trend: 'stable' as const, delta, weeks: history.length };
    });
  }, [kpiScores, sourceWeeklyKpis]);

  return {
    kpiScores,
    radarData,
    trends,
    weeklyHistory: sourceWeeklyKpis,
  };
}
