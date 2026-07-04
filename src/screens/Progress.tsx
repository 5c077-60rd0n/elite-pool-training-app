import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useTrackerStore } from '../store/useTrackerStore';
import type { MatchResult } from '../types/tracker';

type Tab = 'weekly' | 'fargo' | 'bullseye';

export default function Progress() {
  const [tab, setTab] = useState<Tab>('weekly');
  const weeklySummaries = useTrackerStore((s) => s.weeklySummaries);
  const fargoLog = useTrackerStore((s) => s.fargoRatingLog);
  const bullseye = useTrackerStore((s) => s.bullseyeCategoryTracker);
  const addFargoRating = useTrackerStore((s) => s.addFargoRating);

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
    <PageWrapper title="Tracking">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === 'weekly' ? 'primary' : 'secondary'} onClick={() => setTab('weekly')}>Weekly Summary</Button>
        <Button variant={tab === 'fargo' ? 'primary' : 'secondary'} onClick={() => setTab('fargo')}>Fargo Rating Log</Button>
        <Button variant={tab === 'bullseye' ? 'primary' : 'secondary'} onClick={() => setTab('bullseye')}>Bullseye Tracker</Button>
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
                  <th className="px-2 py-2">Line-Up Best</th>
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
              <input value={opponent} onChange={(event) => setOpponent(event.target.value)} placeholder="Opponent Fargo Rating" className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
              <select value={matchResult} onChange={(event) => setMatchResult(event.target.value as MatchResult)} className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100">
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
              </select>
              <input type="number" value={gamesWon} onChange={(event) => setGamesWon(Number(event.target.value) || 0)} placeholder="Games Won" className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
              <input type="number" value={gamesLost} onChange={(event) => setGamesLost(Number(event.target.value) || 0)} placeholder="Games Lost" className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
              <input type="number" value={newRating} onChange={(event) => setNewRating(Number(event.target.value) || 0)} placeholder="New Fargo Rating" className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100" />
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
    </PageWrapper>
  );
}
