import { drills } from '../data/drills';
import type { DrillSessionLog } from '../types/models';
import { isoDate } from './date';
import { getTrainingStreak } from './streak';

const DAY_MS = 24 * 60 * 60 * 1000;
const SEASON_DAYS = 28;

const categoryTitles: Record<string, string> = {
  'stroke-mechanics': 'Stroke Artisan',
  'aiming-systems': 'Sightline Sniper',
  'cue-ball-control': 'Cue Ball Engineer',
  'pattern-play': 'Pattern Surgeon',
  safety: 'Safety Architect',
  'break-optimization': 'Break Architect',
  'banking-kicking': 'Kick Cartographer',
  'mental-game': 'Ice Veins',
  'straight-pool': 'Runout Accountant',
  integration: 'Table General',
};

export interface SessionReward {
  qualityScore: number;
  xpEarned: number;
  metTargetRate: number;
  averageScore: number;
  antiCheesePenalty: number;
  bonusTags: string[];
}

export interface QuestProgress {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface GamificationSnapshot {
  totalXp: number;
  level: number;
  levelFloorXp: number;
  nextLevelXp: number;
  northStarQualitySessions: number;
  weeklyQuests: QuestProgress[];
  seasonTier: 'Bronze' | 'Silver' | 'Gold' | 'Elite';
  seasonScore: number;
  promotionGap: number;
  title: string;
  badges: string[];
  streakDays: number;
  latestSession?: SessionReward;
}

interface FeedbackSummary {
  projectedXp: number;
  projectedQuality: number;
  hints: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toEpochDay(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / DAY_MS);
}

function sortByDateAsc(logs: DrillSessionLog[]): DrillSessionLog[] {
  return [...logs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

function getWeekStartDate(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

function getCurrentSeasonStart(now: Date): string {
  const todayEpoch = Math.floor(now.getTime() / DAY_MS);
  const seasonStartEpoch = todayEpoch - (todayEpoch % SEASON_DAYS);
  return new Date(seasonStartEpoch * DAY_MS).toISOString().slice(0, 10);
}

function levelFloor(level: number): number {
  return 100 * level * level;
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

function getDrillDifficulty(drillId: string): number {
  return drills.find((drill) => drill.id === drillId)?.difficulty ?? 3;
}

function getDrillCategory(drillId: string): string {
  return drills.find((drill) => drill.id === drillId)?.category ?? 'integration';
}

export function evaluateSessionReward(log: DrillSessionLog, historicalLogs: DrillSessionLog[]): SessionReward {
  const results = log.drillResults;
  if (!results.length) {
    return {
      qualityScore: 0,
      xpEarned: 0,
      metTargetRate: 0,
      averageScore: 0,
      antiCheesePenalty: 1,
      bonusTags: [],
    };
  }

  const averageScore =
    results.reduce((sum, result) => sum + result.calculatedScore, 0) / Math.max(1, results.length);
  const metTargetRate =
    results.reduce((sum, result) => sum + (result.metTarget ? 1 : 0), 0) / Math.max(1, results.length);
  const averageDifficulty =
    results.reduce((sum, result) => sum + getDrillDifficulty(result.drillId), 0) / Math.max(1, results.length);
  const uniqueDrills = new Set(results.map((result) => result.drillId)).size;
  const categories = results.map((result) => getDrillCategory(result.drillId));

  const dominantCategoryCount = Object.values(
    categories.reduce<Record<string, number>>((acc, category) => {
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {}),
  ).reduce((max, value) => Math.max(max, value), 0);
  const dominantShare = dominantCategoryCount / Math.max(1, categories.length);

  let antiCheesePenalty = 1;
  const bonusTags: string[] = [];
  if (dominantShare > 0.75 && results.length >= 3) antiCheesePenalty *= 0.88;
  if (uniqueDrills <= 1 && results.length >= 3) antiCheesePenalty *= 0.9;

  const sevenDaysAgo = toEpochDay(log.date) - 7;
  const recentDrillUsage = historicalLogs
    .filter((entry) => toEpochDay(entry.date) >= sevenDaysAgo)
    .flatMap((entry) => entry.drillResults.map((result) => result.drillId));
  const repeatCount = recentDrillUsage.filter((id) => id === results[0].drillId).length;
  if (repeatCount >= 10) antiCheesePenalty *= 0.92;

  const baseQuality =
    averageScore * 0.55 +
    metTargetRate * 30 +
    log.mentalGameRating * 4 +
    log.energyLevel * 3 +
    (averageDifficulty / 5) * 8;
  const qualityScore = Math.round(clamp(baseQuality, 0, 100));

  let xpEarned = Math.round(qualityScore * 2.2 + metTargetRate * 35 + uniqueDrills * 4 + 20);
  xpEarned = Math.round(xpEarned * antiCheesePenalty);
  if (dominantShare > 0.8) xpEarned = Math.min(xpEarned, 220);

  const priorBest = historicalLogs.reduce((best, entry) => {
    if (!entry.drillResults.length) return best;
    const avg = entry.drillResults.reduce((sum, result) => sum + result.calculatedScore, 0) / entry.drillResults.length;
    return Math.max(best, avg);
  }, 0);
  if (averageScore > priorBest && averageScore >= 75) {
    xpEarned += 20;
    bonusTags.push('Personal best');
  }
  if (qualityScore >= 85) bonusTags.push('Elite quality');
  if (metTargetRate >= 0.8) bonusTags.push('Target crusher');

  return {
    qualityScore,
    xpEarned,
    metTargetRate: Number(metTargetRate.toFixed(2)),
    averageScore: Math.round(averageScore),
    antiCheesePenalty: Number(antiCheesePenalty.toFixed(2)),
    bonusTags,
  };
}

function computeWeeklyQuests(
  thisWeekLogs: DrillSessionLog[],
  rewardsById: Map<string, SessionReward>,
): QuestProgress[] {
  const qualitySessions = thisWeekLogs.filter((log) => (rewardsById.get(log.id)?.qualityScore ?? 0) >= 70).length;
  const clutchSessions = thisWeekLogs.filter((log) => {
    const reward = rewardsById.get(log.id);
    return Boolean(reward && reward.qualityScore >= 75 && reward.metTargetRate >= 0.6);
  }).length;
  const uniqueDrills = new Set(thisWeekLogs.flatMap((log) => log.drillResults.map((result) => result.drillId))).size;

  return [
    {
      id: 'quality-4',
      name: 'Shotmaker Week',
      description: 'Complete 4 high-quality sessions this week',
      progress: qualitySessions,
      target: 4,
      completed: qualitySessions >= 4,
    },
    {
      id: 'clutch-3',
      name: 'Pressure Week',
      description: 'Record 3 clutch sessions (75+ quality)',
      progress: clutchSessions,
      target: 3,
      completed: clutchSessions >= 3,
    },
    {
      id: 'variety-8',
      name: 'Variety Builder',
      description: 'Train at least 8 unique drills this week',
      progress: uniqueDrills,
      target: 8,
      completed: uniqueDrills >= 8,
    },
  ];
}

function getSeasonTier(score: number): { tier: 'Bronze' | 'Silver' | 'Gold' | 'Elite'; nextTarget?: number } {
  if (score >= 1400) return { tier: 'Elite' };
  if (score >= 900) return { tier: 'Gold', nextTarget: 1400 };
  if (score >= 450) return { tier: 'Silver', nextTarget: 900 };
  return { tier: 'Bronze', nextTarget: 450 };
}

export function getGamificationSnapshot(logs: DrillSessionLog[], now = new Date()): GamificationSnapshot {
  const ordered = sortByDateAsc(logs);
  const rewardsById = new Map<string, SessionReward>();
  const seenLogs: DrillSessionLog[] = [];

  ordered.forEach((log) => {
    const reward = evaluateSessionReward(log, seenLogs);
    rewardsById.set(log.id, reward);
    seenLogs.push(log);
  });

  const totalXp = ordered.reduce((sum, log) => sum + (rewardsById.get(log.id)?.xpEarned ?? 0), 0);
  const { level, floorXp, nextXp } = levelFromXp(totalXp);

  const weekStart = getWeekStartDate(now);
  const thisWeekLogs = ordered.filter((log) => log.date >= weekStart);
  const weeklyQuests = computeWeeklyQuests(thisWeekLogs, rewardsById);
  const northStarQualitySessions = thisWeekLogs.filter((log) => (rewardsById.get(log.id)?.qualityScore ?? 0) >= 70).length;

  const seasonStart = getCurrentSeasonStart(now);
  const seasonLogs = ordered.filter((log) => log.date >= seasonStart);
  const seasonScore = Math.round(
    seasonLogs.reduce((sum, log) => {
      const reward = rewardsById.get(log.id);
      if (!reward) return sum;
      return sum + reward.qualityScore * 1.4 + reward.xpEarned * 0.25;
    }, 0),
  );
  const tier = getSeasonTier(seasonScore);

  const categoryWeights = seasonLogs.reduce<Record<string, number>>((acc, log) => {
    const reward = rewardsById.get(log.id);
    const rewardWeight = reward?.qualityScore ?? 0;
    log.drillResults.forEach((result) => {
      const category = getDrillCategory(result.drillId);
      acc[category] = (acc[category] ?? 0) + rewardWeight;
    });
    return acc;
  }, {});
  const strongestCategory = Object.entries(categoryWeights).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'integration';

  const streakDays = getTrainingStreak(ordered.map((log) => log.date), now);
  const badges = [
    streakDays >= 7 ? 'Week Streak' : '',
    northStarQualitySessions >= 4 ? 'Consistency Star' : '',
    ordered.length >= 50 ? 'Volume Grinder' : '',
    (rewardsById.get(ordered[ordered.length - 1]?.id)?.qualityScore ?? 0) >= 85 ? 'Elite Day' : '',
  ].filter(Boolean);

  const latestLog = ordered[ordered.length - 1];

  return {
    totalXp,
    level,
    levelFloorXp: floorXp,
    nextLevelXp: nextXp,
    northStarQualitySessions,
    weeklyQuests,
    seasonTier: tier.tier,
    seasonScore,
    promotionGap: Math.max(0, (tier.nextTarget ?? seasonScore) - seasonScore),
    title: categoryTitles[strongestCategory] ?? 'Table General',
    badges,
    streakDays,
    latestSession: latestLog ? rewardsById.get(latestLog.id) : undefined,
  };
}

export function getSessionFeedback(
  candidate: Omit<DrillSessionLog, 'id'>,
  historicalLogs: DrillSessionLog[],
  now = new Date(),
): FeedbackSummary {
  const tempLog: DrillSessionLog = {
    ...candidate,
    id: `preview-${isoDate(now)}-${historicalLogs.length}`,
  };

  const reward = evaluateSessionReward(tempLog, historicalLogs);
  const projected = getGamificationSnapshot([...historicalLogs, tempLog], now);
  const hints: string[] = [];

  const xpToLevel = projected.nextLevelXp - projected.totalXp;
  if (xpToLevel > 0 && xpToLevel <= 120) {
    hints.push(`${xpToLevel} XP to level ${projected.level + 1}`);
  }

  const nearQuest = projected.weeklyQuests.find((quest) => !quest.completed && quest.target - quest.progress <= 1);
  if (nearQuest) {
    hints.push(`You are one step from completing ${nearQuest.name}`);
  }

  if (projected.promotionGap > 0 && projected.promotionGap <= 120) {
    hints.push(`${projected.promotionGap} season points to next tier`);
  }

  if (!hints.length && reward.qualityScore >= 75) {
    hints.push('Strong session quality. Keep this pace for compounding XP.');
  }

  return {
    projectedXp: reward.xpEarned,
    projectedQuality: reward.qualityScore,
    hints,
  };
}