import { useMemo } from 'react';
import { kpis } from '../data/kpis';

interface FargoPoint {
  date: string;
  rating: number;
}

interface DrillResultSummary {
  metTarget: boolean;
}

interface SessionLogSummary {
  date: string;
  drillResults: DrillResultSummary[];
}

interface KpiScoreSummary {
  score: number;
  normalizedScore: number;
  benchmarks: {
    fargo550: number;
    fargo600: number;
    fargo650: number;
    fargo700: number;
    fargo750: number;
    fargo800: number;
  };
}

interface TrendSummary {
  trend: 'improving' | 'stable' | 'declining';
  delta: number;
}

interface FargoEstimateInput {
  currentFargoRating: number;
  fargoHistory: FargoPoint[];
  logs: SessionLogSummary[];
  weeklyHistory: Array<{ kpiId: string; week: number; value: number }>;
  kpiScores: KpiScoreSummary[];
  trends: TrendSummary[];
}

interface FargoEstimate {
  estimatedCurrent: number;
  projectedIn4Weeks: number;
  confidence: number;
  confidenceRange: [number, number];
  confidenceLabel: 'Low' | 'Medium' | 'High';
  diagnostics: {
    dataSufficiency: number;
    calibrationFitQuality: number;
    contributingSessions: number;
    contributingDrillResults: number;
    contributingKpis: number;
    calibrationPoints: number;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value);
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function dateOrFallback(date: string): number {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getAnchorRating(history: FargoPoint[], currentFargoRating: number): number {
  if (!history.length) return currentFargoRating;
  const sorted = [...history].sort((a, b) => dateOrFallback(a.date) - dateOrFallback(b.date));
  return sorted[sorted.length - 1].rating;
}

function impliedRatingFromKpi(
  score: number,
  benchmarks: {
    fargo550: number;
    fargo600: number;
    fargo650: number;
    fargo700: number;
    fargo750: number;
    fargo800: number;
  },
): number {
  const points: Array<[number, number]> = [
    [550, benchmarks.fargo550],
    [600, benchmarks.fargo600],
    [650, benchmarks.fargo650],
    [700, benchmarks.fargo700],
    [750, benchmarks.fargo750],
    [800, benchmarks.fargo800],
  ];

  for (let i = 0; i < points.length - 1; i += 1) {
    const [r1, y1] = points[i];
    const [r2, y2] = points[i + 1];
    const min = Math.min(y1, y2);
    const max = Math.max(y1, y2);

    if (score >= min && score <= max) {
      const span = y2 - y1;
      if (span === 0) return r1;
      const t = (score - y1) / span;
      return clamp(r1 + t * (r2 - r1), 350, 850);
    }
  }

  const [lowR1, lowY1] = points[0];
  const [lowR2, lowY2] = points[1];
  const lowSlope = (lowY2 - lowY1) / (lowR2 - lowR1);
  if (score < Math.min(lowY1, lowY2) && lowSlope !== 0) {
    return clamp(lowR1 + (score - lowY1) / lowSlope, 350, 850);
  }

  const [highR1, highY1] = points[points.length - 2];
  const [highR2, highY2] = points[points.length - 1];
  const highSlope = (highY2 - highY1) / (highR2 - highR1);
  if (highSlope !== 0) {
    return clamp(highR2 + (score - highY2) / highSlope, 350, 850);
  }

  return 575;
}

function buildWeeklyImpliedSeries(weeklyHistory: Array<{ kpiId: string; week: number; value: number }>): number[] {
  const byWeek = new Map<number, number[]>();

  weeklyHistory.forEach((entry) => {
    const kpi = kpis.find((item) => item.id === entry.kpiId);
    if (!kpi) return;
    const implied = impliedRatingFromKpi(entry.value, kpi.benchmarks);
    const bucket = byWeek.get(entry.week) ?? [];
    bucket.push(implied);
    byWeek.set(entry.week, bucket);
  });

  return Array.from(byWeek.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, ratings]) => average(ratings));
}

function fitLinearCalibration(xs: number[], ys: number[]): { slope: number; intercept: number; fitQuality: number } {
  if (xs.length !== ys.length || xs.length < 2) {
    return { slope: 1, intercept: 0, fitQuality: 0 };
  }

  const xMean = average(xs);
  const yMean = average(ys);
  const cov = average(xs.map((x, idx) => (x - xMean) * (ys[idx] - yMean)));
  const varX = average(xs.map((x) => (x - xMean) ** 2));

  if (varX <= 0.0001) {
    return { slope: 1, intercept: yMean - xMean, fitQuality: 0.2 };
  }

  const rawSlope = cov / varX;
  const slope = clamp(rawSlope, 0.6, 1.4);
  const intercept = yMean - slope * xMean;

  const residuals = xs.map((x, idx) => ys[idx] - (slope * x + intercept));
  const error = stddev(residuals);
  const spread = Math.max(1, stddev(ys));
  const fitQuality = clamp(1 - error / spread, 0, 1);

  return { slope, intercept, fitQuality };
}

function alignSeriesForCalibration(impliedSeries: number[], fargoHistory: FargoPoint[]): { x: number[]; y: number[] } {
  if (!impliedSeries.length || fargoHistory.length < 2) {
    return { x: [], y: [] };
  }

  const sortedHistory = [...fargoHistory].sort((a, b) => dateOrFallback(a.date) - dateOrFallback(b.date));
  const x: number[] = [];
  const y: number[] = [];

  sortedHistory.forEach((point, idx) => {
    const t = sortedHistory.length === 1 ? 1 : idx / (sortedHistory.length - 1);
    const impliedIndex = round(t * (impliedSeries.length - 1));
    const implied = impliedSeries[impliedIndex];
    if (Number.isFinite(implied)) {
      x.push(implied);
      y.push(point.rating);
    }
  });

  return { x, y };
}

function getRecentTargetRate(logs: SessionLogSummary[], sessionWindow = 14): number {
  const sorted = [...logs].sort((a, b) => dateOrFallback(b.date) - dateOrFallback(a.date));
  const recent = sorted.slice(0, sessionWindow);
  const results = recent.flatMap((session) => session.drillResults);

  if (!results.length) return 0.5;

  const madeTarget = results.filter((result) => result.metTarget).length;
  return madeTarget / results.length;
}

function getPriorTargetRate(logs: SessionLogSummary[], offset = 14, sessionWindow = 14): number {
  const sorted = [...logs].sort((a, b) => dateOrFallback(b.date) - dateOrFallback(a.date));
  const prior = sorted.slice(offset, offset + sessionWindow);
  const results = prior.flatMap((session) => session.drillResults);

  if (!results.length) return 0.5;

  const madeTarget = results.filter((result) => result.metTarget).length;
  return madeTarget / results.length;
}

function getHistorySlopePerWeek(history: FargoPoint[]): number {
  if (history.length < 2) return 0;

  const sorted = [...history].sort((a, b) => dateOrFallback(a.date) - dateOrFallback(b.date));
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const elapsedMs = dateOrFallback(end.date) - dateOrFallback(start.date);

  if (elapsedMs <= 0) return 0;

  const weeks = elapsedMs / (1000 * 60 * 60 * 24 * 7);
  if (weeks <= 0) return 0;

  const slope = (end.rating - start.rating) / weeks;
  return clamp(slope, -6, 10);
}

function getKpiReadiness(kpiScores: KpiScoreSummary[]): number {
  if (!kpiScores.length) return 100;
  const total = kpiScores.reduce((sum, item) => sum + item.normalizedScore, 0);
  return total / kpiScores.length;
}

function getMomentumIndex(trends: TrendSummary[]): number {
  if (!trends.length) return 0;

  const total = trends.reduce((sum, trend) => {
    const direction = trend.trend === 'improving' ? 1 : trend.trend === 'declining' ? -1 : 0;
    const normalizedDelta = clamp(trend.delta / 15, -1, 1);
    return sum + direction + normalizedDelta * 0.5;
  }, 0);

  return total / trends.length;
}

function getConfidence(logsCount: number, historyCount: number, kpiScores: KpiScoreSummary[]): number {
  const kpiCoverage =
    kpiScores.length > 0
      ? kpiScores.filter((kpi) => kpi.normalizedScore > 0).length / kpiScores.length
      : 0;

  const confidence =
    0.35 +
    Math.min(0.25, (logsCount / 80) * 0.25) +
    Math.min(0.2, (historyCount / 5) * 0.2) +
    kpiCoverage * 0.2;

  return clamp(confidence, 0.3, 0.9);
}

function getConfidenceLabel(confidence: number): 'Low' | 'Medium' | 'High' {
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.55) return 'Medium';
  return 'Low';
}

export function useFargoEstimate(input: FargoEstimateInput): FargoEstimate {
  const { currentFargoRating, fargoHistory, logs, weeklyHistory, kpiScores, trends } = input;

  return useMemo(() => {
    const anchor = getAnchorRating(fargoHistory, currentFargoRating);
    const targetRateRecent = getRecentTargetRate(logs);
    const targetRatePrior = getPriorTargetRate(logs);
    const targetRateTrend = targetRateRecent - targetRatePrior;
    const kpiReadiness = getKpiReadiness(kpiScores);
    const momentumIndex = getMomentumIndex(trends);
    const historySlopePerWeek = getHistorySlopePerWeek(fargoHistory);

    const kpiImpliedRatings = kpiScores
      .filter((kpi) => kpi.score > 0)
      .map((kpi) => impliedRatingFromKpi(kpi.score, kpi.benchmarks));

    const weeklyImpliedSeries = buildWeeklyImpliedSeries(weeklyHistory);
    const calibrationPairs = alignSeriesForCalibration(weeklyImpliedSeries, fargoHistory);
    const calibration = fitLinearCalibration(calibrationPairs.x, calibrationPairs.y);

    const kpiEvidenceRating = kpiImpliedRatings.length ? average(kpiImpliedRatings) : anchor;
    const kpiDispersion = stddev(kpiImpliedRatings);

    const targetRateAdjustment = (targetRateRecent - 0.5) * 44;
    const trendAdjustment = targetRateTrend * 28 + momentumIndex * 10;
    const rawModelRating = clamp(kpiEvidenceRating + targetRateAdjustment + trendAdjustment, 350, 850);
    const calibratedModelRating = clamp(rawModelRating * calibration.slope + calibration.intercept, 350, 850);

    const totalDrillResults = logs.reduce((sum, log) => sum + log.drillResults.length, 0);
    const evidenceWeight = clamp(
      Math.min(0.75, totalDrillResults / 280) + Math.min(0.2, kpiImpliedRatings.length / 8) + Math.min(0.15, logs.length / 45),
      0,
      0.9,
    );

    const calibrationStrength = clamp(calibration.fitQuality * Math.min(1, fargoHistory.length / 5), 0, 0.65);
    const blendedModelRating = calibratedModelRating * calibrationStrength + rawModelRating * (1 - calibrationStrength);

    const estimatedCurrent = round(clamp(anchor * (1 - evidenceWeight) + blendedModelRating * evidenceWeight, 350, 850));

    const performanceSlopePerWeek = clamp((kpiReadiness - 100) / 22 + targetRateTrend * 18 + momentumIndex * 1.2, -4, 6);
    const historyWeight = clamp(fargoHistory.length / 6, 0, 0.75);
    const slopePerWeek = historySlopePerWeek * historyWeight + performanceSlopePerWeek * (1 - historyWeight);
    const projectedIn4Weeks = round(clamp(estimatedCurrent + slopePerWeek * 4, 350, 850));

    const baseConfidence = getConfidence(logs.length, fargoHistory.length, kpiScores);
    const confidence = clamp(baseConfidence + calibration.fitQuality * 0.12, 0.3, 0.93);
    const halfWidth = round(14 + (1 - confidence) * 40 + kpiDispersion * 0.18 + (1 - calibration.fitQuality) * 8);
    const confidenceRange: [number, number] = [
      round(clamp(estimatedCurrent - halfWidth, 350, 850)),
      round(clamp(estimatedCurrent + halfWidth, 350, 850)),
    ];

    return {
      estimatedCurrent,
      projectedIn4Weeks,
      confidence,
      confidenceRange,
      confidenceLabel: getConfidenceLabel(confidence),
      diagnostics: {
        dataSufficiency: round(evidenceWeight * 100),
        calibrationFitQuality: round(calibration.fitQuality * 100),
        contributingSessions: logs.length,
        contributingDrillResults: totalDrillResults,
        contributingKpis: kpiImpliedRatings.length,
        calibrationPoints: calibrationPairs.x.length,
      },
    };
  }, [currentFargoRating, fargoHistory, logs, weeklyHistory, kpiScores, trends]);
}
