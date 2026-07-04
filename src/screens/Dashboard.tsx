import { useEffect, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { getTrackerGamificationSnapshot } from '../utils/trackerGamification';
import { estimateFargo, phaseFromFargo } from '../utils/trackerCalculations';

export default function Dashboard() {
  const profile = useSettingsStore((s) => s.profile);
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const weeklySummaries = useTrackerStore((s) => s.weeklySummaries);
  const fargoLog = useTrackerStore((s) => s.fargoRatingLog);
  const milestoneRows = useTrackerStore((s) => s.milestoneTrackerRows);
  const syncState = useTrackerStore((s) => s.syncState);
  const flushSyncQueue = useTrackerStore((s) => s.flushSyncQueue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => flushSyncQueue();
    window.addEventListener('online', onOnline);
    if (navigator.onLine) flushSyncQueue();
    return () => window.removeEventListener('online', onOnline);
  }, [flushSyncQueue]);

  const estimatedFargo = useMemo(
    () => estimateFargo(profile.currentFargoRating, logs, fargoLog),
    [fargoLog, logs, profile.currentFargoRating],
  );
  const currentPhase = phaseFromFargo(estimatedFargo);
  const pointsToGoal = Math.max(0, 800 - profile.currentFargoRating);
  const progressToGoal = Math.round(((profile.currentFargoRating - 550) / (800 - 550)) * 100);
  const milestonesMet = milestoneRows.filter((item) => item.status === 'Met').length;
  const weeksLogged = new Set(logs.map((item) => item.weekNumber)).size;

  const currentWeekStats = weeklySummaries.at(-1);

  const fargoLineData = useMemo(
    () =>
      [...fargoLog]
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
        .map((item) => ({
          event: item.eventTournamentName,
          rating: item.newFargoRating,
          date: item.date,
        })),
    [fargoLog],
  );

  const ghostBarData = useMemo(
    () =>
      [...weeklySummaries]
        .sort((a, b) => a.weekNumber - b.weekNumber)
        .map((item) => ({
          week: item.weekNumber,
          ghost: item.ghostDrillBestWinRatePct,
        })),
    [weeklySummaries],
  );

  const gamification = useMemo(() => getTrackerGamificationSnapshot(logs), [logs]);
  const levelProgressPct =
    gamification.nextLevelXp > gamification.levelFloorXp
      ? Math.round(
          ((gamification.totalXp - gamification.levelFloorXp) /
            (gamification.nextLevelXp - gamification.levelFloorXp)) *
            100,
        )
      : 0;

  return (
    <PageWrapper title="Dashboard">
      <Card className="mb-4" title="Rating Progress">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="text-chalk-300">Current Fargo Rating</p>
          <p className="text-right text-ivory-100">{profile.currentFargoRating}</p>
          <p className="text-chalk-300">Target Fargo Rating</p>
          <p className="text-right text-ivory-100">800</p>
          <p className="text-chalk-300">Points to Goal</p>
          <p className="text-right text-ivory-100">{pointsToGoal}</p>
          <p className="text-chalk-300">Progress to Goal</p>
          <p className="text-right text-ivory-100">{Math.max(0, Math.min(100, progressToGoal))}%</p>
          <p className="text-chalk-300">Current Phase</p>
          <p className="text-right text-ivory-100">Phase {currentPhase}</p>
          <p className="text-chalk-300">Estimated Fargo (Model)</p>
          <p className="text-right text-cue-300">{estimatedFargo}</p>
        </div>
      </Card>

      <Card className="mb-4" title="Training Stats (Current Week)">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="text-chalk-300">DrillRoom Shotmaking % (Avg)</p>
          <p className="text-right text-ivory-100">{currentWeekStats?.avgDrillRoomShotmakingPct ?? 0}</p>
          <p className="text-chalk-300">Bullseye Proximity Score (Avg)</p>
          <p className="text-right text-ivory-100">{currentWeekStats?.avgBullseyeProximityScore ?? 0}</p>
          <p className="text-chalk-300">Ghost Drill Win Rate % (Best)</p>
          <p className="text-right text-ivory-100">{currentWeekStats?.ghostDrillBestWinRatePct ?? 0}</p>
          <p className="text-chalk-300">WPB Lessons This Week</p>
          <p className="text-right text-ivory-100">{currentWeekStats?.wpbLessonsCompleted ?? 0}</p>
          <p className="text-chalk-300">Weeks Logged</p>
          <p className="text-right text-ivory-100">{weeksLogged}</p>
          <p className="text-chalk-300">Milestones Met</p>
          <p className="text-right text-ivory-100">{milestonesMet}</p>
        </div>
      </Card>

      <Card className="mb-4" title="Gamification">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="text-chalk-300">Player Title</p>
          <p className="text-right text-ivory-100">{gamification.title}</p>
          <p className="text-chalk-300">Current Level</p>
          <p className="text-right text-ivory-100">{gamification.level}</p>
          <p className="text-chalk-300">Total XP</p>
          <p className="text-right text-ivory-100">{gamification.totalXp}</p>
          <p className="text-chalk-300">Training Streak</p>
          <p className="text-right text-ivory-100">{gamification.streakDays} days</p>
        </div>

        <p className="mt-3 text-xs text-chalk-300">XP to next level: {Math.max(0, gamification.nextLevelXp - gamification.totalXp)}</p>
        <div className="mt-1 h-3 rounded-full bg-felt-800">
          <div className="h-3 rounded-full bg-cue-500" style={{ width: `${Math.max(0, Math.min(100, levelProgressPct))}%` }} />
        </div>

        <div className="mt-3 space-y-2">
          {gamification.weeklyQuests.map((quest) => (
            <div key={quest.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-2 text-xs text-ivory-100">
              <p>{quest.name}</p>
              <p className="text-chalk-300">{quest.progress}/{quest.target} {quest.completed ? '· Complete' : ''}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4" title="Fargo Rating Over Time">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fargoLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#274033" />
              <XAxis dataKey="date" stroke="#d0eaf5" />
              <YAxis stroke="#d0eaf5" domain={[500, 850]} />
              <Tooltip />
              <Line type="monotone" dataKey="rating" stroke="#4CAF82" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mb-4" title="Weekly Ghost Drill Win Rate Trend">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ghostBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#274033" />
              <XAxis dataKey="week" stroke="#d0eaf5" />
              <YAxis stroke="#d0eaf5" domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="ghost" fill="#C9A84C" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mb-4" title="Offline Sync">
        <p className="text-sm text-ivory-200">Pending logs: {syncState.pendingLogIds.length}</p>
        <p className="text-sm text-ivory-200">Last sync: {syncState.lastSyncAt ? new Date(syncState.lastSyncAt).toLocaleString() : 'Not synced yet'}</p>
        <Button className="mt-3" onClick={flushSyncQueue}>Sync Now</Button>
      </Card>

      <Card className="mb-4" title="Quick Actions">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link to="/mechanics">
            <Button className="w-full">Open Mechanics Audit</Button>
          </Link>
          <Link to="/competition">
            <Button className="w-full">Open Competition Log</Button>
          </Link>
        </div>
      </Card>

      <Link to="/session/today">
        <Button className="w-full">Start Session</Button>
      </Link>
    </PageWrapper>
  );
}
