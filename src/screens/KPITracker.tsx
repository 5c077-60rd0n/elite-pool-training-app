import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useKPICalc } from '../hooks/useKPICalc';
import { usePlateauDetector } from '../hooks/usePlateauDetector';

export default function KPITracker() {
  const { radarData, kpiScores, trends } = useKPICalc();
  const plateau = usePlateauDetector();

  const trendMap = new Map(trends.map((entry) => [entry.kpiId, entry.trend]));

  function statusFromNormalized(value: number): 'Excellent' | 'On Track' | 'Lagging' {
    if (value >= 105) return 'Excellent';
    if (value >= 90) return 'On Track';
    return 'Lagging';
  }

  return (
    <PageWrapper title="KPI Tracker">
      <Card className="mb-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <Radar dataKey="value" stroke="#e0bf6b" fill="#e0bf6b" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mb-4" title="KPI Benchmark Status">
        <div className="space-y-2">
          {kpiScores.map((kpi) => {
            const status = statusFromNormalized(kpi.normalizedScore);
            const trend = trendMap.get(kpi.id) ?? 'stable';
            return (
              <div key={kpi.id} className="rounded-lg bg-felt-800 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-ivory-100">{kpi.name}</p>
                  <span className="rounded-full bg-felt-600 px-2 py-1 text-xs text-ivory-100">{status}</span>
                </div>
                <p className="text-chalk-300">
                  Score {kpi.score} vs benchmark {kpi.benchmarkTarget.toFixed(1)} · trend {trend}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {plateau.isOnPlateau ? (
        <Card title="Plateau Protocol">
          <p className="mb-2 text-sm text-amber-300">Plateau detected for {plateau.weeksAtSameLevel}+ weeks.</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ivory-100">
            {plateau.recommendedActions.map((action) => (
              <li key={action.step}>
                Step {action.step} ({action.urgency}): {action.action}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </PageWrapper>
  );
}
