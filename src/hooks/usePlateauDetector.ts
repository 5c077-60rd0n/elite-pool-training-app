import { useMemo } from 'react';
import { useKPICalc } from './useKPICalc';

export function usePlateauDetector() {
  const { trends, weeklyHistory, kpiScores } = useKPICalc();

  const status = useMemo(() => {
    const latestWeek = weeklyHistory.length > 0 ? Math.max(...weeklyHistory.map((entry) => entry.week)) : 0;
    const recent = weeklyHistory.filter((entry) => entry.week >= latestWeek - 5);
    const activeKpis = new Set(recent.map((entry) => entry.kpiId));

    const stagnantKpis = trends.filter((item) => item.trend !== 'improving' && item.weeks >= 6 && activeKpis.has(item.kpiId));
    const isOnPlateau = stagnantKpis.length >= 3;

    const weakest = [...kpiScores]
      .sort((a, b) => a.normalizedScore - b.normalizedScore)
      .slice(0, 3)
      .map((entry) => entry.name);

    return {
      isOnPlateau,
      weeksAtSameLevel: isOnPlateau ? 6 : 0,
      recommendedActions: isOnPlateau
        ? [
            {
              step: 1,
              action: `Prioritize weakest KPI block first each day: ${weakest[0] ?? 'Primary KPI'}.`,
              urgency: 'high' as const,
            },
            {
              step: 2,
              action: `Add 15 focused reps for ${weakest[1] ?? 'secondary KPI'} and review outcomes nightly.`,
              urgency: 'medium' as const,
            },
            {
              step: 3,
              action: `Use pressure-set simulations targeting ${weakest[2] ?? 'tertiary KPI'} twice this week.`,
              urgency: 'medium' as const,
            },
          ]
        : [],
    };
  }, [kpiScores, trends, weeklyHistory]);

  return status;
}
