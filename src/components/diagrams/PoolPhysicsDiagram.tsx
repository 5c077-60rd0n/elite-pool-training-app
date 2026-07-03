import { useMemo, useState } from 'react';
import type { Drill } from '../../types/models';

type Vec2 = { x: number; y: number };

const TABLE_LENGTH_IN = 100;
const TABLE_WIDTH_IN = 50;
const BALL_RADIUS_IN = 1.125;
const BALL_DIAMETER_IN = BALL_RADIUS_IN * 2;
const POCKET_MOUTH_IN = 4.5;
const MARGIN = 6;
const VIEWBOX_W = TABLE_LENGTH_IN + MARGIN * 2;
const VIEWBOX_H = TABLE_WIDTH_IN + MARGIN * 2;

const pockets: Array<{ id: string; pos: Vec2 }> = [
  { id: 'TL', pos: { x: 0, y: 0 } },
  { id: 'TM', pos: { x: TABLE_LENGTH_IN / 2, y: 0 } },
  { id: 'TR', pos: { x: TABLE_LENGTH_IN, y: 0 } },
  { id: 'BL', pos: { x: 0, y: TABLE_WIDTH_IN } },
  { id: 'BM', pos: { x: TABLE_LENGTH_IN / 2, y: TABLE_WIDTH_IN } },
  { id: 'BR', pos: { x: TABLE_LENGTH_IN, y: TABLE_WIDTH_IN } },
];

type PocketId = 'TL' | 'TM' | 'TR' | 'BL' | 'BM' | 'BR';

interface DrillLayoutPreset {
  objectBallDiamond: { long: number; short: number };
  pocketId: PocketId;
  cutAngleDeg: number;
  side: -1 | 1;
  cueDistanceDiamonds: number;
  postCollisionRails: 1 | 2 | 3;
}

interface TargetZoneShape {
  id: string;
  label: string;
  kind: 'rect' | 'circle';
  long: number;
  short: number;
  widthLong?: number;
  heightShort?: number;
  radiusIn?: number;
}

interface TargetZoneOverlay {
  stroke: string;
  fill: string;
  zones: TargetZoneShape[];
}

const LONG_DIAMOND_IN = TABLE_LENGTH_IN / 8;
const SHORT_DIAMOND_IN = TABLE_WIDTH_IN / 4;

function d(long: number, short: number): { long: number; short: number } {
  return { long, short };
}

function diamondToTable(point: { long: number; short: number }): Vec2 {
  return {
    x: clamp(point.long * LONG_DIAMOND_IN, BALL_RADIUS_IN, TABLE_LENGTH_IN - BALL_RADIUS_IN),
    y: clamp(point.short * SHORT_DIAMOND_IN, BALL_RADIUS_IN, TABLE_WIDTH_IN - BALL_RADIUS_IN),
  };
}

function diamondsToInches(longDiamonds: number): number {
  return longDiamonds * LONG_DIAMOND_IN;
}

function toDiamondCoords(point: Vec2): { long: number; short: number } {
  return {
    long: point.x / LONG_DIAMOND_IN,
    short: point.y / SHORT_DIAMOND_IN,
  };
}

function snapDiamond(value: number): number {
  return Math.round(value * 2) / 2;
}

const drillLayouts: Record<string, DrillLayoutPreset> = {
  'straight-line-drill': { objectBallDiamond: d(5.6, 2), pocketId: 'TR', cutAngleDeg: 6, side: 1, cueDistanceDiamonds: 2.9, postCollisionRails: 1 },
  'pause-at-back-verification': { objectBallDiamond: d(5.4, 2), pocketId: 'TR', cutAngleDeg: 8, side: -1, cueDistanceDiamonds: 2.8, postCollisionRails: 1 },
  'feathering-technique-drill': { objectBallDiamond: d(5.3, 1.9), pocketId: 'BR', cutAngleDeg: 9, side: 1, cueDistanceDiamonds: 2.7, postCollisionRails: 1 },
  'slow-motion-stroke-drill': { objectBallDiamond: d(5, 2.4), pocketId: 'BR', cutAngleDeg: 24, side: 1, cueDistanceDiamonds: 2.65, postCollisionRails: 2 },
  'cut-shot-matrix': { objectBallDiamond: d(5, 1.8), pocketId: 'TR', cutAngleDeg: 35, side: -1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'ghost-ball-visualization-drill': { objectBallDiamond: d(4.6, 2.4), pocketId: 'BR', cutAngleDeg: 42, side: 1, cueDistanceDiamonds: 2.8, postCollisionRails: 2 },
  'fractional-ball-drill': { objectBallDiamond: d(4.8, 2.1), pocketId: 'TR', cutAngleDeg: 30, side: -1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'thin-cut-practice': { objectBallDiamond: d(5.8, 1), pocketId: 'TR', cutAngleDeg: 70, side: 1, cueDistanceDiamonds: 3, postCollisionRails: 2 },
  'l-drill': { objectBallDiamond: d(4.4, 2), pocketId: 'BR', cutAngleDeg: 28, side: -1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'five-position-drill': { objectBallDiamond: d(4.6, 1.7), pocketId: 'TR', cutAngleDeg: 24, side: 1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'rail-control-drill': { objectBallDiamond: d(5.4, 1.4), pocketId: 'TR', cutAngleDeg: 33, side: -1, cueDistanceDiamonds: 2.9, postCollisionRails: 3 },
  'stop-shot-matrix': { objectBallDiamond: d(5.3, 2), pocketId: 'TR', cutAngleDeg: 5, side: 1, cueDistanceDiamonds: 2.4, postCollisionRails: 1 },
  '9-ball-shape-drill': { objectBallDiamond: d(4.2, 1.6), pocketId: 'TR', cutAngleDeg: 26, side: -1, cueDistanceDiamonds: 2.8, postCollisionRails: 2 },
  'clock-system-drill': { objectBallDiamond: d(4.8, 1.9), pocketId: 'BR', cutAngleDeg: 20, side: 1, cueDistanceDiamonds: 2.65, postCollisionRails: 2 },
  'speed-control-5-zone-drill': { objectBallDiamond: d(5, 2), pocketId: 'BR', cutAngleDeg: 18, side: -1, cueDistanceDiamonds: 2.65, postCollisionRails: 2 },
  '9-ball-roadmap-drill': { objectBallDiamond: d(4.3, 1.4), pocketId: 'TR', cutAngleDeg: 32, side: 1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'key-ball-identification-drill': { objectBallDiamond: d(4, 2.4), pocketId: 'BL', cutAngleDeg: 24, side: -1, cueDistanceDiamonds: 2.8, postCollisionRails: 2 },
  '3-ball-pattern-sequence': { objectBallDiamond: d(3.8, 1.5), pocketId: 'TM', cutAngleDeg: 30, side: 1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'problem-ball-first-drill': { objectBallDiamond: d(3.9, 2.2), pocketId: 'BR', cutAngleDeg: 35, side: -1, cueDistanceDiamonds: 2.8, postCollisionRails: 2 },
  '8-ball-strategic-assessment-drill': { objectBallDiamond: d(4, 1.8), pocketId: 'TR', cutAngleDeg: 28, side: 1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'thin-cut-safe-drill': { objectBallDiamond: d(5.7, 1.3), pocketId: 'TR', cutAngleDeg: 62, side: -1, cueDistanceDiamonds: 3, postCollisionRails: 2 },
  'cluster-safe-drill': { objectBallDiamond: d(4.6, 1.9), pocketId: 'TM', cutAngleDeg: 18, side: 1, cueDistanceDiamonds: 2.65, postCollisionRails: 2 },
  'two-way-shot-drill': { objectBallDiamond: d(5.2, 1.6), pocketId: 'BR', cutAngleDeg: 38, side: -1, cueDistanceDiamonds: 2.8, postCollisionRails: 2 },
  'roll-up-safety-drill': { objectBallDiamond: d(4.9, 2.2), pocketId: 'BM', cutAngleDeg: 12, side: 1, cueDistanceDiamonds: 2.4, postCollisionRails: 1 },
  'kick-safe-drill': { objectBallDiamond: d(5.9, 1.1), pocketId: 'TR', cutAngleDeg: 45, side: -1, cueDistanceDiamonds: 3, postCollisionRails: 3 },
  '9-ball-break-zone-chart': { objectBallDiamond: d(3.9, 2), pocketId: 'TM', cutAngleDeg: 14, side: 1, cueDistanceDiamonds: 3.2, postCollisionRails: 2 },
  '8-ball-break-control': { objectBallDiamond: d(3.8, 2), pocketId: 'TM', cutAngleDeg: 16, side: -1, cueDistanceDiamonds: 3.2, postCollisionRails: 2 },
  'half-power-mechanics-break': { objectBallDiamond: d(3.6, 2), pocketId: 'TM', cutAngleDeg: 12, side: 1, cueDistanceDiamonds: 3, postCollisionRails: 2 },
  'rack-reading-drill': { objectBallDiamond: d(4, 1.9), pocketId: 'TM', cutAngleDeg: 20, side: -1, cueDistanceDiamonds: 2.8, postCollisionRails: 2 },
  'cross-side-bank-matrix': { objectBallDiamond: d(5.8, 0.9), pocketId: 'TM', cutAngleDeg: 50, side: 1, cueDistanceDiamonds: 3, postCollisionRails: 3 },
  'one-rail-kick-drill': { objectBallDiamond: d(6.1, 1.4), pocketId: 'BR', cutAngleDeg: 46, side: -1, cueDistanceDiamonds: 3, postCollisionRails: 3 },
  'two-rail-kick-system': { objectBallDiamond: d(5.6, 2.7), pocketId: 'TR', cutAngleDeg: 52, side: 1, cueDistanceDiamonds: 3, postCollisionRails: 3 },
  'rail-first-shot-drill': { objectBallDiamond: d(6, 2.2), pocketId: 'BR', cutAngleDeg: 42, side: -1, cueDistanceDiamonds: 3, postCollisionRails: 3 },
  'break-ball-drill': { objectBallDiamond: d(4.8, 1.4), pocketId: 'TR', cutAngleDeg: 24, side: 1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'high-run-builder': { objectBallDiamond: d(4.2, 1.8), pocketId: 'TR', cutAngleDeg: 30, side: -1, cueDistanceDiamonds: 2.8, postCollisionRails: 2 },
  'safety-cluster-drill': { objectBallDiamond: d(4.6, 2.1), pocketId: 'BM', cutAngleDeg: 22, side: 1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'deliberate-mistake-drill': { objectBallDiamond: d(5.1, 1.9), pocketId: 'BR', cutAngleDeg: 16, side: -1, cueDistanceDiamonds: 2.6, postCollisionRails: 1 },
  'pre-shot-commitment-drill': { objectBallDiamond: d(5, 2.1), pocketId: 'TR', cutAngleDeg: 18, side: 1, cueDistanceDiamonds: 2.6, postCollisionRails: 1 },
  'pressure-ghost-match': { objectBallDiamond: d(4, 2), pocketId: 'TR', cutAngleDeg: 25, side: -1, cueDistanceDiamonds: 2.7, postCollisionRails: 2 },
  'quiet-eye-practice': { objectBallDiamond: d(5.3, 1.9), pocketId: 'BR', cutAngleDeg: 14, side: 1, cueDistanceDiamonds: 2.55, postCollisionRails: 1 },
};

const targetZonesByDrill: Record<string, TargetZoneOverlay> = {
  'slow-motion-stroke-drill': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [{ id: 'z1', label: 'CB zone', kind: 'rect', long: 5.5, short: 2.35, widthLong: 0.7, heightShort: 0.45 }],
  },
  'l-drill': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [
      { id: 'left', label: 'L', kind: 'rect', long: 2.5, short: 0.65, widthLong: 0.7, heightShort: 0.45 },
      { id: 'center', label: 'C', kind: 'rect', long: 3.8, short: 0.65, widthLong: 0.7, heightShort: 0.45 },
      { id: 'right', label: 'R', kind: 'rect', long: 5.1, short: 0.65, widthLong: 0.7, heightShort: 0.45 },
    ],
  },
  'five-position-drill': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [{ id: 'finish', label: 'Finish', kind: 'rect', long: 4.15, short: 1.0, widthLong: 0.8, heightShort: 0.55 }],
  },
  'rail-control-drill': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [{ id: 'rail', label: 'Rail zone', kind: 'rect', long: 6.4, short: 1.7, widthLong: 0.65, heightShort: 0.5 }],
  },
  'speed-control-5-zone-drill': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [
      { id: 'dead', label: 'D', kind: 'rect', long: 4.1, short: 2.7, widthLong: 0.45, heightShort: 0.34 },
      { id: 'soft', label: 'S', kind: 'rect', long: 4.65, short: 2.55, widthLong: 0.45, heightShort: 0.34 },
      { id: 'med', label: 'M', kind: 'rect', long: 5.2, short: 2.4, widthLong: 0.45, heightShort: 0.34 },
      { id: 'firm', label: 'F', kind: 'rect', long: 5.75, short: 2.25, widthLong: 0.45, heightShort: 0.34 },
      { id: 'pow', label: 'P', kind: 'rect', long: 6.3, short: 2.1, widthLong: 0.45, heightShort: 0.34 },
    ],
  },
  'roll-up-safety-drill': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [{ id: 'die', label: '6in', kind: 'circle', long: 5.3, short: 2.2, radiusIn: 6 }],
  },
  'kick-safe-drill': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [{ id: 'safe', label: 'Safe', kind: 'rect', long: 1.1, short: 2.45, widthLong: 0.7, heightShort: 0.45 }],
  },
  'one-rail-kick-drill': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [{ id: 'contact', label: 'Contact', kind: 'rect', long: 6.95, short: 1.6, widthLong: 0.35, heightShort: 0.55 }],
  },
  'break-ball-drill': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [{ id: 'acceptable', label: 'Accept', kind: 'rect', long: 4.4, short: 1.9, widthLong: 1, heightShort: 0.7 }],
  },
  '9-ball-break-zone-chart': {
    stroke: '#8de4af',
    fill: '#8de4af22',
    zones: [
      { id: 'A', label: 'A', kind: 'rect', long: 1.28, short: 0.96, widthLong: 1.6, heightShort: 0.48 },
      { id: 'B', label: 'B', kind: 'rect', long: 3.36, short: 0.96, widthLong: 1.6, heightShort: 0.48 },
      { id: 'C', label: 'C', kind: 'rect', long: 5.44, short: 0.96, widthLong: 1.6, heightShort: 0.48 },
      { id: 'D', label: 'D', kind: 'rect', long: 1.28, short: 2.48, widthLong: 1.6, heightShort: 0.48 },
      { id: 'E', label: 'E', kind: 'rect', long: 3.36, short: 2.48, widthLong: 1.6, heightShort: 0.48 },
      { id: 'F', label: 'F', kind: 'rect', long: 5.44, short: 2.48, widthLong: 1.6, heightShort: 0.48 },
    ],
  },
};

interface ShotGeometry {
  cueStart: Vec2;
  objectBall: Vec2;
  ghostBall: Vec2;
  pocket: Vec2;
  tangentA: Vec2;
  tangentB: Vec2;
  cuePostPath: Vec2[];
  cueOutUnit: Vec2;
  cutAngleDeg: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function normalize(v: Vec2): Vec2 {
  const l = length(v);
  if (l < 1e-9) {
    return { x: 1, y: 0 };
  }
  return { x: v.x / l, y: v.y / l };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function rotate(v: Vec2, radians: number): Vec2 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function insidePlayable(ball: Vec2): boolean {
  return (
    ball.x >= BALL_RADIUS_IN &&
    ball.x <= TABLE_LENGTH_IN - BALL_RADIUS_IN &&
    ball.y >= BALL_RADIUS_IN &&
    ball.y <= TABLE_WIDTH_IN - BALL_RADIUS_IN
  );
}

function tableToSvg(p: Vec2): Vec2 {
  return { x: p.x + MARGIN, y: p.y + MARGIN };
}

function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function pocketPosById(pocketId: PocketId): Vec2 {
  const found = pockets.find((entry) => entry.id === pocketId);
  return found?.pos ?? pockets[0].pos;
}

function categoryCutAngleDeg(category: Drill['category'], id: string): number {
  const base = seededUnit(id + '-angle');
  if (category === 'stroke-mechanics') return 8 + base * 8;
  if (category === 'aiming-systems') return 22 + base * 50;
  if (category === 'cue-ball-control') return 15 + base * 35;
  if (category === 'pattern-play') return 18 + base * 40;
  if (category === 'safety') return 10 + base * 28;
  if (category === 'break-optimization') return 12 + base * 22;
  if (category === 'banking-kicking') return 25 + base * 45;
  if (category === 'straight-pool') return 16 + base * 30;
  if (category === 'mental-game') return 12 + base * 24;
  return 20 + base * 30;
}

function objectBallAnchor(category: Drill['category'], id: string): Vec2 {
  const ux = seededUnit(id + '-x');
  const uy = seededUnit(id + '-y');
  if (category === 'stroke-mechanics') {
    return { x: 67 + ux * 8, y: 24 + uy * 2 };
  }
  if (category === 'break-optimization') {
    return { x: 57 + ux * 8, y: 24 + uy * 2 };
  }
  if (category === 'banking-kicking') {
    return { x: 64 + ux * 9, y: 8 + uy * 34 };
  }
  if (category === 'safety') {
    return { x: 62 + ux * 10, y: 11 + uy * 28 };
  }
  return { x: 63 + ux * 12, y: 10 + uy * 30 };
}

function fallbackLayout(drill: Drill): DrillLayoutPreset {
  const fallbackObject = objectBallAnchor(drill.category, drill.id);
  return {
    objectBallDiamond: d(fallbackObject.x / LONG_DIAMOND_IN, fallbackObject.y / SHORT_DIAMOND_IN),
    pocketId: pockets[Math.floor(seededUnit(drill.id + '-pocket') * pockets.length)]?.id as PocketId,
    cutAngleDeg: categoryCutAngleDeg(drill.category, drill.id),
    side: seededUnit(drill.id + '-side') > 0.5 ? 1 : -1,
    cueDistanceDiamonds: 2.6 + seededUnit(drill.id + '-dist') * 1.2,
    postCollisionRails: drill.category === 'banking-kicking' ? 3 : 2,
  };
}

function getLayoutForDrill(drill: Drill): DrillLayoutPreset {
  const authored = drillLayouts[drill.id];
  if (authored) {
    return authored;
  }
  return fallbackLayout(drill);
}

function rayToTableEdge(origin: Vec2, direction: Vec2): Vec2 {
  const dir = normalize(direction);
  const tCandidates: number[] = [];

  if (Math.abs(dir.x) > 1e-9) {
    tCandidates.push((0 - origin.x) / dir.x);
    tCandidates.push((TABLE_LENGTH_IN - origin.x) / dir.x);
  }
  if (Math.abs(dir.y) > 1e-9) {
    tCandidates.push((0 - origin.y) / dir.y);
    tCandidates.push((TABLE_WIDTH_IN - origin.y) / dir.y);
  }

  const positives = tCandidates.filter((t) => t > 0);
  const t = positives.length > 0 ? Math.min(...positives) : 0;
  const p = add(origin, scale(dir, t));
  return {
    x: clamp(p.x, 0, TABLE_LENGTH_IN),
    y: clamp(p.y, 0, TABLE_WIDTH_IN),
  };
}

function reflectFromRails(origin: Vec2, direction: Vec2, steps: number): Vec2[] {
  const points: Vec2[] = [origin];
  let current = origin;
  let dir = normalize(direction);

  for (let i = 0; i < steps; i += 1) {
    const tx = dir.x > 0 ? (TABLE_LENGTH_IN - current.x) / dir.x : dir.x < 0 ? (0 - current.x) / dir.x : Number.POSITIVE_INFINITY;
    const ty = dir.y > 0 ? (TABLE_WIDTH_IN - current.y) / dir.y : dir.y < 0 ? (0 - current.y) / dir.y : Number.POSITIVE_INFINITY;
    const t = Math.min(tx, ty);
    if (!Number.isFinite(t) || t <= 0) {
      break;
    }
    const impact = add(current, scale(dir, t));
    points.push({ x: clamp(impact.x, 0, TABLE_LENGTH_IN), y: clamp(impact.y, 0, TABLE_WIDTH_IN) });

    const hitVerticalRail = tx < ty;
    dir = hitVerticalRail ? { x: -dir.x, y: dir.y } : { x: dir.x, y: -dir.y };
    current = impact;
  }
  return points;
}

function buildShotGeometry(drill: Drill): ShotGeometry {
  const layout = getLayoutForDrill(drill);
  const pocket = pocketPosById(layout.pocketId);
  const objectBall = diamondToTable(layout.objectBallDiamond);

  const toPocket = normalize(sub(pocket, objectBall));
  const ghostBall = sub(objectBall, scale(toPocket, BALL_DIAMETER_IN));
  const n = normalize(sub(objectBall, ghostBall));

  const cutAngle = layout.cutAngleDeg;
  const cutRad = (cutAngle * Math.PI) / 180;
  const sign = layout.side;

  let incoming = normalize(rotate(n, sign * cutRad));
  let cueStart = sub(ghostBall, scale(incoming, diamondsToInches(layout.cueDistanceDiamonds)));

  if (!insidePlayable(cueStart)) {
    incoming = normalize(rotate(n, -sign * cutRad));
    cueStart = sub(ghostBall, scale(incoming, 28));
  }

  cueStart = {
    x: clamp(cueStart.x, BALL_RADIUS_IN, TABLE_LENGTH_IN - BALL_RADIUS_IN),
    y: clamp(cueStart.y, BALL_RADIUS_IN, TABLE_WIDTH_IN - BALL_RADIUS_IN),
  };

  const incomingUnit = normalize(sub(ghostBall, cueStart));
  const cueOut = sub(incomingUnit, scale(n, dot(incomingUnit, n)));
  const cueOutUnit = normalize(cueOut);

  const tangentDir = { x: -n.y, y: n.x };
  const tangentA = rayToTableEdge(ghostBall, tangentDir);
  const tangentB = rayToTableEdge(ghostBall, scale(tangentDir, -1));

  const cuePostPath =
    length(cueOut) < 1e-6
      ? [ghostBall, add(ghostBall, scale(tangentDir, 0.01))]
      : reflectFromRails(ghostBall, cueOutUnit, layout.postCollisionRails);

  const cutAngleDeg = (Math.acos(clamp(dot(incomingUnit, n), -1, 1)) * 180) / Math.PI;

  return {
    cueStart,
    objectBall,
    ghostBall,
    pocket,
    tangentA,
    tangentB,
    cuePostPath,
    cueOutUnit,
    cutAngleDeg,
  };
}

function polyline(points: Vec2[]): string {
  return points
    .map((point) => {
      const p = tableToSvg(point);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');
}

function compassArc(center: Vec2, from: Vec2, to: Vec2, radius: number): string {
  const a = Math.atan2(from.y, from.x);
  const b = Math.atan2(to.y, to.x);
  let delta = b - a;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  const clockwise = delta >= 0 ? 1 : 0;
  const sweep = Math.min(Math.abs(delta), Math.PI);
  const endAngle = a + (clockwise ? sweep : -sweep);

  const start = tableToSvg(add(center, { x: Math.cos(a) * radius, y: Math.sin(a) * radius }));
  const end = tableToSvg(add(center, { x: Math.cos(endAngle) * radius, y: Math.sin(endAngle) * radius }));
  const largeArc = sweep > Math.PI / 2 ? 1 : 0;

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} ${clockwise} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

interface PoolPhysicsDiagramProps {
  drill: Drill;
}

export function PoolPhysicsDiagram({ drill }: PoolPhysicsDiagramProps) {
  const [showFractions, setShowFractions] = useState(true);
  const [showThrowBands, setShowThrowBands] = useState(true);
  const [showSpeedTiers, setShowSpeedTiers] = useState(true);
  const [showDiamondGrid, setShowDiamondGrid] = useState(false);
  const [showTargetZones, setShowTargetZones] = useState(true);
  const shot = useMemo(() => buildShotGeometry(drill), [drill]);
  const targetOverlay = targetZonesByDrill[drill.id];

  const svgCueStart = tableToSvg(shot.cueStart);
  const svgObject = tableToSvg(shot.objectBall);
  const svgGhost = tableToSvg(shot.ghostBall);
  const svgPocket = tableToSvg(shot.pocket);
  const svgR = BALL_RADIUS_IN;

  const incomingVec = normalize(sub(shot.ghostBall, shot.cueStart));
  const impactNormal = normalize(sub(shot.objectBall, shot.ghostBall));
  const tangentUnit = normalize({ x: -impactNormal.y, y: impactNormal.x });
  const arcPath = compassArc(shot.ghostBall, incomingVec, impactNormal, 5);
  const arcLabelPoint = tableToSvg(add(shot.ghostBall, scale(normalize(add(incomingVec, impactNormal)), 7)));

  const contactGuideStart = tableToSvg(add(shot.objectBall, scale(tangentUnit, -BALL_RADIUS_IN * 1.35)));
  const contactGuideEnd = tableToSvg(add(shot.objectBall, scale(tangentUnit, BALL_RADIUS_IN * 1.35)));
  const contactTicks = [-0.75, -0.5, 0, 0.5, 0.75].map((fraction) => {
    const center = tableToSvg(add(shot.objectBall, scale(tangentUnit, BALL_RADIUS_IN * fraction)));
    const tickDir = normalize(impactNormal);
    return {
      x1: center.x - tickDir.x * 0.45,
      y1: center.y - tickDir.y * 0.45,
      x2: center.x + tickDir.x * 0.45,
      y2: center.y + tickDir.y * 0.45,
      label: fraction === 0 ? 'full' : Math.abs(fraction) === 0.5 ? '1/2' : '1/4',
      cx: center.x,
      cy: center.y,
    };
  });

  const throwInnerPlus = tableToSvg(add(shot.objectBall, scale(rotate(impactNormal, (2 * Math.PI) / 180), 18)));
  const throwInnerMinus = tableToSvg(add(shot.objectBall, scale(rotate(impactNormal, (-2 * Math.PI) / 180), 18)));
  const throwOuterPlus = tableToSvg(add(shot.objectBall, scale(rotate(impactNormal, (4 * Math.PI) / 180), 22)));
  const throwOuterMinus = tableToSvg(add(shot.objectBall, scale(rotate(impactNormal, (-4 * Math.PI) / 180), 22)));
  const throwOrigin = tableToSvg(shot.objectBall);

  const speedSoft = reflectFromRails(shot.ghostBall, shot.cueOutUnit, 1);
  const speedMedium = reflectFromRails(shot.ghostBall, shot.cueOutUnit, 2);
  const speedFirm = reflectFromRails(shot.ghostBall, shot.cueOutUnit, 3);
  const cbDiamond = toDiamondCoords(shot.cueStart);
  const gbDiamond = toDiamondCoords(shot.ghostBall);
  const obDiamond = toDiamondCoords(shot.objectBall);

  return (
    <div className="rounded-xl border border-felt-600 bg-felt-900 p-2">
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setShowFractions((value) => !value)}
          className={`rounded-md border px-2 py-1 ${showFractions ? 'border-cue-400 bg-cue-900/40 text-cue-200' : 'border-felt-600 text-chalk-300'}`}
        >
          Contact Fractions
        </button>
        <button
          type="button"
          onClick={() => setShowThrowBands((value) => !value)}
          className={`rounded-md border px-2 py-1 ${showThrowBands ? 'border-cue-400 bg-cue-900/40 text-cue-200' : 'border-felt-600 text-chalk-300'}`}
        >
          Throw Bands
        </button>
        <button
          type="button"
          onClick={() => setShowSpeedTiers((value) => !value)}
          className={`rounded-md border px-2 py-1 ${showSpeedTiers ? 'border-cue-400 bg-cue-900/40 text-cue-200' : 'border-felt-600 text-chalk-300'}`}
        >
          Speed Tiers
        </button>
        <button
          type="button"
          onClick={() => setShowDiamondGrid((value) => !value)}
          className={`rounded-md border px-2 py-1 ${showDiamondGrid ? 'border-cue-400 bg-cue-900/40 text-cue-200' : 'border-felt-600 text-chalk-300'}`}
        >
          Diamond Grid
        </button>
        <button
          type="button"
          onClick={() => setShowTargetZones((value) => !value)}
          className={`rounded-md border px-2 py-1 ${showTargetZones ? 'border-cue-400 bg-cue-900/40 text-cue-200' : 'border-felt-600 text-chalk-300'}`}
        >
          Target Zones
        </button>
      </div>

      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full"
        aria-label={`Physics diagram for ${drill.name}`}
        role="img"
      >
        <defs>
          <marker id={`arrow-${drill.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f8f6ef" />
          </marker>
        </defs>

        <rect x={MARGIN} y={MARGIN} width={TABLE_LENGTH_IN} height={TABLE_WIDTH_IN} rx="2" fill="#0b2e23" stroke="#2b5c4f" strokeWidth="1.4" />
        <rect x={MARGIN + 1.2} y={MARGIN + 1.2} width={TABLE_LENGTH_IN - 2.4} height={TABLE_WIDTH_IN - 2.4} rx="1.4" fill="none" stroke="#4f8d78" strokeWidth="0.6" />

        {showDiamondGrid
          ? Array.from({ length: 7 }, (_, idx) => {
              const diamond = idx + 1;
              const x = MARGIN + diamond * LONG_DIAMOND_IN;
              return <line key={`grid-x-${diamond}`} x1={x} y1={MARGIN} x2={x} y2={MARGIN + TABLE_WIDTH_IN} stroke="#b6e3cf" strokeOpacity="0.22" strokeWidth="0.22" />;
            })
          : null}

        {showDiamondGrid
          ? Array.from({ length: 3 }, (_, idx) => {
              const diamond = idx + 1;
              const y = MARGIN + diamond * SHORT_DIAMOND_IN;
              return <line key={`grid-y-${diamond}`} x1={MARGIN} y1={y} x2={MARGIN + TABLE_LENGTH_IN} y2={y} stroke="#b6e3cf" strokeOpacity="0.22" strokeWidth="0.22" />;
            })
          : null}

        {Array.from({ length: 7 }, (_, idx) => idx + 1).map((diamond) => {
          const x = MARGIN + diamond * LONG_DIAMOND_IN;
          return (
            <g key={`rail-x-${diamond}`}>
              <circle cx={x} cy={MARGIN + 0.7} r={0.32} fill="#9bd4bd" />
              <circle cx={x} cy={MARGIN + TABLE_WIDTH_IN - 0.7} r={0.32} fill="#9bd4bd" />
            </g>
          );
        })}

        {Array.from({ length: 3 }, (_, idx) => idx + 1).map((diamond) => {
          const y = MARGIN + diamond * SHORT_DIAMOND_IN;
          return (
            <g key={`rail-y-${diamond}`}>
              <circle cx={MARGIN + 0.7} cy={y} r={0.32} fill="#9bd4bd" />
              <circle cx={MARGIN + TABLE_LENGTH_IN - 0.7} cy={y} r={0.32} fill="#9bd4bd" />
            </g>
          );
        })}

        {pockets.map((pocket) => {
          const pocketSvg = tableToSvg(pocket.pos);
          return <circle key={pocket.id} cx={pocketSvg.x} cy={pocketSvg.y} r={POCKET_MOUTH_IN / 2} fill="#0a0a0a" />;
        })}

        {showTargetZones && targetOverlay
          ? targetOverlay.zones.map((zone) => {
              if (zone.kind === 'rect') {
                const x = MARGIN + zone.long * LONG_DIAMOND_IN;
                const y = MARGIN + zone.short * SHORT_DIAMOND_IN;
                const width = Math.max(4.6, (zone.widthLong ?? 0.5) * LONG_DIAMOND_IN);
                const height = Math.max(3.8, (zone.heightShort ?? 0.4) * SHORT_DIAMOND_IN);
                return (
                  <g key={`zone-${zone.id}`}>
                    <rect x={x} y={y} width={width} height={height} rx="0.7" fill={targetOverlay.fill} stroke={targetOverlay.stroke} strokeWidth="0.45" />
                    <text
                      x={x + width / 2}
                      y={y + height / 2 + 0.92}
                      fontSize="2.45"
                      fontWeight="700"
                      textAnchor="middle"
                      fill="#e6fff4"
                      stroke="#0b2e23"
                      strokeWidth="0.18"
                      paintOrder="stroke"
                    >
                      {zone.label}
                    </text>
                  </g>
                );
              }

              const center = tableToSvg(diamondToTable({ long: zone.long, short: zone.short }));
              const radius = Math.max(4.5, zone.radiusIn ?? 6);
              return (
                <g key={`zone-${zone.id}`}>
                  <circle cx={center.x} cy={center.y} r={radius} fill={targetOverlay.fill} stroke={targetOverlay.stroke} strokeWidth="0.45" />
                  <text
                    x={center.x}
                    y={center.y + 0.9}
                    fontSize="2.45"
                    fontWeight="700"
                    textAnchor="middle"
                    fill="#e6fff4"
                    stroke="#0b2e23"
                    strokeWidth="0.18"
                    paintOrder="stroke"
                  >
                    {zone.label}
                  </text>
                </g>
              );
            })
          : null}

        <line
          x1={tableToSvg(shot.tangentA).x}
          y1={tableToSvg(shot.tangentA).y}
          x2={tableToSvg(shot.tangentB).x}
          y2={tableToSvg(shot.tangentB).y}
          stroke="#79d8ff"
          strokeWidth="0.45"
          strokeDasharray="1.2 1.2"
        />

        <polyline
          points={polyline([shot.cueStart, shot.ghostBall])}
          fill="none"
          stroke="#f3f0dc"
          strokeWidth="0.55"
          strokeDasharray="2 1.5"
          markerEnd={`url(#arrow-${drill.id})`}
        />

        <polyline
          points={polyline([shot.objectBall, shot.pocket])}
          fill="none"
          stroke="#f7b267"
          strokeWidth="0.7"
          markerEnd={`url(#arrow-${drill.id})`}
        />

        <polyline
          points={polyline(shot.cuePostPath)}
          fill="none"
          stroke="#d6a2ff"
          strokeWidth="0.62"
          markerEnd={`url(#arrow-${drill.id})`}
        />

        {showSpeedTiers ? (
          <>
            <polyline points={polyline(speedSoft)} fill="none" stroke="#8de4af" strokeWidth="0.45" strokeDasharray="1.1 1.1" />
            <polyline points={polyline(speedMedium)} fill="none" stroke="#c5adff" strokeWidth="0.45" strokeDasharray="1.1 1.1" />
            <polyline points={polyline(speedFirm)} fill="none" stroke="#ff9eb5" strokeWidth="0.45" strokeDasharray="1.1 1.1" />
            <text x={MARGIN + 2} y={VIEWBOX_H - 3.8} fontSize="2.4" fill="#8de4af">soft</text>
            <text x={MARGIN + 10} y={VIEWBOX_H - 3.8} fontSize="2.4" fill="#c5adff">medium</text>
            <text x={MARGIN + 22.2} y={VIEWBOX_H - 3.8} fontSize="2.4" fill="#ff9eb5">firm</text>
          </>
        ) : null}

        {showThrowBands ? (
          <>
            <path
              d={`M ${throwOrigin.x.toFixed(2)} ${throwOrigin.y.toFixed(2)} L ${throwInnerPlus.x.toFixed(2)} ${throwInnerPlus.y.toFixed(2)} L ${throwInnerMinus.x.toFixed(2)} ${throwInnerMinus.y.toFixed(2)} Z`}
              fill="#f6c97d22"
              stroke="#f6c97d"
              strokeWidth="0.28"
            />
            <line x1={throwOrigin.x} y1={throwOrigin.y} x2={throwOuterPlus.x} y2={throwOuterPlus.y} stroke="#f6c97d" strokeWidth="0.28" strokeDasharray="0.7 0.7" />
            <line x1={throwOrigin.x} y1={throwOrigin.y} x2={throwOuterMinus.x} y2={throwOuterMinus.y} stroke="#f6c97d" strokeWidth="0.28" strokeDasharray="0.7 0.7" />
            <text x={throwOrigin.x + 1.8} y={throwOrigin.y - 1.4} fontSize="2.1" fill="#f6c97d">throw band</text>
          </>
        ) : null}

        {showFractions ? (
          <>
            <line x1={contactGuideStart.x} y1={contactGuideStart.y} x2={contactGuideEnd.x} y2={contactGuideEnd.y} stroke="#a7f3d0" strokeWidth="0.32" />
            {contactTicks.map((tick, index) => (
              <g key={`tick-${index}`}>
                <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="#a7f3d0" strokeWidth="0.22" />
                <text x={tick.cx} y={tick.cy - 0.95} fontSize="1.55" textAnchor="middle" fill="#a7f3d0">{tick.label}</text>
              </g>
            ))}
          </>
        ) : null}

        <path d={arcPath} stroke="#ffd166" strokeWidth="0.7" fill="none" />
        <text x={arcLabelPoint.x} y={arcLabelPoint.y} fontSize="2.8" textAnchor="middle" fill="#ffd166">
          {shot.cutAngleDeg.toFixed(1)}
          {'\u00b0'}
        </text>

        <circle cx={svgGhost.x} cy={svgGhost.y} r={svgR} fill="none" stroke="#ffe7ba" strokeDasharray="0.7 0.8" strokeWidth="0.55" />
        <circle cx={svgCueStart.x} cy={svgCueStart.y} r={svgR} fill="#fafafa" stroke="#d9d9d9" strokeWidth="0.55" />
        <circle cx={svgObject.x} cy={svgObject.y} r={svgR} fill="#ffcc43" stroke="#9e7b20" strokeWidth="0.55" />

        <circle cx={svgPocket.x} cy={svgPocket.y} r={0.75} fill="#f7b267" />

        <text x={MARGIN + 1.5} y={MARGIN - 1.3} fontSize="2.5" fill="#d6ddd8">
          9 ft table | 4.5 in pockets | diamond-index mapped physics diagram
        </text>

        <text x={MARGIN + 1.5} y={MARGIN + TABLE_WIDTH_IN + 3.1} fontSize="2.15" fill="#b9d4c7">
          CB D({cbDiamond.long.toFixed(2)}, {cbDiamond.short.toFixed(2)}) snap ({snapDiamond(cbDiamond.long).toFixed(1)}, {snapDiamond(cbDiamond.short).toFixed(1)})
        </text>
        <text x={MARGIN + 1.5} y={MARGIN + TABLE_WIDTH_IN + 5.35} fontSize="2.15" fill="#b9d4c7">
          GB D({gbDiamond.long.toFixed(2)}, {gbDiamond.short.toFixed(2)}) snap ({snapDiamond(gbDiamond.long).toFixed(1)}, {snapDiamond(gbDiamond.short).toFixed(1)})
        </text>
        <text x={MARGIN + 1.5} y={MARGIN + TABLE_WIDTH_IN + 7.6} fontSize="2.15" fill="#b9d4c7">
          OB D({obDiamond.long.toFixed(2)}, {obDiamond.short.toFixed(2)}) snap ({snapDiamond(obDiamond.long).toFixed(1)}, {snapDiamond(obDiamond.short).toFixed(1)})
        </text>
      </svg>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ivory-200">
        <p>
          <span className="font-semibold text-chalk-300">CB path:</span> white dashed to impact, then purple post-collision
        </p>
        <p>
          <span className="font-semibold text-chalk-300">OB path:</span> gold line toward selected pocket
        </p>
        <p>
          <span className="font-semibold text-chalk-300">Ghost ball:</span> dashed circle at collision center
        </p>
        <p>
          <span className="font-semibold text-chalk-300">Tangent:</span> cyan 90-degree line at impact
        </p>
        <p>
          <span className="font-semibold text-chalk-300">Fractions:</span> 1/4, 1/2, and full-ball contact ladder
        </p>
        <p>
          <span className="font-semibold text-chalk-300">Throw:</span> +/-2 degree expected band, +/-4 degree outer estimate
        </p>
        <p>
          <span className="font-semibold text-chalk-300">Speed tiers:</span> soft, medium, firm post-impact CB travel
        </p>
        <p>
          <span className="font-semibold text-chalk-300">Diamond grid:</span> full cross-grid at 1-diamond spacing
        </p>
        <p>
          <span className="font-semibold text-chalk-300">Target zones:</span> drill-specific landing or contact zones
        </p>
      </div>
    </div>
  );
}