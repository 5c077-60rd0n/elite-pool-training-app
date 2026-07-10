import { useState } from 'react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useKPICalc } from '../hooks/useKPICalc';
import { usePlateauDetector } from '../hooks/usePlateauDetector';
import type { TrackerKpiDefinition } from '../data/trackerKpis';

const APP_LABELS = {
  'shotmaking': '🎯 Shotmaking',
  'position-play': '📍 Position Play',
  'pattern-mastery': '🔄 Pattern Mastery',
};

export default function KPITracker() {
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const { radarData, primaryKpiScores, advancedKpiScores, kpisByApp, trends } = useKPICalc();
  const plateau = usePlateauDetector();

  const trendMap = new Map(trends.map((entry) => [entry.kpiId, entry.trend]));

  function statusFromNormalized(value: number): 'Excellent' | 'On Track' | 'Lagging' {
    if (value >= 105) return 'Excellent';
    if (value >= 90) return 'On Track';
    return 'Lagging';
  }

  return (
    <PageWrapper title="KPI Tracker">
      {/* PRIMARY KPI RADAR */}
      <Card className="mb-4">
        <h3 className="mb-3 text-sm font-semibold text-chalk-300">Primary Training Metrics</h3>
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

      {/* PRIMARY KPI STATUS */}
      <Card className="mb-4" title="Primary KPI Status">
        <div className="space-y-2">
          {primaryKpiScores.map((kpi) => {
            const status = statusFromNormalized(kpi.normalizedScore);
            const trend = trendMap.get(kpi.id) ?? 'stable';
            const appLabel = APP_LABELS[kpi.app as keyof typeof APP_LABELS];
            return (
              <div key={kpi.id} className="rounded-lg bg-felt-800 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ivory-100">{appLabel}</p>
                    <p className="text-xs text-chalk-400">{kpi.name}</p>
                  </div>
                  <span className="rounded-full bg-felt-600 px-2 py-1 text-xs text-ivory-100">{status}</span>
                </div>
                <p className="mt-2 text-chalk-300">
                  {kpi.score} {kpi.measurementUnit} vs {kpi.benchmarkTarget.toFixed(1)} · {trend}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ADVANCED METRICS BY APP */}
      {advancedKpiScores.length > 0 && (
        <Card className="mb-4" title="Advanced Metrics">
          <p className="mb-3 text-xs text-chalk-400">Detailed breakdown by app (power-user view)</p>
          <div className="space-y-3">
            {Array.from(kpisByApp.entries()).map(([app, kpis]) => {
              const isExpanded = expandedApp === app;
              const appLabel = APP_LABELS[app as keyof typeof APP_LABELS];
              return (
                <div key={app} className="border-l-2 border-felt-600">
                  <button
                    onClick={() => setExpandedApp(isExpanded ? null : app)}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-ivory-100 hover:bg-felt-800 transition"
                  >
                    {appLabel} ({kpis.length} metrics)
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 border-t border-felt-700 bg-felt-900 p-3">
                      {kpis.map((kpi: TrackerKpiDefinition & { score: number; normalizedScore: number; benchmarkTarget: number }) => {
                        const status = statusFromNormalized(kpi.normalizedScore);
                        const trend = trendMap.get(kpi.id) ?? 'stable';
                        return (
                          <div key={kpi.id} className="text-xs">
                            <div className="flex items-center justify-between">
                              <p className="text-chalk-300">{kpi.name}</p>
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                status === 'Excellent' ? 'bg-green-900 text-green-100' :
                                status === 'On Track' ? 'bg-blue-900 text-blue-100' :
                                'bg-red-900 text-red-100'
                              }`}>
                                {status}
                              </span>
                            </div>
                            <p className="mt-1 text-ivory-200">
                              {kpi.score} {kpi.measurementUnit} vs {kpi.benchmarkTarget.toFixed(1)} · {trend}
                            </p>
                            <p className="mt-0.5 text-chalk-400">{kpi.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* PLATEAU PROTOCOL */}
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
