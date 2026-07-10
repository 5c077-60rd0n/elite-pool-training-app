import type { DailySessionLog, MatchSimulatorPressureLevel } from '../types/tracker';

interface MatchReadinessInput {
  raceTo: number;
  inningsPlayed: number;
  breaksMade: number;
  breakAndRuns: number;
  safetyWins: number;
  pressureShotsMade: number;
  pressureShotsAttempted: number;
  startingScoreline?: string;
  inningCap?: number;
  mustMakeShots?: number;
  mustMakeMade?: number;
  hillHillResult: 'Win' | 'Loss' | 'N/A';
  result: 'Win' | 'Loss';
  pressureLevel: MatchSimulatorPressureLevel;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateMatchReadinessScore(input: MatchReadinessInput): number {
  const breakControl = input.inningsPlayed > 0 ? (input.breaksMade / input.inningsPlayed) * 100 : 0;
  const runoutRate = input.breaksMade > 0 ? (input.breakAndRuns / input.breaksMade) * 100 : 0;
  const safetyConversion = input.inningsPlayed > 0 ? (input.safetyWins / input.inningsPlayed) * 100 : 0;
  const pressureExecution =
    input.pressureShotsAttempted > 0 ? (input.pressureShotsMade / input.pressureShotsAttempted) * 100 : 0;
  const mustMakeExecution =
    (input.mustMakeShots ?? 0) > 0 ? ((input.mustMakeMade ?? 0) / Math.max(1, input.mustMakeShots ?? 0)) * 100 : 0;

  const pressureWeight =
    input.pressureLevel === 'high' ? 1.1 : input.pressureLevel === 'medium' ? 1.0 : 0.9;
  const scorelinePressure = (() => {
    const raw = (input.startingScoreline ?? '').trim();
    if (!raw.includes('-')) return 0;
    const [leftRaw, rightRaw] = raw.split('-');
    const left = Number(leftRaw);
    const right = Number(rightRaw);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
    const delta = Math.abs(left - right);
    return delta <= 1 ? 4 : delta === 2 ? 2 : 0;
  })();
  const inningPaceBonus = input.inningCap && input.inningCap > 0 && input.inningsPlayed <= input.inningCap ? 3 : 0;
  const hillHillBonus = input.hillHillResult === 'Win' ? 6 : input.hillHillResult === 'Loss' ? -4 : 0;
  const resultBonus = input.result === 'Win' ? 5 : -5;

  const base =
    breakControl * 0.18 +
    runoutRate * 0.18 +
    safetyConversion * 0.18 +
    pressureExecution * 0.3 +
    mustMakeExecution * 0.16;

  return clampScore(base * pressureWeight + hillHillBonus + resultBonus + scorelinePressure + inningPaceBonus);
}

export function calculateDrillReadinessScore(logs: DailySessionLog[]): number {
  const recent = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
  if (!recent.length) return 0;

  const avgDrillRoom = recent.reduce((sum, item) => sum + item.drillRoomShotmakingPct, 0) / recent.length;
  const avgSafety = recent.reduce((sum, item) => sum + item.safetyExchangeSuccessPct, 0) / recent.length;
  const avgLineUp = recent.reduce((sum, item) => sum + item.lineUpShotCount, 0) / recent.length;
  const lineUpNormalized = Math.min(100, (avgLineUp / 30) * 100);

  return clampScore(avgDrillRoom * 0.55 + avgSafety * 0.3 + lineUpNormalized * 0.15);
}
