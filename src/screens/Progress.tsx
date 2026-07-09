import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NumberStepperField } from '../components/ui/NumberStepperField';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { getActiveTrainingFargo } from '../utils/fargoProfile';
import {
  buildWeeklyReviewAssistant,
  calculateTournamentReadinessScore,
  estimateGoalDate,
} from '../utils/progressIntelligence';
import type { MatchResult } from '../types/tracker';

type Tab = 'weekly' | 'fargo' | 'bullseye' | 'insights';

export default function Progress() {
  const [tab, setTab] = useState<Tab>('weekly');
  const profile = useSettingsStore((s) => s.profile);
  const weeklySummaries = useTrackerStore((s) => s.weeklySummaries);
  const fargoLog = useTrackerStore((s) => s.fargoRatingLog);
  const bullseye = useTrackerStore((s) => s.bullseyeCategoryTracker);
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const sims = useTrackerStore((s) => s.matchSimSessions);
  const competition = useTrackerStore((s) => s.competitionLog);
  const confidence = useTrackerStore((s) => s.confidenceIndexHistory);
  const recoveryPlan = useTrackerStore((s) => s.recoveryRecommendationPlan);
  const addFargoRating = useTrackerStore((s) => s.addFargoRating);
  const activeTrainingFargo = getActiveTrainingFargo(profile);
  const [forecastSessionsPerWeek, setForecastSessionsPerWeek] = useState(4);
  const [forecastQualityLiftPct, setForecastQualityLiftPct] = useState(5);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventName, setEventName] = useState('');
  const [opponent, setOpponent] = useState('');
  const [matchResult, setMatchResult] = useState<MatchResult>('Win');
  const [gamesWon, setGamesWon] = useState(7);
  const [gamesLost, setGamesLost] = useState(4);
  const [newRating, setNewRating] = useState(550);
  const [notes, setNotes] = useState('');

  const sortedWeekly = useMemo(
    () => [...weeklySummaries].sort((a, b) => a.weekNumber - b.weekNumber),
    [weeklySummaries],
  );
  const forecast = useMemo(
    () =>
      estimateGoalDate(
        activeTrainingFargo,
        profile.targetFargoRating,
        fargoLog.map((item) => ({ date: item.date, rating: item.newFargoRating })),
        forecastSessionsPerWeek,
        forecastQualityLiftPct,
      ),
    [activeTrainingFargo, fargoLog, forecastQualityLiftPct, forecastSessionsPerWeek, profile.targetFargoRating],
  );
  const weeklyAssistant = useMemo(
    () => buildWeeklyReviewAssistant(logs, sims, competition, profile.currentWeek),
    [competition, logs, profile.currentWeek, sims],
  );
  const tournamentReadiness = useMemo(
    () => calculateTournamentReadinessScore(logs, sims, confidence, recoveryPlan),
    [confidence, logs, recoveryPlan, sims],
  );
  const topCoachTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    logs.forEach((item) => {
      (item.coachTags ?? []).forEach((tag) => {
        const key = tag.trim().toLowerCase();
        if (!key) return;
        tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
      });
    });
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [logs]);

  function saveFargoLog(): void {
    const previous = [...fargoLog].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).at(-1);
    addFargoRating({
      id: `fargo-${Date.now()}`,
      date,
      eventTournamentName: eventName,
      opponentFargoRating: opponent ? Number(opponent) : undefined,
      matchResult,
      gamesWon,
      gamesLost,
      newFargoRating: newRating,
      ratingChange: previous ? newRating - previous.newFargoRating : undefined,
      notes,
    });

    setEventName('');
    setOpponent('');
    setNotes('');
  }

  return (
    <PageWrapper title="Progress Review">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === 'weekly' ? 'primary' : 'secondary'} onClick={() => setTab('weekly')}>Weekly Summary</Button>
        <Button variant={tab === 'fargo' ? 'primary' : 'secondary'} onClick={() => setTab('fargo')}>Fargo Rating Log</Button>
        <Button variant={tab === 'bullseye' ? 'primary' : 'secondary'} onClick={() => setTab('bullseye')}>Bullseye Tracker</Button>
        <Button variant={tab === 'insights' ? 'primary' : 'secondary'} onClick={() => setTab('insights')}>Insights</Button>
      </div>

      {tab === 'weekly' ? (
        <Card title="Weekly Summary">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-ivory-100">
              <thead>
                <tr className="border-b border-felt-600 text-chalk-300">
                  <th className="px-2 py-2">Week</th>
                  <th className="px-2 py-2">Sessions</th>
                  <th className="px-2 py-2">Minutes</th>
                  <th className="px-2 py-2">DrillRoom %</th>
                  <th className="px-2 py-2">Bullseye Avg</th>
                  <th className="px-2 py-2">Ghost Best %</th>
                  <th className="px-2 py-2">WPB Lessons</th>
                  <th className="px-2 py-2">Line-Up Best Run</th>
                </tr>
              </thead>
              <tbody>
                {sortedWeekly.map((item) => (
                  <tr key={item.id} className="border-b border-felt-800">
                    <td className="px-2 py-2">{item.weekNumber}</td>
                    <td className="px-2 py-2">{item.sessionsCompleted}</td>
                    <td className="px-2 py-2">{item.totalTrainingMinutes}</td>
                    <td className="px-2 py-2">{item.avgDrillRoomShotmakingPct}</td>
                    <td className="px-2 py-2">{item.avgBullseyeProximityScore}</td>
                    <td className="px-2 py-2">{item.ghostDrillBestWinRatePct}</td>
                    <td className="px-2 py-2">{item.wpbLessonsCompleted}</td>
                    <td className="px-2 py-2">{item.lineUpBestScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'fargo' ? (
        <>
          <Card className="mb-4" title="Log Official Fargo Rating Update">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
              <input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Event / Tournament Name" className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
              <input type="number" inputMode="numeric" value={opponent} onChange={(event) => setOpponent(event.target.value)} placeholder="Opponent Fargo Rating" className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
              <select value={matchResult} onChange={(event) => setMatchResult(event.target.value as MatchResult)} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100">
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
              </select>
              <NumberStepperField label="Games Won" value={gamesWon} min={0} onChange={(next) => setGamesWon(Math.max(0, next))} />
              <NumberStepperField label="Games Lost" value={gamesLost} min={0} onChange={(next) => setGamesLost(Math.max(0, next))} />
              <NumberStepperField label="New Fargo Rating" value={newRating} min={200} max={900} onChange={(next) => setNewRating(Math.max(0, next))} />
              <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
            </div>
            <Button className="mt-3 w-full" onClick={saveFargoLog} disabled={!eventName.trim()}>Save Fargo Log Entry</Button>
          </Card>

          <Card title="Official Fargo Rating Log">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-ivory-100">
                <thead>
                  <tr className="border-b border-felt-600 text-chalk-300">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Event</th>
                    <th className="px-2 py-2">Opponent</th>
                    <th className="px-2 py-2">Result</th>
                    <th className="px-2 py-2">W-L</th>
                    <th className="px-2 py-2">New Rating</th>
                    <th className="px-2 py-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {[...fargoLog].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).map((item) => (
                    <tr key={item.id} className="border-b border-felt-800">
                      <td className="px-2 py-2">{item.date}</td>
                      <td className="px-2 py-2">{item.eventTournamentName}</td>
                      <td className="px-2 py-2">{item.opponentFargoRating ?? ''}</td>
                      <td className="px-2 py-2">{item.matchResult}</td>
                      <td className="px-2 py-2">{item.gamesWon}-{item.gamesLost}</td>
                      <td className="px-2 py-2">{item.newFargoRating}</td>
                      <td className="px-2 py-2">{item.ratingChange ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      {tab === 'bullseye' ? (
        <Card title="Bullseye Category Tracker">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-ivory-100">
              <thead>
                <tr className="border-b border-felt-600 text-chalk-300">
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">Level</th>
                  <th className="px-2 py-2">Last Tested</th>
                  <th className="px-2 py-2">Best Score</th>
                  <th className="px-2 py-2">Sessions</th>
                  <th className="px-2 py-2">Target by Phase</th>
                  <th className="px-2 py-2">Achievement</th>
                </tr>
              </thead>
              <tbody>
                {bullseye.map((item) => (
                  <tr key={item.id} className="border-b border-felt-800">
                    <td className="px-2 py-2">{item.category}</td>
                    <td className="px-2 py-2">{item.currentProficiencyLevel}</td>
                    <td className="px-2 py-2">{item.lastTestedDate ?? ''}</td>
                    <td className="px-2 py-2">{item.bestProximityScore ?? ''}</td>
                    <td className="px-2 py-2">{item.sessionsPracticed}</td>
                    <td className="px-2 py-2">{item.targetByPhase}</td>
                    <td className="px-2 py-2">{item.achievementUnlocked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'insights' ? (
        <>
          <Card className="mb-4" title="Goal Engine Forecast">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <NumberStepperField
                label="Sessions per week"
                value={forecastSessionsPerWeek}
                min={1}
                max={14}
                onChange={(next) => setForecastSessionsPerWeek(Math.max(1, next))}
              />
              <NumberStepperField
                label="Quality lift %"
                value={forecastQualityLiftPct}
                min={-20}
                max={60}
                onChange={(next) => setForecastQualityLiftPct(next)}
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <p className="text-chalk-300">Weekly Fargo gain (model)</p>
              <p className="text-right text-ivory-100">{forecast.weeklyGain}</p>
              <p className="text-chalk-300">Points remaining</p>
              <p className="text-right text-ivory-100">{forecast.pointsRemaining}</p>
              <p className="text-chalk-300">Forecast confidence</p>
              <p className="text-right text-ivory-100">{forecast.confidence.toUpperCase()}</p>
              <p className="text-chalk-300">Estimated target date</p>
              <p className="text-right font-medium text-cue-300">{forecast.projectedDate ?? 'Insufficient trajectory yet'}</p>
            </div>
          </Card>

          <Card className="mb-4" title="Tournament Readiness Score">
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold text-ivory-100">{tournamentReadiness.score}</p>
              <p className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-xs text-chalk-200">{tournamentReadiness.status.toUpperCase()}</p>
            </div>
            <p className="mt-2 text-sm text-chalk-300">Composite score from recent session quality, simulation pressure outcomes, and confidence trend.</p>
          </Card>

          <Card className="mb-4" title="Weekly Review Assistant">
            <p className="text-sm text-ivory-100">{weeklyAssistant.headline}</p>
            <div className="mt-2 space-y-1 rounded-lg border border-felt-600 bg-felt-800/50 p-2 text-xs text-chalk-300">
              {weeklyAssistant.improved.length ? weeklyAssistant.improved.map((item) => <p key={item}>- Improved: {item}</p>) : <p>- Improved: No clear gains yet.</p>}
              {weeklyAssistant.slipped.length ? weeklyAssistant.slipped.map((item) => <p key={item}>- Slipped: {item}</p>) : <p>- Slipped: No major regression detected.</p>}
              {weeklyAssistant.nextFocus.map((item) => <p key={item}>- Next focus: {item}</p>)}
            </div>
          </Card>

          <Card title="Coach Notes Patterns">
            {topCoachTags.length ? (
              <div className="space-y-1 text-sm text-ivory-100">
                {topCoachTags.map(([tag, count]) => (
                  <p key={tag}>#{tag} · {count} sessions</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-chalk-300">No coach tags logged yet. Add tags in Today Session to unlock pattern insights.</p>
            )}
          </Card>
        </>
      ) : null}
    </PageWrapper>
  );
}
