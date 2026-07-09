import type { DailySessionLog } from '../types/tracker';

export interface SessionAppScores {
  drillRoom: number;
  bullseye: number;
  wpb: number;
  transfer: number;
}

export interface AppTrendSignal {
  app: 'DrillRoom' | 'Bullseye' | 'WPB' | 'Transfer';
  delta7: number;
  delta28: number;
  direction: 'up' | 'flat' | 'down';
}

export interface PostSessionCoachVerdict {
  transferScore: number;
  strongestApp: 'DrillRoom' | 'Bullseye' | 'WPB';
  weakestApp: 'DrillRoom' | 'Bullseye' | 'WPB';
  nextTarget: string;
  rationale: string;
  trendSignals: AppTrendSignal[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function proximityToScore(proximity: number): number {
  return clamp((5 - proximity) * 20, 0, 100);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toEpochDay(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / (24 * 60 * 60 * 1000));
}

export function scoreSessionApps(log: DailySessionLog): SessionAppScores {
  const drillStats = log.appStats?.drillRoom;
  const drillRoom = drillStats
    ? clamp(
      (clamp(drillStats.pocketingPct ?? 0, 0, 100) * 0.45)
      + (clamp(drillStats.positioningPct ?? 0, 0, 100) * 0.35)
      + (clamp((drillStats.score ?? 0) * 100, 0, 100) * 0.2),
      0,
      100,
    )
    : clamp(log.drillRoomShotmakingPct * 0.75 + log.safetyExchangeSuccessPct * 0.25, 0, 100);

  const bullseyeStats = log.appStats?.bullseye;
  const bullseye = bullseyeStats
    ? clamp(
      (clamp(bullseyeStats.shortRangePct ?? 0, 0, 100) * 0.25)
      + (clamp(bullseyeStats.midRangePct ?? 0, 0, 100) * 0.35)
      + (clamp(bullseyeStats.longRangePct ?? 0, 0, 100) * 0.25)
      + (
        clamp(
          (bullseyeStats.totalAttempts ?? 0) > 0
            ? ((bullseyeStats.successfulAttempts ?? 0) / Math.max(1, bullseyeStats.totalAttempts ?? 0)) * 100
            : 0,
          0,
          100,
        ) * 0.15
      ),
      0,
      100,
    )
    : proximityToScore(log.bullseyeProximity);

  const wpbStats = log.appStats?.wpb;
  const wpb = wpbStats
    ? clamp(
      (clamp((wpbStats.highestScore ?? 0) * 6.67, 0, 100) * 0.4)
      + (clamp((wpbStats.currentAvgScore ?? 0) * 6.67, 0, 100) * 0.4)
      + (clamp(((wpbStats.avgPracticeMinutes ?? 0) / 20) * 100, 0, 100) * 0.2),
      0,
      100,
    )
    : clamp((log.wpbLesson === 'Yes' ? 65 : 35) + (log.ghostDrillWinRatePct * 0.2), 0, 100);

  const rawTransfer = drillRoom * 0.4 + bullseye * 0.3 + wpb * 0.3;
  const spread = Math.max(drillRoom, bullseye, wpb) - Math.min(drillRoom, bullseye, wpb);
  const transfer = clamp(rawTransfer - spread * 0.15, 0, 100);

  return {
    drillRoom: round1(drillRoom),
    bullseye: round1(bullseye),
    wpb: round1(wpb),
    transfer: round1(transfer),
  };
}

function averageWindowScore(logs: DailySessionLog[], app: keyof SessionAppScores, fromDay: number, toDay: number): number {
  const scores = logs
    .filter((log) => {
      const day = toEpochDay(log.date);
      return day >= fromDay && day <= toDay;
    })
    .map((log) => scoreSessionApps(log)[app]);

  return average(scores);
}

function trendDirection(delta7: number): 'up' | 'flat' | 'down' {
  if (delta7 >= 2.5) return 'up';
  if (delta7 <= -2.5) return 'down';
  return 'flat';
}

export function buildAppTrendSignals(logs: DailySessionLog[], now = new Date()): AppTrendSignal[] {
  const todayDay = toEpochDay(now.toISOString().slice(0, 10));
  const recent7From = todayDay - 6;
  const previous7From = todayDay - 13;
  const previous7To = todayDay - 7;
  const recent28From = todayDay - 27;
  const previous28From = todayDay - 55;
  const previous28To = todayDay - 28;

  const appMap: Array<{ key: keyof SessionAppScores; label: AppTrendSignal['app'] }> = [
    { key: 'drillRoom', label: 'DrillRoom' },
    { key: 'bullseye', label: 'Bullseye' },
    { key: 'wpb', label: 'WPB' },
    { key: 'transfer', label: 'Transfer' },
  ];

  return appMap.map(({ key, label }) => {
    const recent7 = averageWindowScore(logs, key, recent7From, todayDay);
    const prior7 = averageWindowScore(logs, key, previous7From, previous7To);
    const recent28 = averageWindowScore(logs, key, recent28From, todayDay);
    const prior28 = averageWindowScore(logs, key, previous28From, previous28To);

    const delta7 = round1(recent7 - prior7);
    const delta28 = round1(recent28 - prior28);

    return {
      app: label,
      delta7,
      delta28,
      direction: trendDirection(delta7),
    };
  });
}

export function createPostSessionCoachVerdict(logs: DailySessionLog[], now = new Date()): PostSessionCoachVerdict | null {
  if (!logs.length) return null;
  const latest = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  const scores = scoreSessionApps(latest);

  const appScores: Array<{ app: 'DrillRoom' | 'Bullseye' | 'WPB'; score: number }> = [
    { app: 'DrillRoom', score: scores.drillRoom },
    { app: 'Bullseye', score: scores.bullseye },
    { app: 'WPB', score: scores.wpb },
  ];

  const strongestApp = [...appScores].sort((a, b) => b.score - a.score)[0].app;
  const weakestApp = [...appScores].sort((a, b) => a.score - b.score)[0].app;

  let nextTarget = 'Keep triad balance and raise transfer score by 3 points next session.';
  if (weakestApp === 'DrillRoom') {
    const baseline = latest.appStats?.drillRoom?.pocketingPct ?? latest.drillRoomShotmakingPct;
    nextTarget = `DrillRoom target: pocketing to ${Math.min(98, Math.round(baseline + 3))}% next session.`;
  }
  if (weakestApp === 'Bullseye') {
    const baseline = latest.appStats?.bullseye?.midRangePct ?? Math.round(proximityToScore(latest.bullseyeProximity));
    nextTarget = `Bullseye target: mid-range to ${Math.min(98, Math.round(baseline + 3))}% next session.`;
  }
  if (weakestApp === 'WPB') {
    const baseline = latest.appStats?.wpb?.currentAvgScore ?? 5;
    nextTarget = `WPB target: average score to ${(baseline + 0.5).toFixed(1)} next session.`;
  }

  const trendSignals = buildAppTrendSignals(logs, now);
  const weakestTrend = trendSignals
    .filter((item) => item.app !== 'Transfer')
    .sort((a, b) => a.delta7 - b.delta7)[0];

  return {
    transferScore: scores.transfer,
    strongestApp,
    weakestApp,
    nextTarget,
    rationale: weakestTrend
      ? `${weakestTrend.app} trend is ${weakestTrend.delta7 >= 0 ? '+' : ''}${weakestTrend.delta7} over 7d; prioritize that lane first.`
      : 'Collect another session to stabilize the trend signal.',
    trendSignals,
  };
}
