import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { mentalGameTips } from '../data/mentalGame';
import { useProgressStore } from '../store/useProgressStore';

type Scenario = 'practice' | 'match' | 'post-miss' | 'closing-rack';

export default function MentalGame() {
  const logs = useProgressStore((s) => s.mentalGameLogs);
  const addMentalGameLog = useProgressStore((s) => s.addMentalGameLog);
  const [tipId, setTipId] = useState(mentalGameTips[0]?.id ?? '');
  const [scenario, setScenario] = useState<Scenario>('practice');
  const [used, setUsed] = useState(true);
  const [effectScore, setEffectScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState('');

  const selectedTip = useMemo(
    () => mentalGameTips.find((tip) => tip.id === tipId) ?? mentalGameTips[0],
    [tipId],
  );

  const averageEffect = useMemo(() => {
    if (!logs.length) return 0;
    return Number((logs.reduce((sum, item) => sum + item.effectScore, 0) / logs.length).toFixed(1));
  }, [logs]);

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((entry) => {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [logs]);
  const scenarioStats = useMemo(() => {
    const order: Scenario[] = ['practice', 'match', 'post-miss', 'closing-rack'];
    return order.map((scenarioKey) => {
      const rows = logs.filter((entry) => entry.scenario === scenarioKey);
      const usedCount = rows.filter((entry) => entry.used).length;
      const avgEffect = rows.length
        ? Number((rows.reduce((sum, entry) => sum + entry.effectScore, 0) / rows.length).toFixed(1))
        : 0;
      return {
        scenario: scenarioKey,
        count: rows.length,
        usedRate: rows.length ? Math.round((usedCount / rows.length) * 100) : 0,
        avgEffect,
      };
    });
  }, [logs]);

  function scenarioTone(entry: { count: number; usedRate: number; avgEffect: number }): {
    label: 'Strong' | 'Watch' | 'Priority';
    cardClass: string;
    chipClass: string;
    nextAction: string;
  } {
    if (entry.count < 2) {
      return {
        label: 'Watch',
        cardClass: 'border-amber-500/45 bg-amber-950/20',
        chipClass: 'border-amber-500/55 bg-amber-950/35 text-amber-200',
        nextAction: 'Need more reps for reliable signal.',
      };
    }

    if (entry.avgEffect >= 4 && entry.usedRate >= 75) {
      return {
        label: 'Strong',
        cardClass: 'border-emerald-500/45 bg-emerald-950/20',
        chipClass: 'border-emerald-500/55 bg-emerald-950/35 text-emerald-200',
        nextAction: 'Maintain this protocol under higher pressure.',
      };
    }

    if (entry.avgEffect >= 3 && entry.usedRate >= 55) {
      return {
        label: 'Watch',
        cardClass: 'border-amber-500/45 bg-amber-950/20',
        chipClass: 'border-amber-500/55 bg-amber-950/35 text-amber-200',
        nextAction: 'Increase usage consistency in this scenario.',
      };
    }

    return {
      label: 'Priority',
      cardClass: 'border-rose-500/45 bg-rose-950/20',
      chipClass: 'border-rose-500/55 bg-rose-950/35 text-rose-200',
      nextAction: 'Train this scenario first next session.',
    };
  }

  function toneRank(label: 'Strong' | 'Watch' | 'Priority'): number {
    if (label === 'Priority') return 0;
    if (label === 'Watch') return 1;
    return 2;
  }

  function saveMentalRep(): void {
    if (!selectedTip) return;
    addMentalGameLog({
      id: `mental-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      tipId: selectedTip.id,
      category: selectedTip.category,
      scenario,
      used,
      effectScore,
      notes: notes.trim(),
    });
    setNotes('');
    setEffectScore(3);
  }

  return (
    <PageWrapper title="Mental Game">
      <Card className="mb-4" title="Mental Protocol Log">
        <p className="text-sm text-chalk-300">Log each protocol rep so mental work has a measurable table outcome.</p>
        <select
          value={tipId}
          onChange={(event) => setTipId(event.target.value)}
          className="mt-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        >
          {mentalGameTips.map((tip) => (
            <option key={tip.id} value={tip.id}>{tip.title} ({tip.category})</option>
          ))}
        </select>

        <select
          value={scenario}
          onChange={(event) => setScenario(event.target.value as Scenario)}
          className="mt-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        >
          <option value="practice">Used in practice</option>
          <option value="match">Used in match play</option>
          <option value="post-miss">Used after a miss</option>
          <option value="closing-rack">Used in closing rack pressure</option>
        </select>

        <label className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-felt-600 bg-felt-800 px-3 text-sm text-ivory-100">
          <input type="checkbox" checked={used} onChange={(event) => setUsed(event.target.checked)} className="h-4 w-4" />
          Protocol executed at the table
        </label>

        <label className="mt-2 block text-sm text-chalk-300">Effect on execution (1-5)</label>
        <select
          value={effectScore}
          onChange={(event) => setEffectScore(Math.max(1, Math.min(5, Number(event.target.value) || 3)) as 1 | 2 | 3 | 4 | 5)}
          className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        >
          <option value={1}>1 - No transfer</option>
          <option value={2}>2 - Minimal transfer</option>
          <option value={3}>3 - Some transfer</option>
          <option value={4}>4 - Strong transfer</option>
          <option value={5}>5 - Elite transfer</option>
        </select>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What changed at the table after using this protocol?"
          className="mt-2 min-h-24 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />

        <Button className="mt-3 w-full" onClick={saveMentalRep}>Save Mental Rep</Button>
      </Card>

      <Card className="mb-4" title="Table Transfer Summary">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="text-chalk-300">Logged protocol reps</p>
          <p className="text-right text-ivory-100">{logs.length}</p>
          <p className="text-chalk-300">Average effect score</p>
          <p className="text-right text-ivory-100">{averageEffect || 0}</p>
        </div>
        {categoryStats.length ? (
          <div className="mt-2 space-y-1 text-xs text-chalk-300">
            {categoryStats.map(([category, count]) => (
              <p key={category}>{category}: {count} reps</p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-chalk-300">No mental protocol reps logged yet.</p>
        )}
      </Card>

      <Card className="mb-4" title="Scenario Transfer Trends">
        <p className="text-sm text-chalk-300">Compare protocol transfer quality by context so you can train the weakest pressure scenario first.</p>
        <div className="mt-2 space-y-2">
          {[...scenarioStats]
            .sort((a, b) => {
              const toneDelta = toneRank(scenarioTone(a).label) - toneRank(scenarioTone(b).label);
              if (toneDelta !== 0) return toneDelta;
              if (a.avgEffect !== b.avgEffect) return a.avgEffect - b.avgEffect;
              if (a.usedRate !== b.usedRate) return a.usedRate - b.usedRate;
              return a.count - b.count;
            })
            .map((entry) => {
            const tone = scenarioTone(entry);
            return (
              <div key={entry.scenario} className={`rounded-lg border p-3 text-sm ${tone.cardClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-ivory-100">{entry.scenario}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-chalk-300">{entry.count} reps</p>
                    <span className={`rounded-full border px-2 py-1 text-xs ${tone.chipClass}`}>{tone.label}</span>
                  </div>
                </div>
                <p className="text-xs text-chalk-300">Used at table: {entry.usedRate}%</p>
                <p className="text-xs text-chalk-300">Average effect: {entry.avgEffect}/5</p>
                <p className="mt-1 text-xs text-chalk-200">Next action: {tone.nextAction}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="space-y-3">
        {mentalGameTips.map((tip) => (
          <Card key={tip.id}>
            <p className="text-sm text-chalk-300">{tip.category}</p>
            <p className="text-lg text-ivory-100">{tip.title}</p>
            <p className="text-ivory-200">{tip.content}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4" title="Recent Mental Reps">
        {logs.length ? (
          <div className="space-y-2">
            {logs.slice(0, 8).map((entry) => {
              const tip = mentalGameTips.find((item) => item.id === entry.tipId);
              return (
                <div key={entry.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-3 text-sm">
                  <p className="text-ivory-100">{entry.date} · {tip?.title ?? entry.tipId}</p>
                  <p className="text-chalk-300">{entry.scenario} · used: {entry.used ? 'yes' : 'no'} · effect: {entry.effectScore}/5</p>
                  {entry.notes ? <p className="text-ivory-200">{entry.notes}</p> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-chalk-300">No logged entries yet. Save your first mental rep to start trend tracking.</p>
        )}
      </Card>
    </PageWrapper>
  );
}
