import type { BullseyeCategory, WpbCategory, WpbRatingTier } from '../types/tracker';
import { trackerDrills } from './trackerPlan';

import bullseyeCanonicalRaw from '../../docs/catalogs/bullseye-canonical.json?raw';
import drillroomCanonicalRaw from '../../docs/catalogs/drillroom-canonical.json?raw';
import wpbCanonicalRaw from '../../docs/catalogs/wpb-canonical.json?raw';

interface BullseyeCanonicalEntry {
  seriesName?: string;
}

interface BullseyeCanonicalPayload {
  entries?: BullseyeCanonicalEntry[];
}

interface WpbCanonicalEntry {
  topCategory?: string;
  seriesName?: string;
  drills?: string[];
}

interface WpbCanonicalPayload {
  entries?: WpbCanonicalEntry[];
}

interface DrillroomCanonicalDrill {
  name?: string;
}

interface DrillroomCanonicalEntry {
  topCategory?: string;
  drills?: DrillroomCanonicalDrill[];
}

interface DrillroomCanonicalPayload {
  entries?: DrillroomCanonicalEntry[];
}

const trackerCategories: BullseyeCategory[] = [
  'Follow',
  'Stun',
  'Draw',
  'Sidespin',
  'Thin Cuts',
  'Cheating the Pocket',
  'Rail-First',
  'High Spin',
  'Finesse',
  'Safety',
  'Mixed',
  'Shot Clock Challenge',
];

function parseCatalog<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const bullseyeCatalog = parseCatalog<BullseyeCanonicalPayload>(bullseyeCanonicalRaw);
const drillroomCatalog = parseCatalog<DrillroomCanonicalPayload>(drillroomCanonicalRaw);
const wpbCatalog = parseCatalog<WpbCanonicalPayload>(wpbCanonicalRaw);

const normalizedTracker = new Map(
  trackerCategories.map((category) => [category.toLowerCase(), category] as const),
);

const canonicalBullseyeMatches = new Set<BullseyeCategory>();
for (const entry of bullseyeCatalog?.entries ?? []) {
  const matched = normalizedTracker.get((entry.seriesName ?? '').trim().toLowerCase());
  if (matched) canonicalBullseyeMatches.add(matched);
}

export const bullseyeCategoryOptions: BullseyeCategory[] = [
  ...Array.from(canonicalBullseyeMatches.values()).sort((a, b) => a.localeCompare(b)),
  ...trackerCategories.filter((category) => !canonicalBullseyeMatches.has(category)),
];

const wpbSuggestionSet = new Set<string>();
for (const entry of wpbCatalog?.entries ?? []) {
  const topCategory = (entry.topCategory ?? '').trim();
  const seriesName = (entry.seriesName ?? '').trim();
  for (const drill of entry.drills ?? []) {
    const normalizedDrill = drill.trim();
    if (!normalizedDrill) continue;
    wpbSuggestionSet.add(`${topCategory} > ${seriesName} > ${normalizedDrill}`);
  }
}

for (const drill of trackerDrills.filter((item) => item.app === 'WPB')) {
  const name = drill.name.trim();
  if (!name) continue;

  const topCategory =
    drill.metricField === 'safetyExchangeSuccessPct'
      ? 'Defense'
      : drill.metricField === 'lineUpShotCount'
        ? 'Position Play & Runouts'
        : 'Fundamentals';
  wpbSuggestionSet.add(`${topCategory} > Core > ${name}`);
}

export const wpbModuleSuggestions = Array.from(wpbSuggestionSet.values()).sort((a, b) => a.localeCompare(b));

export const wpbRatingTiers: WpbRatingTier[] = [
  'Beginner',
  'Novice',
  'Intermediate',
  'Advanced',
  'Shortstop',
  'Pro',
];

export const wpbCategoryOptions: WpbCategory[] = [
  'Fundamentals',
  'Aiming & Shotmaking',
  'Cue Ball Control',
  'Position Play & Runouts',
  'Defense',
  'Jump Shots',
];

function uniqueTiers(tiers: WpbRatingTier[]): WpbRatingTier[] {
  return wpbRatingTiers.filter((tier) => tiers.includes(tier));
}

export function getWpbTierOptionsForCategory(_category?: WpbCategory): WpbRatingTier[] {
  return uniqueTiers([...wpbRatingTiers]);
}

const drillRoomSuggestionSet = new Set<string>();
for (const entry of drillroomCatalog?.entries ?? []) {
  const topCategory = (entry.topCategory ?? '').trim();
  for (const drill of entry.drills ?? []) {
    const drillName = (drill.name ?? '').trim();
    if (!drillName) continue;
    drillRoomSuggestionSet.add(`${topCategory} > ${drillName}`);
  }
}

export const drillRoomDrillSuggestions = Array.from(drillRoomSuggestionSet.values()).sort((a, b) => a.localeCompare(b));
