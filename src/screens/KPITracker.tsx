import { useState } from 'react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useKPICalc } from '../hooks/useKPICalc';
import { usePlateauDetector } from '../hooks/usePlateauDetector';
import type { TrackerKpiDefinition } from '../data/trackerKpis';

const SKILL_LABELS = {
  'accuracy': '🎯 Elite Accuracy',
  'position-play': '📍 Elite Position Play',
  'pattern-mastery': '🔄 Elite Pattern Mastery',
  'defense': '🛡️ Elite Defense',
  'pressure': '⏱️ Elite Pressure',
  'banks-kicks': '🎱 Elite Banks & Kicks',
  'jumping': '🚀 Elite Jumping',
};

export default function KPITracker() {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const { radarData, kpisBySkill, trends } = useKPICalc();
  const plateau = usePlateauDetector();

  const trendMap = new Map(trends.map((entry) => [entry.kpiId, entry.trend]));

  function statusFromNormalized(value: number): 'Excellent' | 'On Track' | 'Lagging' {
    if (value >= 105) return 'Excellent';
    if (value >= 90) return 'On Track';
    return 'Lagging';
  }

  return (
    <PageWrapper title="KPI Tracker">
      {/* ELITE SKILLS RADAR */}
      <Card className="mb-4">
        <h3 className="mb-3 text-sm font-semibold text-chalk-300">Elite Skills Assessment</h3>
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

      {/* ELITE SKILLS BY SECTION */}
      <Card className="mb-4" title="Training Progress by Skill">
        <div className="space-y-3">
          {Array.from(kpisBySkill.entries()).map(([skill, { primary, supporting }]) => {
            const isExpanded = expandedSkill === skill;
            const skillLabel = SKILL_LABELS[skill as keyof typeof SKILL_LABELS];
            const primaryStatus = statusFromNormalized(primary.normalizedScore);
            const primaryTrend = trendMap.get(primary.id) ?? 'stable';

            return (
              <div key={skill} className="rounded-lg border border-felt-700 bg-felt-800">
                {/* PRIMARY METRIC HEADER */}
                <button
                  onClick={() => setExpandedSkill(isExpanded ? null : skill)}
                  className="w-full px-4 py-3 text-left hover:bg-felt-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-ivory-100">{skillLabel}</h4>
                      <p className="text-xs text-chalk-400 mt-1">{primary.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-ivory-100">
                        {primary.score} {primary.measurementUnit}
                      </p>
                      <p className="text-xs text-chalk-300">
                        vs {primary.benchmarkTarget.toFixed(1)} · {primaryTrend}
                      </p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                        primaryStatus === 'Excellent' ? 'bg-green-900 text-green-100' :
                        primaryStatus === 'On Track' ? 'bg-blue-900 text-blue-100' :
                        'bg-red-900 text-red-100'
                      }`}>
                        {primaryStatus}
                      </span>
                    </div>
                  </div>
                </button>

                {/* SUPPORTING METRICS */}
                {isExpanded && supporting.length > 0 && (
                  <div className="border-t border-felt-700 bg-felt-900 px-4 py-3">
                    <p className="text-xs font-medium text-chalk-400 mb-3">Supporting Metrics</p>
                    <div className="space-y-2">
                      {supporting.map((kpi: TrackerKpiDefinition & { score: number; normalizedScore: number; benchmarkTarget: number }) => {
                        const status = statusFromNormalized(kpi.normalizedScore);
                        return (
                          <div key={kpi.id} className="rounded bg-felt-800 px-3 py-2 text-xs">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-ivory-100 font-medium">{kpi.name}</p>
                                <p className="text-chalk-400 text-xs mt-1">{kpi.description}</p>
                              </div>
                              <div className="text-right ml-2">
                                <p className="text-ivory-100">
                                  {kpi.score} {kpi.measurementUnit}
                                </p>
                                <p className="text-chalk-300 text-xs">
                                  vs {kpi.benchmarkTarget.toFixed(1)}
                                </p>
                                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${
                                  status === 'Excellent' ? 'bg-green-900 text-green-100' :
                                  status === 'On Track' ? 'bg-blue-900 text-blue-100' :
                                  'bg-red-900 text-red-100'
                                }`}>
                                  {status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

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
