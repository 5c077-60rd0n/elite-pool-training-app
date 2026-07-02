import { useMemo, useState } from 'react';
import {
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useProgressStore } from '../store/useProgressStore';
import { Button } from '../components/ui/Button';
import { useKPICalc } from '../hooks/useKPICalc';
import { drills } from '../data/drills';
import { isoDate } from '../utils/date';
import { usePlateauDetector } from '../hooks/usePlateauDetector';
import { useSettingsStore } from '../store/useSettingsStore';
import { useFargoEstimate } from '../hooks/useFargoEstimate';

type Tab = 'fargo' | 'kpi' | 'scorecard';

export default function Progress() {
  const [tab, setTab] = useState<Tab>('fargo');
  const [entryDate, setEntryDate] = useState(isoDate());
  const [entryRating, setEntryRating] = useState(550);
  const history = useProgressStore((s) => s.fargoHistory);
  const logs = useProgressStore((s) => s.logs);
  const addFargoPoint = useProgressStore((s) => s.addFargoPoint);
  const weeklyKpis = useProgressStore((s) => s.weeklyKpis);
  const { radarData, trends, kpiScores, weeklyHistory } = useKPICalc();
  const plateau = usePlateauDetector();
  const currentFargoRating = useSettingsStore((s) => s.profile.currentFargoRating);

  const { estimatedCurrent, projectedIn4Weeks, confidence, confidenceRange, confidenceLabel, diagnostics } = useFargoEstimate({
    currentFargoRating,
    fargoHistory: history,
    logs,
    weeklyHistory,
    kpiScores,
    trends,
  });

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => Date.parse(a.date || '') - Date.parse(b.date || '')),
    [history],
  );

  const chartData = useMemo(() => {
    const base = sortedHistory.length
      ? sortedHistory.map((point) => ({ date: point.date, rating: point.rating, estimatedRating: null as number | null }))
      : [{ date: 'Baseline', rating: currentFargoRating, estimatedRating: null as number | null }];

    return [
      ...base,
      { date: 'Now (Est.)', rating: null, estimatedRating: estimatedCurrent },
      { date: '+4 Weeks', rating: null, estimatedRating: projectedIn4Weeks },
    ];
  }, [sortedHistory, currentFargoRating, estimatedCurrent, projectedIn4Weeks]);

  const trendByKpi = useMemo(() => {
    return new Map(trends.map((entry) => [entry.kpiId, entry.trend]));
  }, [trends]);

  const scorecardRows = useMemo(() => {
    return drills.slice(0, 12).map((drill) => {
      const scores = [1, 2, 3, 4].map((weekOffset) => {
        const week = weekOffset;
        const entry = weeklyKpis.find((item) => item.week === week);
        return entry?.value ?? 0;
      });
      return {
        drillName: drill.name,
        target: drill.targetScore.phase1,
        scores,
      };
    });
  }, [weeklyKpis]);

  function logFargo(): void {
    addFargoPoint({ date: entryDate, rating: entryRating });
  }

  return (
    <PageWrapper title="Progress">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === 'fargo' ? 'primary' : 'secondary'} onClick={() => setTab('fargo')}>Fargo Journey</Button>
        <Button variant={tab === 'kpi' ? 'primary' : 'secondary'} onClick={() => setTab('kpi')}>KPI Dashboard</Button>
        <Button variant={tab === 'scorecard' ? 'primary' : 'secondary'} onClick={() => setTab('scorecard')}>Weekly Scorecard</Button>
      </div>

      {tab === 'fargo' ? (
        <Card title="Fargo Journey">
          <div className="mb-3 rounded-xl border border-felt-600 bg-felt-800/70 p-3">
            <p className="text-xs uppercase tracking-wide text-chalk-300">Estimated Fargo (Practice Model)</p>
            <p className="text-2xl font-semibold text-cue-400">{estimatedCurrent}</p>
            <p className="text-sm text-ivory-200">
              Confidence range: {confidenceRange[0]}-{confidenceRange[1]} · Confidence: {Math.round(confidence * 100)}% ({confidenceLabel})
            </p>
            <p className="text-xs text-chalk-300">Projection in 4 weeks: {projectedIn4Weeks} · Based on KPI-to-Fargo benchmark inversion and recent target rates.</p>
          </div>

          <div className="mb-3 rounded-xl border border-felt-600 bg-felt-800/70 p-3">
            <p className="text-xs uppercase tracking-wide text-chalk-300">Model Diagnostics</p>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-ivory-100 sm:grid-cols-2">
              <p>Data sufficiency: {diagnostics.dataSufficiency}%</p>
              <p>Calibration fit: {diagnostics.calibrationFitQuality}%</p>
              <p>Sessions used: {diagnostics.contributingSessions}</p>
              <p>Drill results used: {diagnostics.contributingDrillResults}</p>
              <p>KPI signals used: {diagnostics.contributingKpis}</p>
              <p>Calibration points: {diagnostics.calibrationPoints}</p>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              type="date"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
              className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
            <input
              type="number"
              value={entryRating}
              onChange={(event) => setEntryRating(Number(event.target.value))}
              className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
            <Button onClick={logFargo}>Log Rating</Button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="#d0eaf5" />
                <YAxis stroke="#d0eaf5" />
                <Tooltip />
                <Line type="monotone" dataKey="rating" name="Logged Fargo" stroke="#e0bf6b" strokeWidth={3} dot={false} />
                <Line
                  type="monotone"
                  dataKey="estimatedRating"
                  name="Estimated Fargo"
                  stroke="#5fc5ff"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {tab === 'kpi' ? (
        <Card title="KPI Radar">
          {plateau.isOnPlateau ? (
            <div className="mb-3 rounded-lg border border-amber-500/60 bg-amber-500/10 p-3 text-sm text-amber-200">
              Plateau alert: {plateau.weeksAtSameLevel}+ weeks stable/declining. Review protocol in KPI Tracker.
            </div>
          ) : null}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <Radar dataKey="value" stroke="#e0bf6b" fill="#e0bf6b" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-2">
            {kpiScores.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg bg-felt-800 p-2 text-sm">
                <span className="text-ivory-100">{entry.name}</span>
                <span className="text-chalk-300">
                  {entry.normalizedScore}% of benchmark · {trendByKpi.get(entry.id) ?? 'stable'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === 'scorecard' ? (
        <Card title="Weekly Scorecard">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-ivory-100">
              <thead>
                <tr className="border-b border-felt-600 text-chalk-300">
                  <th className="px-2 py-2">Drill</th>
                  <th className="px-2 py-2">Target</th>
                  <th className="px-2 py-2">W1</th>
                  <th className="px-2 py-2">W2</th>
                  <th className="px-2 py-2">W3</th>
                  <th className="px-2 py-2">W4</th>
                </tr>
              </thead>
              <tbody>
                {scorecardRows.map((row) => (
                  <tr key={row.drillName} className="border-b border-felt-800">
                    <td className="px-2 py-2">{row.drillName}</td>
                    <td className="px-2 py-2">{row.target}</td>
                    {row.scores.map((value, index) => (
                      <td key={`${row.drillName}-${index}`} className="px-2 py-2">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </PageWrapper>
  );
}
