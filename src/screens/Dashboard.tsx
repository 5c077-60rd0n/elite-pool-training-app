import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { getTipOfDay } from '../data/mentalGame';
import { useProgramStore, getProgramWeek } from '../store/useProgramStore';
import { useProgressStore } from '../store/useProgressStore';
import { getGamificationSnapshot } from '../utils/gamification';
import { useMemo } from 'react';

export default function Dashboard() {
  const currentWeek = useProgramStore((s) => s.currentWeek);
  const logs = useProgressStore((s) => s.logs);
  const week = getProgramWeek(currentWeek);
  const tip = getTipOfDay();
  const game = useMemo(() => getGamificationSnapshot(logs), [logs]);
  const levelProgress =
    game.nextLevelXp > game.levelFloorXp
      ? ((game.totalXp - game.levelFloorXp) / (game.nextLevelXp - game.levelFloorXp)) * 100
      : 0;

  return (
    <PageWrapper title="Dashboard">
      <Card className="mb-4 bg-gradient-to-br from-felt-700 to-felt-800">
        <p className="text-sm text-chalk-300">Week {week.week} of 52</p>
        <p className="text-xl font-semibold text-ivory-100">Phase {week.phase} · {week.theme}</p>
      </Card>

      <Card title="Training XP" className="mb-4">
        <div className="mb-2 flex items-end justify-between">
          <p className="text-3xl font-semibold text-ivory-100">Level {game.level}</p>
          <p className="text-sm text-chalk-300">{game.totalXp} XP</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-felt-600">
          <div className="h-full bg-cue-400" style={{ width: `${Math.max(0, Math.min(100, levelProgress))}%` }} />
        </div>
        <p className="mt-2 text-sm text-chalk-300">
          {Math.max(0, game.nextLevelXp - game.totalXp)} XP to level {game.level + 1}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-felt-600 bg-felt-800/60 p-2">
            <p className="text-chalk-300">Season Tier</p>
            <p className="text-lg text-ivory-100">{game.seasonTier}</p>
          </div>
          <div className="rounded-xl border border-felt-600 bg-felt-800/60 p-2">
            <p className="text-chalk-300">North Star</p>
            <p className="text-lg text-ivory-100">{game.northStarQualitySessions} quality sessions</p>
          </div>
        </div>
      </Card>

      <Card title="Weekly Quests" className="mb-4">
        <div className="space-y-3">
          {game.weeklyQuests.map((quest) => {
            const progressPct = Math.min(100, (quest.progress / Math.max(1, quest.target)) * 100);
            return (
              <div key={quest.id} className="rounded-xl border border-felt-600 bg-felt-800/60 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm text-ivory-100">{quest.name}</p>
                  <p className="text-xs text-chalk-300">
                    {quest.progress}/{quest.target}
                  </p>
                </div>
                <p className="mb-2 text-xs text-chalk-300">{quest.description}</p>
                <div className="h-2 overflow-hidden rounded-full bg-felt-600">
                  <div className="h-full bg-flash-400" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Player Identity" className="mb-4">
        <p className="text-sm text-chalk-300">Current title</p>
        <p className="text-xl text-ivory-100">{game.title}</p>
        <p className="mt-2 text-sm text-chalk-300">Streak: {game.streakDays} days</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {game.badges.length ? (
            game.badges.map((badge) => (
              <span key={badge} className="rounded-full border border-cue-600/60 bg-felt-800 px-3 py-1 text-xs text-cue-300">
                {badge}
              </span>
            ))
          ) : (
            <span className="text-sm text-chalk-300">Complete quality sessions to earn badges.</span>
          )}
        </div>
      </Card>

      <Card title="Today's Session" className="mb-4">
        <p className="mb-3 text-ivory-100">{week.dailySessions.monday.focusArea} · 60 minutes</p>
        <Link to="/session/today">
          <Button>Start Session</Button>
        </Link>
      </Card>

      <Card title="Mental Game Tip">
        <p className="text-sm text-chalk-300">{tip.title}</p>
        <p className="text-ivory-100">{tip.content}</p>
      </Card>
    </PageWrapper>
  );
}
