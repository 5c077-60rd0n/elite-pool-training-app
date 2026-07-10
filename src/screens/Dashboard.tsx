import { useEffect, useMemo, useState } from 'react';
import {
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
import { useNotificationStore } from '../store/useNotificationStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { calculateDrillReadinessScore } from '../utils/matchSimulator';
import { getNotificationInsights } from '../utils/notificationIntelligence';
import { buildPauseUntilIso, isPaused, shouldPauseSmartAlerts } from '../utils/notificationThrottle';
import { calculateTournamentReadinessScore } from '../utils/progressIntelligence';
import { getActiveTrainingFargo } from '../utils/fargoProfile';
import { getTrackerGamificationSnapshot } from '../utils/trackerGamification';
import { estimateFargo, phaseFromFargo } from '../utils/trackerCalculations';
import { estimateLatestWpbFargo } from '../utils/wpbFargo';

export default function Dashboard() {
  const profile = useSettingsStore((s) => s.profile);
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const weeklySummaries = useTrackerStore((s) => s.weeklySummaries);
  const fargoLog = useTrackerStore((s) => s.fargoRatingLog);
  const adaptiveDailyPlan = useTrackerStore((s) => s.adaptiveDailyPlan);
  const recoveryRecommendationPlan = useTrackerStore((s) => s.recoveryRecommendationPlan);
  const lastSessionRecommendation = useTrackerStore((s) => s.lastSessionRecommendation);
  const matchSimSessions = useTrackerStore((s) => s.matchSimSessions);
  const personalRecords = useTrackerStore((s) => s.personalRecords);
  const confidenceIndexHistory = useTrackerStore((s) => s.confidenceIndexHistory);
  const milestoneRows = useTrackerStore((s) => s.milestoneTrackerRows);
  const syncState = useTrackerStore((s) => s.syncState);
  const flushSyncQueue = useTrackerStore((s) => s.flushSyncQueue);
  const notificationsEnabled = useNotificationStore((s) => s.enabled);
  const lastSmartAlertAt = useNotificationStore((s) => s.lastSmartAlertAt);
  const smartAlertHistory = useNotificationStore((s) => s.smartAlertHistory);
  const smartAlertsPausedUntil = useNotificationStore((s) => s.smartAlertsPausedUntil);
  const markSmartAlertTriggered = useNotificationStore((s) => s.markSmartAlertTriggered);
  const recordSmartAlertSent = useNotificationStore((s) => s.recordSmartAlertSent);
  const setSmartAlertsPausedUntil = useNotificationStore((s) => s.setSmartAlertsPausedUntil);
  const [showDeepInsights, setShowDeepInsights] = useState(false);
  const activeTrainingFargo = getActiveTrainingFargo(profile);

  const estimatedFargo = useMemo(
    () => estimateFargo(activeTrainingFargo, logs, fargoLog),
    [activeTrainingFargo, fargoLog, logs],
  );
  const wpbEstimatedFargo = useMemo(() => estimateLatestWpbFargo(logs), [logs]);
  const currentPhase = phaseFromFargo(estimatedFargo);
  const pointsToGoal = Math.max(0, 800 - activeTrainingFargo);
  const progressToGoal = Math.round(((activeTrainingFargo - 550) / (800 - 550)) * 100);
  const milestonesMet = milestoneRows.filter((item) => item.status === 'Met').length;
  const weeksLogged = new Set(logs.map((item) => item.weekNumber)).size;

  const currentWeekStats = weeklySummaries.at(-1);
  const currentWeekWpbLessons = useMemo(
    () => logs.filter((item) => item.weekNumber === profile.currentWeek && item.wpbLesson === 'Yes').length,
    [logs, profile.currentWeek],
  );

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

  const confidenceLineData = useMemo(
    () =>
      [...confidenceIndexHistory]
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
        .map((item) => ({
          date: item.date,
          confidence: item.score,
        })),
    [confidenceIndexHistory],
  );

  const gamification = useMemo(() => getTrackerGamificationSnapshot(logs), [logs]);
  const latestMatchSimulation = useMemo(
    () => [...matchSimSessions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0],
    [matchSimSessions],
  );
  const drillReadinessScore = useMemo(() => calculateDrillReadinessScore(logs), [logs]);
  const tournamentReadiness = useMemo(
    () => calculateTournamentReadinessScore(logs, matchSimSessions, confidenceIndexHistory, recoveryRecommendationPlan),
    [confidenceIndexHistory, logs, matchSimSessions, recoveryRecommendationPlan],
  );
  const notificationInsights = useMemo(
    () => getNotificationInsights(logs, gamification, adaptiveDailyPlan, recoveryRecommendationPlan),
    [adaptiveDailyPlan, gamification, logs, recoveryRecommendationPlan],
  );
  const levelProgressPct =
    gamification.nextLevelXp > gamification.levelFloorXp
      ? Math.round(
          ((gamification.totalXp - gamification.levelFloorXp) /
            (gamification.nextLevelXp - gamification.levelFloorXp)) *
            100,
        )
      : 0;
  const weekIn60 = useMemo(() => {
    if (currentWeekStats) {
      return {
        sessions: currentWeekStats.sessionsCompleted,
        minutes: currentWeekStats.totalTrainingMinutes,
        drillRoomAvg: currentWeekStats.avgDrillRoomShotmakingPct,
        lineUpBest: currentWeekStats.lineUpBestScore,
      };
    }

    const thisWeekLogs = logs.filter((item) => item.weekNumber === profile.currentWeek);
    if (!thisWeekLogs.length) {
      return {
        sessions: 0,
        minutes: 0,
        drillRoomAvg: 0,
        lineUpBest: 0,
      };
    }

    return {
      sessions: thisWeekLogs.length,
      minutes: thisWeekLogs.reduce((sum, item) => sum + item.lengthMinutes, 0),
      drillRoomAvg: Math.round(thisWeekLogs.reduce((sum, item) => sum + item.drillRoomShotmakingPct, 0) / thisWeekLogs.length),
      lineUpBest: Math.max(...thisWeekLogs.map((item) => item.lineUpShotCount).filter((value) => value > 0), 0),
    };
  }, [currentWeekStats, logs, profile.currentWeek]);

  const deepInsightsVisible = !profile.adhdModeEnabled || showDeepInsights;
  const nextAction = useMemo(() => {
    if (lastSessionRecommendation?.nextStep) {
      return lastSessionRecommendation.nextStep;
    }
    if (recoveryRecommendationPlan?.actions?.length) {
      return recoveryRecommendationPlan.actions[0];
    }
    if (adaptiveDailyPlan?.actionChecklist?.length) {
      return adaptiveDailyPlan.actionChecklist[0];
    }
    return 'Run one focused session and save the log before opening analytics.';
  }, [adaptiveDailyPlan, lastSessionRecommendation, recoveryRecommendationPlan]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const nextAlert = notificationInsights[0];
    if (!nextAlert) return;

    if (isPaused(smartAlertsPausedUntil)) return;

    const today = new Date().toISOString().slice(0, 10);
    if (lastSmartAlertAt[nextAlert.id] === today) return;

    const notification = new Notification(nextAlert.title, {
      body: nextAlert.message,
      tag: `smart-alert-${nextAlert.id}`,
    });
    notification.onclick = () => window.focus();

    markSmartAlertTriggered(nextAlert.id, today);
    const sentAt = new Date().toISOString();
    recordSmartAlertSent(sentAt);

    if (shouldPauseSmartAlerts([...smartAlertHistory, sentAt])) {
      setSmartAlertsPausedUntil(buildPauseUntilIso());
    }
  }, [
    lastSmartAlertAt,
    markSmartAlertTriggered,
    notificationInsights,
    notificationsEnabled,
    recordSmartAlertSent,
    setSmartAlertsPausedUntil,
    smartAlertHistory,
    smartAlertsPausedUntil,
  ]);

  return (
    <PageWrapper title="Dashboard">
      <Card className="mb-4 border-cue-500/25 bg-gradient-to-br from-cue-950/25 via-felt-800/90 to-felt-900/95 p-4 sm:p-5" title="Coaching Loop">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-flash-500/30 bg-flash-950/20 px-2 py-1 text-flash-200">Home Base</span>
          {profile.adhdModeEnabled ? (
            <span className="rounded-full border border-cue-600/60 bg-cue-900/20 px-2 py-1 text-cue-200">ADHD Focus Surface</span>
          ) : null}
          {lastSessionRecommendation ? (
            <span className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-chalk-200">Next mode: {lastSessionRecommendation.nextMode.toUpperCase()}</span>
          ) : null}
        </div>
        <div className="mt-3 rounded-2xl border border-cue-600/30 bg-cue-950/15 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-cue-300">Primary move</p>
          <p className="mt-2 text-2xl font-semibold leading-tight text-ivory-100 sm:text-3xl">{nextAction}</p>
          <p className="mt-2 text-xs text-chalk-300">CueSports coaching rule: complete one clear action before reviewing extra metrics.</p>
        </div>
        {lastSessionRecommendation ? (
          <div className="mt-3 rounded-2xl border border-felt-600/60 bg-felt-800/55 p-4 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.12em] text-cue-300">Session carryover</p>
            <p className="text-sm text-ivory-100">{lastSessionRecommendation.title}</p>
            <p className="mt-1 text-sm text-chalk-300">{lastSessionRecommendation.rationale}</p>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-felt-600/60 bg-felt-800/50 p-3">
            <p className="text-xs uppercase tracking-[0.1em] text-chalk-300">Training Fargo</p>
            <p className="mt-1 text-lg text-ivory-100">{activeTrainingFargo}</p>
          </div>
          <div className="rounded-xl border border-felt-600/60 bg-felt-800/50 p-3">
            <p className="text-xs uppercase tracking-[0.1em] text-chalk-300">WPB Est Fargo</p>
            <p className="mt-1 text-lg text-cue-300">{wpbEstimatedFargo ?? '\u2014'}</p>
          </div>
          <div className="rounded-xl border border-felt-600/60 bg-felt-800/50 p-3">
            <p className="text-xs uppercase tracking-[0.1em] text-chalk-300">Week</p>
            <p className="mt-1 text-lg text-ivory-100">{profile.currentWeek}</p>
          </div>
          <div className="rounded-xl border border-felt-600/60 bg-felt-800/50 p-3">
            <p className="text-xs uppercase tracking-[0.1em] text-chalk-300">Streak</p>
            <p className="mt-1 text-lg text-ivory-100">{gamification.streakDays} days</p>
          </div>
          <div className="rounded-xl border border-felt-600/60 bg-felt-800/50 p-3">
            <p className="text-xs uppercase tracking-[0.1em] text-chalk-300">Focus</p>
            <p className="mt-1 text-lg text-ivory-100">{profile.adhdModeEnabled ? 'Light' : 'Full'}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link to="/session/today">
            <Button className="w-full">Start Today&apos;s Session</Button>
          </Link>
          {profile.adhdModeEnabled ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeepInsights((prev) => !prev)}
            >
              {showDeepInsights ? 'Hide Deep Insights' : 'Show Deep Insights'}
            </Button>
          ) : (
            <Link to="/progress">
              <Button className="w-full" variant="secondary">Open Progress</Button>
            </Link>
          )}
        </div>
      </Card>

      {deepInsightsVisible ? (
        <>
          <Card className="mb-4" title="Rating Progress">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-chalk-300">Training Fargo Rating</p>
              <p className="text-right text-ivory-100">{activeTrainingFargo}</p>
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
              <p className="text-chalk-300">WPB Estimated Fargo</p>
              <p className="text-right text-cue-300">{wpbEstimatedFargo ?? '\u2014'}</p>
            </div>
          </Card>

          <Card className="mb-4" title="Current Week KPIs">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-chalk-300">DrillRoom Shotmaking % (Avg)</p>
              <p className="text-right text-ivory-100">{currentWeekStats?.avgDrillRoomShotmakingPct ?? 0}</p>
              <p className="text-chalk-300">Bullseye Proximity Score (Avg)</p>
              <p className="text-right text-ivory-100">{currentWeekStats?.avgBullseyeProximityScore ?? 0}</p>
              <p className="text-chalk-300">WPB Lessons This Week</p>
              <p className="text-right text-ivory-100">{currentWeekWpbLessons}</p>
              <p className="text-chalk-300">Weeks Logged</p>
              <p className="text-right text-ivory-100">{weeksLogged}</p>
              <p className="text-chalk-300">Milestones Met</p>
              <p className="text-right text-ivory-100">{milestonesMet}</p>
            </div>
          </Card>

          <Card className="mb-4" title="Tournament Readiness">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-3xl font-semibold text-ivory-100">{tournamentReadiness.score}</p>
              <p className="rounded-full border border-felt-600 bg-felt-800/80 px-2 py-1 text-xs text-chalk-200">{tournamentReadiness.status.toUpperCase()}</p>
            </div>
            <p className="mb-2 text-xs text-chalk-300">One-glance readiness from training consistency, pressure simulation, and confidence trend.</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-chalk-300">Readiness score</p>
              <p className="text-right text-ivory-100">{tournamentReadiness.score}</p>
              <p className="text-chalk-300">Status</p>
              <p className="text-right text-ivory-100">{tournamentReadiness.status.toUpperCase()}</p>
              <p className="text-chalk-300">Drill readiness</p>
              <p className="text-right text-ivory-100">{drillReadinessScore}</p>
              <p className="text-chalk-300">Latest match readiness</p>
              <p className="text-right text-ivory-100">{latestMatchSimulation?.matchReadinessScore ?? 0}</p>
            </div>
          </Card>
        </>
      ) : null}

      {deepInsightsVisible ? (
        <Card className="mb-4" title="This Week in 60 Seconds">
        {weekIn60.sessions ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-chalk-300">Sessions</p>
              <p className="text-right text-ivory-100">{weekIn60.sessions}</p>
              <p className="text-chalk-300">Minutes</p>
              <p className="text-right text-ivory-100">{weekIn60.minutes}</p>
              <p className="text-chalk-300">DrillRoom Avg</p>
              <p className="text-right text-ivory-100">{weekIn60.drillRoomAvg}%</p>
              <p className="text-chalk-300">Line-Up Best Run</p>
              <p className="text-right text-ivory-100">{weekIn60.lineUpBest}</p>
              <p className="text-chalk-300">Confidence</p>
              <p className="text-right text-ivory-100">{confidenceIndexHistory[0]?.score ?? 0}</p>
            </div>
            <Link to="/progress">
              <Button className="mt-3">Open Weekly Review</Button>
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-chalk-300">No sessions logged for this week yet. Complete one short session to unlock your 60-second review.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link to="/session/today">
                <Button className="w-full">Start Today&apos;s Session</Button>
              </Link>
              <Link to="/match-simulator">
                <Button className="w-full" variant="secondary">Open Match Simulator</Button>
              </Link>
            </div>
          </>
        )}
        </Card>
      ) : null}

      {deepInsightsVisible ? (
        <>

      {notificationInsights.length ? (
        <Card className="mb-4" title="Notification Intelligence">
          <div className="space-y-2">
            {notificationInsights.map((insight) => (
              <div key={insight.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-2">
                <p className="text-sm text-ivory-100">{insight.title}</p>
                <p className="text-xs text-chalk-300">{insight.message}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {adaptiveDailyPlan ? (
        <Card className="mb-4" title="Adaptive Plan">
          <p className="text-sm text-ivory-100">Focus: {adaptiveDailyPlan.focusKpiName}</p>
          <p className="mt-1 text-xs text-chalk-300">{adaptiveDailyPlan.rationale}</p>
          <p className="mt-2 text-xs text-ivory-200">Session length: {adaptiveDailyPlan.recommendedMinutes} minutes</p>
          <p className="mt-1 text-xs text-ivory-200">
            Target metrics: DrillRoom {adaptiveDailyPlan.targetMetrics.drillRoomShotmakingPct}% · Safety {adaptiveDailyPlan.targetMetrics.safetyExchangeSuccessPct}%
          </p>
        </Card>
      ) : null}

      {recoveryRecommendationPlan ? (
        <Card className="mb-4" title="3-Day Recovery Plan">
          <p className="text-sm text-ivory-100">Focus: {recoveryRecommendationPlan.focusKpiName}</p>
          <p className="mt-1 text-xs text-chalk-300">{recoveryRecommendationPlan.rationale}</p>
          <p className="mt-1 text-xs text-ivory-200">Severity: {recoveryRecommendationPlan.severity.toUpperCase()} · Trigger: {recoveryRecommendationPlan.trigger}</p>
          <p className="mt-1 text-xs text-ivory-200">Recommended area: {recoveryRecommendationPlan.recommendedFocusArea}</p>
          <div className="mt-2 space-y-1 text-xs text-chalk-300">
            {recoveryRecommendationPlan.actions.slice(0, 2).map((action) => (
              <p key={action}>- {action}</p>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mb-4" title="Match Readiness">
        {latestMatchSimulation ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-chalk-300">Last Simulation Date</p>
              <p className="text-right text-ivory-100">{latestMatchSimulation.date}</p>
              <p className="text-chalk-300">Match Readiness Score</p>
              <p className="text-right text-ivory-100">{latestMatchSimulation.matchReadinessScore}</p>
              <p className="text-chalk-300">Drill Readiness Score</p>
              <p className="text-right text-ivory-100">{drillReadinessScore}</p>
              <p className="text-chalk-300">Opponent Archetype</p>
              <p className="text-right text-ivory-100">{latestMatchSimulation.opponentArchetype}</p>
            </div>
            <p className="mt-2 text-xs text-chalk-300">
              Gap: {latestMatchSimulation.matchReadinessScore - drillReadinessScore >= 0 ? '+' : ''}
              {latestMatchSimulation.matchReadinessScore - drillReadinessScore} points
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-chalk-300">No simulation yet. Run one race-format simulation to baseline match readiness.</p>
            <Link to="/match-simulator">
              <Button className="mt-3">Open Match Simulator</Button>
            </Link>
          </>
        )}
      </Card>

      <Card className="mb-4" title="Confidence Index">
        {confidenceIndexHistory.length ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-chalk-300">Current Confidence</p>
              <p className="text-right text-ivory-100">{confidenceIndexHistory[0].score}</p>
              <p className="text-chalk-300">Training Consistency</p>
              <p className="text-right text-ivory-100">{confidenceIndexHistory[0].components.trainingConsistency}</p>
              <p className="text-chalk-300">Match Readiness Signal</p>
              <p className="text-right text-ivory-100">{confidenceIndexHistory[0].components.matchReadiness}</p>
              <p className="text-chalk-300">Recent Results Signal</p>
              <p className="text-right text-ivory-100">{confidenceIndexHistory[0].components.recentResults}</p>
            </div>
            <p className="mt-2 text-xs text-chalk-300">{confidenceIndexHistory[0].rationale}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-chalk-300">Confidence index will populate after recent training and match logs are available.</p>
            <Link to="/session/today">
              <Button className="mt-3" variant="secondary">Log First Session</Button>
            </Link>
          </>
        )}
      </Card>

      <Card className="mb-4" title="Personal Records">
        {personalRecords.length ? (
          <div className="space-y-2">
            {personalRecords.slice(0, 6).map((record) => (
              <div key={record.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-2 text-sm">
                <p className="text-ivory-100">{record.label}</p>
                <p className="text-chalk-300">{record.value} {record.unit} · {record.achievedAt}</p>
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-chalk-300">No records yet. Log one session or simulation to create your first baseline.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link to="/session/today">
                <Button className="w-full">Start Today&apos;s Session</Button>
              </Link>
              <Link to="/match-simulator">
                <Button className="w-full" variant="secondary">Open Match Simulator</Button>
              </Link>
            </div>
          </>
        )}
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

      <Card className="mb-4" title="Season Ladder">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="text-chalk-300">Season</p>
          <p className="text-right text-ivory-100">{gamification.seasonMeta.name}</p>
          <p className="text-chalk-300">Theme</p>
          <p className="text-right text-ivory-100">{gamification.seasonMeta.theme}</p>
          <p className="text-chalk-300">Ladder Tier</p>
          <p className="text-right text-ivory-100">{gamification.seasonMeta.ladderTier}</p>
          <p className="text-chalk-300">Ladder Rank</p>
          <p className="text-right text-ivory-100">#{gamification.seasonMeta.ladderRank}</p>
          <p className="text-chalk-300">7-Day Quality Avg</p>
          <p className="text-right text-ivory-100">{gamification.seasonChallenges.qualityScore7DayAvg}</p>
        </div>

        <div className="mt-3 space-y-2">
          {gamification.seasonChallenges.themedQuestChain.map((step) => (
            <div key={step.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-2 text-xs text-ivory-100">
              <p>{step.title}</p>
              <p className="text-chalk-300">{step.description}</p>
              <p className="text-chalk-300">{step.progress}/{step.target} {step.completed ? '· Complete' : ''}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {gamification.seasonChallenges.bossChallenges.map((boss) => (
            <div key={boss.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-2 text-xs text-ivory-100">
              <p>{boss.title}</p>
              <p className="text-chalk-300">{boss.description}</p>
              <p className="text-chalk-300">Attempts: {boss.attempts} {boss.completed ? '· Defeated' : '· In Progress'}</p>
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

      <Card className="mb-4" title="Confidence Trend">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={confidenceLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#274033" />
              <XAxis dataKey="date" stroke="#d0eaf5" />
              <YAxis stroke="#d0eaf5" domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="confidence" stroke="#F7C96B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mb-4" title="Sync Queue">
        <p className="text-sm text-ivory-200">Pending logs: {syncState.pendingLogIds.length}</p>
        <p className="text-sm text-ivory-200">Last sync: {syncState.lastSyncAt ? new Date(syncState.lastSyncAt).toLocaleString() : 'Not synced yet'}</p>
        <Button className="mt-3" onClick={flushSyncQueue}>Sync Now</Button>
      </Card>

      <Card className="mb-4" title="Launchpad">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link to="/mechanics">
            <Button className="w-full">Open Mechanics Audit</Button>
          </Link>
          <Link to="/competition">
            <Button className="w-full">Open Competition Log</Button>
          </Link>
          <Link to="/elite-lab">
            <Button className="w-full">Open Elite Performance Lab</Button>
          </Link>
        </div>
      </Card>

        </>
      ) : null}

      <Link to="/session/today">
        <Button className="w-full">Open Today's Session</Button>
      </Link>
    </PageWrapper>
  );
}
