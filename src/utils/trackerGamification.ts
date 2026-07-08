import type { DailySessionLog, SeasonChallengeProgress, SeasonMeta } from '../types/tracker';
import { getTrainingStreak } from './streak';
import { getWpbLessonTierPoints } from './wpbTier';

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
  seasonMeta: SeasonMeta;
  seasonChallenges: SeasonChallengeProgress;
  latestSession?: TrackerSessionReward;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasTriadSessionSignals(log: DailySessionLog): boolean {
  return (
    log.drillRoomShotmakingPct > 0
    && log.ghostDrillPlayed === 'Yes'
    && log.wpbLesson === 'Yes'
  );
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

function countRecentComebackBonuses(historicalLogs: DailySessionLog[], currentLogDate: string): number {
  const currentDay = toEpochDay(currentLogDate);
  const cutoffDay = currentDay - 14;
  const sorted = [...historicalLogs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  let bonuses = 0;

  for (let i = 1; i < sorted.length; i += 1) {
    const previousDay = toEpochDay(sorted[i - 1].date);
    const thisDay = toEpochDay(sorted[i].date);
    if (thisDay < cutoffDay) continue;
    if (thisDay - previousDay >= 2) bonuses += 1;
  }

  return bonuses;
}

function weekStartIso(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

function quarterIndex(month: number): number {
  return Math.floor(month / 3) + 1;
}

function seasonWindow(now: Date): { startDate: string; endDate: string; seasonId: string } {
  const year = now.getUTCFullYear();
  const quarter = quarterIndex(now.getUTCMonth());
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    seasonId: `${year}-Q${quarter}`,
  };
}

function ladderTier(totalXp: number): string {
  if (totalXp >= 3600) return 'Diamond';
  if (totalXp >= 2400) return 'Platinum';
  if (totalXp >= 1500) return 'Gold';
  if (totalXp >= 900) return 'Silver';
  return 'Bronze';
}

function computeSeasonChallenges(
  logs: DailySessionLog[],
  rewardsById: Map<string, TrackerSessionReward>,
): SeasonChallengeProgress {
  const recent = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 10);
  const qualitySessions = recent.filter((item) => (rewardsById.get(item.id)?.qualityScore ?? 0) >= 75).length;
  const quality7 = recent.slice(0, 7);
  const qualityScore7DayAvg = Math.round(
    quality7.reduce((sum, item) => sum + (rewardsById.get(item.id)?.qualityScore ?? 0), 0) /
      Math.max(1, quality7.length),
  );
  const focusVariety = new Set(recent.map((item) => item.focusArea.trim().toLowerCase()).filter(Boolean)).size;

  const themedQuestChain = [
    {
      id: 'season-quality-cadence',
      title: 'Quality Cadence',
      description: 'Log 5 sessions at 75+ quality score.',
      progress: qualitySessions,
      target: 5,
      completed: qualitySessions >= 5,
    },
    {
      id: 'season-precision-week',
      title: 'Precision Week',
      description: 'Hold a 7-session average quality score of 78.',
      progress: qualityScore7DayAvg,
      target: 78,
      completed: qualityScore7DayAvg >= 78,
    },
    {
      id: 'season-variety-run',
      title: 'Variety Run',
      description: 'Train across 4 distinct focus areas.',
      progress: focusVariety,
      target: 4,
      completed: focusVariety >= 4,
    },
  ];

  const pressureEligible = recent.filter((item) => {
    const reward = rewardsById.get(item.id);
    return (reward?.qualityScore ?? 0) >= 88 && item.ghostDrillWinRatePct >= 62;
  });
  const enduranceEligible = recent.filter((item) => {
    const reward = rewardsById.get(item.id);
    return item.lengthMinutes >= 90 && (reward?.qualityScore ?? 0) >= 75;
  });

  const bossChallenges = [
    {
      id: 'boss-pressure-crucible',
      title: 'Boss: Pressure Crucible',
      description: 'One session with quality 88+ and ghost rate 62+.',
      attempts: recent.length,
      completed: pressureEligible.length >= 1,
      lastScore: pressureEligible[0] ? rewardsById.get(pressureEligible[0].id)?.qualityScore : undefined,
    },
    {
      id: 'boss-endurance-gauntlet',
      title: 'Boss: Endurance Gauntlet',
      description: 'Two 90+ minute sessions with quality 75+.',
      attempts: recent.length,
      completed: enduranceEligible.length >= 2,
      lastScore: enduranceEligible[0] ? rewardsById.get(enduranceEligible[0].id)?.qualityScore : undefined,
    },
  ];

  return {
    updatedAt: new Date().toISOString(),
    qualityScore7DayAvg,
    themedQuestChain,
    bossChallenges,
  };
}

export function evaluateTrackerSessionReward(
  log: DailySessionLog,
  historicalLogs: DailySessionLog[],
): TrackerSessionReward {
  const drillRoom = clamp(log.drillRoomShotmakingPct, 0, 100);
  const ghost = clamp(log.ghostDrillWinRatePct, 0, 100);
  const safety = clamp(log.safetyExchangeSuccessPct, 0, 100);
  const bullseye = log.bullseyeProximity > 0
    ? clamp((5 - log.bullseyeProximity) * 20, 0, 100)
    : 55;
  const lineup = clamp((log.lineUpShotCount / 30) * 100, 0, 100);
  const wpbTierPoints = getWpbLessonTierPoints(log);
  const triadSignals = hasTriadSessionSignals(log);
  const protocolWindowHit = log.lengthMinutes >= 15 && log.lengthMinutes <= 70;

  const qualityScore = Math.round(
    drillRoom * 0.3 +
      ghost * 0.25 +
      safety * 0.2 +
      bullseye * 0.15 +
      lineup * 0.1,
  );

  const wpbXpBonus = wpbTierPoints > 0 ? 8 + wpbTierPoints : 0;
  let xpEarned = Math.round(40 + qualityScore * 1.8 + wpbXpBonus);
  const bonusTags: string[] = [];

  if (qualityScore >= 85) {
    xpEarned += 20;
    bonusTags.push('Elite quality');
  }
  if (drillRoom >= 80 && ghost >= 60) {
    xpEarned += 12;
    bonusTags.push('Pressure conversion');
  }
  if (triadSignals) {
    xpEarned += 10;
    bonusTags.push('Training triad');
  }
  if (triadSignals && protocolWindowHit) {
    xpEarned += 10;
    bonusTags.push('Protocol adherence');
  }

  const sevenDaysAgo = toEpochDay(log.date) - 7;
  const recentFocusRepeats = historicalLogs
    .filter((item) => toEpochDay(item.date) >= sevenDaysAgo)
    .filter((item) => item.focusArea.trim().toLowerCase() === log.focusArea.trim().toLowerCase()).length;
  if (recentFocusRepeats >= 5) {
    xpEarned = Math.round(xpEarned * 0.92);
    bonusTags.push('Variety reminder');
  }

  const priorLog = [...historicalLogs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).at(-1);
  const gapDays = priorLog ? toEpochDay(log.date) - toEpochDay(priorLog.date) : 0;
  const recentComebackBonuses = countRecentComebackBonuses(historicalLogs, log.date);
  if (gapDays >= 2 && recentComebackBonuses < 2) {
    const comebackBonus = Math.min(35, Math.round(xpEarned * 0.12));
    xpEarned += comebackBonus;
    bonusTags.push('Comeback bonus');
  }

  const completedThisWeekBefore = historicalLogs.filter((item) => item.weekNumber === log.weekNumber).length;
  if (completedThisWeekBefore >= 3) {
    xpEarned = Math.round(xpEarned * 1.08);
    bonusTags.push('Consistency multiplier');
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
  const triadSessions = thisWeekLogs.filter((log) => hasTriadSessionSignals(log)).length;

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
    {
      id: 'weekly-triad-3',
      name: 'Triad Discipline',
      progress: triadSessions,
      target: 3,
      completed: triadSessions >= 3,
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
  const season = seasonWindow(now);

  const weekStart = weekStartIso(now);
  const thisWeekLogs = ordered.filter((item) => item.date >= weekStart);
  const weeklyQuests = computeWeeklyQuests(thisWeekLogs, rewardsById);
  const seasonChallenges = computeSeasonChallenges(ordered, rewardsById);
  const completedBosses = seasonChallenges.bossChallenges.filter((item) => item.completed).length;
  const seasonMeta: SeasonMeta = {
    id: season.seasonId,
    name: `Season ${season.seasonId}`,
    theme: 'Precision Under Pressure',
    startDate: season.startDate,
    endDate: season.endDate,
    ladderTier: ladderTier(totalXp),
    ladderRank: Math.max(1, 120 - Math.floor(totalXp / 120) - completedBosses * 6),
  };

  return {
    totalXp,
    level: levelInfo.level,
    levelFloorXp: levelInfo.floorXp,
    nextLevelXp: levelInfo.nextXp,
    streakDays: getTrainingStreak(ordered.map((item) => item.date), now),
    title: titleFromPerformance(thisWeekLogs.length ? thisWeekLogs : ordered, rewardsById),
    weeklyQuests,
    seasonMeta,
    seasonChallenges,
    latestSession: ordered.length ? rewardsById.get(ordered[ordered.length - 1].id) : undefined,
  };
}
