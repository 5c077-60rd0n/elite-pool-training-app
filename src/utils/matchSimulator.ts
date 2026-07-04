import type { DailySessionLog, MatchSimulatorPressureLevel } from '../types/tracker';

interface MatchReadinessInput {
  raceTo: number;
  inningsPlayed: number;
  breaksMade: number;
  breakAndRuns: number;
  safetyWins: number;
  pressureShotsMade: number;
  pressureShotsAttempted: number;
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

  const pressureWeight =
    input.pressureLevel === 'high' ? 1.1 : input.pressureLevel === 'medium' ? 1.0 : 0.9;
  const hillHillBonus = input.hillHillResult === 'Win' ? 6 : input.hillHillResult === 'Loss' ? -4 : 0;
  const resultBonus = input.result === 'Win' ? 5 : -5;

  const base =
    breakControl * 0.2 + runoutRate * 0.2 + safetyConversion * 0.2 + pressureExecution * 0.4;

  return clampScore(base * pressureWeight + hillHillBonus + resultBonus);
}

export function calculateDrillReadinessScore(logs: DailySessionLog[]): number {
  const recent = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
  if (!recent.length) return 0;

  const avgDrillRoom = recent.reduce((sum, item) => sum + item.drillRoomShotmakingPct, 0) / recent.length;
  const avgGhost = recent.reduce((sum, item) => sum + item.ghostDrillWinRatePct, 0) / recent.length;
  const avgSafety = recent.reduce((sum, item) => sum + item.safetyExchangeSuccessPct, 0) / recent.length;
  const avgLineUp = recent.reduce((sum, item) => sum + item.lineUpShotCount, 0) / recent.length;
  const lineUpNormalized = Math.min(100, (avgLineUp / 30) * 100);

  return clampScore(avgDrillRoom * 0.35 + avgGhost * 0.35 + avgSafety * 0.2 + lineUpNormalized * 0.1);
}
