import type { DailySessionLog } from '../types/tracker';
import { getTrainingStreak } from './streak';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TrackerSessionReward {
  qualityScore: number;
  xpEarned: number;
  bonusTags: string[];
}

export interface TrackerQuestProgress {
  id: string;
  name: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface TrackerGamificationSnapshot {
  totalXp: number;
  level: number;
  levelFloorXp: number;
  nextLevelXp: number;
  streakDays: number;
  title: string;
  weeklyQuests: TrackerQuestProgress[];
  latestSession?: TrackerSessionReward;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function levelFloor(level: number): number {
  return 120 * level * level;
}

function levelFromXp(totalXp: number): { level: number; floorXp: number; nextXp: number } {
  let level = 1;
  while (levelFloor(level + 1) <= totalXp) level += 1;
  return {
    level,
    floorXp: levelFloor(level),
    nextXp: levelFloor(level + 1),
  };
}

function toEpochDay(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / DAY_MS);
}

function weekStartIso(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function evaluateTrackerSessionReward(
  log: DailySessionLog,
  historicalLogs: DailySessionLog[],
): TrackerSessionReward {
  const drillRoom = clamp(log.drillRoomShotmakingPct, 0, 100);
  const ghost = clamp(log.ghostDrillWinRatePct, 0, 100);
  const safety = clamp(log.safetyExchangeSuccessPct, 0, 100);
  const bullseye = clamp((5 - log.bullseyeProximity) * 20, 0, 100);
  const lineup = clamp(((30 - log.lineUpShotCount) / 30) * 100, 0, 100);

  const qualityScore = Math.round(
    drillRoom * 0.3 +
      ghost * 0.25 +
      safety * 0.2 +
      bullseye * 0.15 +
      lineup * 0.1,
  );

  let xpEarned = Math.round(40 + qualityScore * 1.8 + (log.wpbLesson === 'Yes' ? 18 : 0));
  const bonusTags: string[] = [];

  if (qualityScore >= 85) {
    xpEarned += 20;
    bonusTags.push('Elite quality');
  }
  if (drillRoom >= 80 && ghost >= 60) {
    xpEarned += 12;
    bonusTags.push('Pressure conversion');
  }

  const sevenDaysAgo = toEpochDay(log.date) - 7;
  const recentFocusRepeats = historicalLogs
    .filter((item) => toEpochDay(item.date) >= sevenDaysAgo)
    .filter((item) => item.focusArea.trim().toLowerCase() === log.focusArea.trim().toLowerCase()).length;
  if (recentFocusRepeats >= 5) {
    xpEarned = Math.round(xpEarned * 0.92);
    bonusTags.push('Variety reminder');
  }

  return {
    qualityScore: clamp(qualityScore, 0, 100),
    xpEarned: Math.max(0, xpEarned),
    bonusTags,
  };
}

function computeWeeklyQuests(
  thisWeekLogs: DailySessionLog[],
  rewards: Map<string, TrackerSessionReward>,
): TrackerQuestProgress[] {
  const qualitySessions = thisWeekLogs.filter((log) => (rewards.get(log.id)?.qualityScore ?? 0) >= 70).length;
  const wpbLessons = thisWeekLogs.filter((log) => log.wpbLesson === 'Yes').length;

  return [
    {
      id: 'weekly-volume-5',
      name: 'Five Session Week',
      progress: thisWeekLogs.length,
      target: 5,
      completed: thisWeekLogs.length >= 5,
    },
    {
      id: 'weekly-quality-3',
      name: 'Quality Triple',
      progress: qualitySessions,
      target: 3,
      completed: qualitySessions >= 3,
    },
    {
      id: 'weekly-wpb-2',
      name: 'WPB Builder',
      progress: wpbLessons,
      target: 2,
      completed: wpbLessons >= 2,
    },
  ];
}

function titleFromPerformance(logs: DailySessionLog[], rewards: Map<string, TrackerSessionReward>): string {
  if (!logs.length) return 'Table General';

  const avgGhost =
    logs.reduce((sum, item) => sum + item.ghostDrillWinRatePct, 0) / Math.max(1, logs.length);
  const avgSafety =
    logs.reduce((sum, item) => sum + item.safetyExchangeSuccessPct, 0) / Math.max(1, logs.length);
  const avgQuality =
    logs.reduce((sum, item) => sum + (rewards.get(item.id)?.qualityScore ?? 0), 0) / Math.max(1, logs.length);

  if (avgGhost >= 60) return 'Ghost Tamer';
  if (avgSafety >= 60) return 'Safety Architect';
  if (avgQuality >= 75) return 'Shotmaker';
  return 'Table General';
}

export function getTrackerGamificationSnapshot(
  logs: DailySessionLog[],
  now = new Date(),
): TrackerGamificationSnapshot {
  const ordered = [...logs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const rewardsById = new Map<string, TrackerSessionReward>();
  const seen: DailySessionLog[] = [];

  ordered.forEach((log) => {
    const reward = evaluateTrackerSessionReward(log, seen);
    rewardsById.set(log.id, reward);
    seen.push(log);
  });

  const totalXp = ordered.reduce((sum, log) => sum + (rewardsById.get(log.id)?.xpEarned ?? 0), 0);
  const levelInfo = levelFromXp(totalXp);

  const weekStart = weekStartIso(now);
  const thisWeekLogs = ordered.filter((item) => item.date >= weekStart);
  const weeklyQuests = computeWeeklyQuests(thisWeekLogs, rewardsById);

  return {
    totalXp,
    level: levelInfo.level,
    levelFloorXp: levelInfo.floorXp,
    nextLevelXp: levelInfo.nextXp,
    streakDays: getTrainingStreak(ordered.map((item) => item.date), now),
    title: titleFromPerformance(thisWeekLogs.length ? thisWeekLogs : ordered, rewardsById),
    weeklyQuests,
    latestSession: ordered.length ? rewardsById.get(ordered[ordered.length - 1].id) : undefined,
  };
}
