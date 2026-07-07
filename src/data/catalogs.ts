import type { BullseyeCategory, WpbRatingTier } from '../types/tracker';

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

export const wpbModuleSuggestions = Array.from(wpbSuggestionSet.values()).sort((a, b) => a.localeCompare(b));

export const wpbRatingTiers: WpbRatingTier[] = [
  'Beginner',
  'Novice',
  'Intermediate',
  'Advanced',
  'Shortstop',
  'Pro',
];

function uniqueTiers(tiers: WpbRatingTier[]): WpbRatingTier[] {
  return wpbRatingTiers.filter((tier) => tiers.includes(tier));
}

function normalizeDrillKey(value: string): string {
  return value.trim().toLowerCase();
}

const wpbTierOverrides: Record<string, WpbRatingTier[]> = {
  [normalizeDrillKey('Aim Training - Level I')]: ['Beginner', 'Novice', 'Intermediate'],
  [normalizeDrillKey('Aim Training - Level II')]: ['Novice', 'Intermediate', 'Advanced'],
  [normalizeDrillKey('Aim Training - Level III')]: ['Intermediate', 'Advanced', 'Shortstop', 'Pro'],
  [normalizeDrillKey('Straight Pool High Run')]: ['Intermediate', 'Advanced', 'Shortstop', 'Pro'],
  [normalizeDrillKey('Around The World')]: ['Intermediate', 'Advanced', 'Shortstop', 'Pro'],
  [normalizeDrillKey('Consecutive Long Jump Shots')]: ['Intermediate', 'Advanced', 'Shortstop', 'Pro'],
};

function inferWpbTiersFromDrillName(drillName: string): WpbRatingTier[] {
  const normalized = normalizeDrillKey(drillName);

  if (normalized.includes('level i') || normalized.includes('basic') || normalized.includes('short')) {
    return ['Beginner', 'Novice', 'Intermediate'];
  }

  if (normalized.includes('level ii') || normalized.includes('distance varied') || normalized.includes('micro')) {
    return ['Novice', 'Intermediate', 'Advanced'];
  }

  if (
    normalized.includes('level iii')
    || normalized.includes('high run')
    || normalized.includes('around the world')
    || normalized.includes('very long')
    || normalized.includes('long jump')
  ) {
    return ['Intermediate', 'Advanced', 'Shortstop', 'Pro'];
  }

  return [...wpbRatingTiers];
}

function getDrillNameFromModule(moduleName: string): string {
  const parts = moduleName.split('>').map((item) => item.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? moduleName.trim();
}

export function getWpbTierOptionsForModule(moduleName: string): WpbRatingTier[] {
  const drillName = getDrillNameFromModule(moduleName);
  if (!drillName) return [...wpbRatingTiers];

  const key = normalizeDrillKey(drillName);
  const explicit = wpbTierOverrides[key];
  if (explicit) return uniqueTiers(explicit);

  return uniqueTiers(inferWpbTiersFromDrillName(drillName));
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
