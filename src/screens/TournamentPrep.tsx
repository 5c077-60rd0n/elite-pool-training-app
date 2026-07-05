import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { useProgressStore } from '../store/useProgressStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { trackerKpis } from '../data/trackerKpis';
import { calculateDrillReadinessScore } from '../utils/matchSimulator';
import { estimateFargo, phaseFromFargo } from '../utils/trackerCalculations';
import type { OpponentPrepCard } from '../types/tracker';
import type { PrepChecklist, TournamentPrep } from '../types/models';

type TournamentTemplate = {
  id: string;
  name: string;
  format: string;
  locationHint: string;
  baseFieldRange: [number, number];
  travelCost: 'low' | 'medium' | 'high';
  variance: 'low' | 'medium' | 'high';
  notes: string;
};

type FinderCandidate = TournamentTemplate & {
  source: 'template' | 'api';
  eventDate?: string;
  registrationUrl?: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
  entryFee?: number;
  addedMoney?: number;
};

type SavedFeed = {
  id: string;
  name: string;
  url: string;
};

const TOURNAMENT_FEED_URL_KEY = 'fargo-climb-tournament-feed-url';
const TOURNAMENT_FEED_PRESETS_KEY = 'fargo-climb-tournament-feed-presets';
const BEST_FIT_FEED_ID = 'elite-best-fit-feed';
const BEST_FIT_FEED_URL = '/demo/elite-best-fit-feed.json';
const BEST_FIT_FEED_NAME = 'Elite Best-Fit Feed';
const STARTER_FEED_ID = 'starter-demo-feed';
const STARTER_FEED_URL = '/demo/tournament-feed.json';
const STARTER_FEED_NAME = 'Starter Demo Feed';
const LIVE_SNOOKER_UPCOMING_FEED_ID = 'live-snooker-upcoming';
const LIVE_SNOOKER_UPCOMING_FEED_URL = 'https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4555';
const LIVE_SNOOKER_UPCOMING_FEED_NAME = 'Live Feed: World Snooker Upcoming';
const LIVE_SNOOKER_RECENT_FEED_ID = 'live-snooker-recent';
const LIVE_SNOOKER_RECENT_FEED_URL = 'https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=4555';
const LIVE_SNOOKER_RECENT_FEED_NAME = 'Live Feed: World Snooker Recent';
const MATCHROOM_FEED_ID = 'matchroom-events-feed';
const MATCHROOM_FEED_URL = '/demo/matchroom-events-feed.json';
const MATCHROOM_FEED_NAME = 'Matchroom Events';

const DEFAULT_FEED_PRESETS: SavedFeed[] = [
  { id: BEST_FIT_FEED_ID, name: BEST_FIT_FEED_NAME, url: BEST_FIT_FEED_URL },
  { id: MATCHROOM_FEED_ID, name: MATCHROOM_FEED_NAME, url: MATCHROOM_FEED_URL },
  { id: LIVE_SNOOKER_UPCOMING_FEED_ID, name: LIVE_SNOOKER_UPCOMING_FEED_NAME, url: LIVE_SNOOKER_UPCOMING_FEED_URL },
  { id: LIVE_SNOOKER_RECENT_FEED_ID, name: LIVE_SNOOKER_RECENT_FEED_NAME, url: LIVE_SNOOKER_RECENT_FEED_URL },
  { id: STARTER_FEED_ID, name: STARTER_FEED_NAME, url: STARTER_FEED_URL },
];

function loadSavedFeeds(): SavedFeed[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(TOURNAMENT_FEED_PRESETS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): SavedFeed | null => {
        const row = asRecord(item);
        if (!row) return null;
        const id = asString(row.id);
        const name = asString(row.name);
        const url = asString(row.url);
        if (!id || !name || !url) return null;
        return { id, name, url };
      })
      .filter((item): item is SavedFeed => Boolean(item));
  } catch {
    return [];
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function mapTravelCost(value: unknown): 'low' | 'medium' | 'high' {
  const normalized = asString(value)?.toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') return normalized;
  const distance = asNumber(value);
  if (typeof distance === 'number') {
    if (distance <= 30) return 'low';
    if (distance <= 120) return 'medium';
    return 'high';
  }
  return 'medium';
}

function mapVariance(value: unknown, fieldSize?: number): 'low' | 'medium' | 'high' {
  const normalized = asString(value)?.toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') return normalized;
  if (typeof fieldSize === 'number') {
    if (fieldSize <= 24) return 'low';
    if (fieldSize <= 64) return 'medium';
    return 'high';
  }
  return 'medium';
}

function normalizeMapQuery(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'TBA' || trimmed === 'Unknown venue') return undefined;
  return trimmed;
}

function buildMapSearchUrl(value: string | undefined): string | undefined {
  const query = normalizeMapQuery(value);
  if (!query) return undefined;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

function buildMapEmbedUrl(lat: number, lon: number): string {
  const delta = 0.02;
  const left = lon - delta;
  const right = lon + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;
}

async function geocodeLocation(query: string): Promise<{ lat: number; lon: number } | null> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload) || payload.length === 0) return null;

  const first = asRecord(payload[0]);
  const lat = asNumber(first?.lat);
  const lon = asNumber(first?.lon);
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  return { lat, lon };
}

function normalizeFeedCandidates(payload: unknown): FinderCandidate[] {
  const root = asRecord(payload);
  const data = root?.events ?? root?.results ?? root?.data ?? payload;
  if (!Array.isArray(data)) return [];

  const normalized = data
    .map((item, index): FinderCandidate | null => {
      const row = asRecord(item);
      if (!row) return null;

      const name = asString(row.name ?? row.title ?? row.eventName ?? row.strEvent);
      if (!name) return null;

      const eventDate = asString(row.date ?? row.startDate ?? row.start_at ?? row.eventDate ?? row.dateEvent);
      const locationHint = asString(row.location ?? row.city ?? row.venue ?? row.room ?? row.strVenue ?? row.strCity) ?? 'Unknown venue';
      const format = asString(row.format ?? row.raceFormat ?? row.gameFormat ?? row.strLeague ?? row.strSport) ?? 'Race format TBA';
      const minFargo = asNumber(row.minFargo ?? row.min_rating ?? row.minRating);
      const maxFargo = asNumber(row.maxFargo ?? row.max_rating ?? row.maxRating);
      const entryFee = asNumber(row.entryFee ?? row.fee ?? row.entry_fee);
      const addedMoney = asNumber(row.addedMoney ?? row.added_money ?? row.prizeAdded);
      const fieldSize = asNumber(row.fieldSize ?? row.players ?? row.playerCount);
      const latitude = asNumber(row.latitude ?? row.lat);
      const longitude = asNumber(row.longitude ?? row.lon ?? row.lng);

      const lower = typeof minFargo === 'number' ? minFargo : 520;
      const upper = typeof maxFargo === 'number' ? maxFargo : 780;

      const travelCost = mapTravelCost(row.travelCost ?? row.distanceMiles ?? row.distance ?? row.strCountry);
      const variance = mapVariance(row.variance ?? row.volatility ?? row.strStatus, fieldSize);

      const valueEdge =
        typeof addedMoney === 'number' && typeof entryFee === 'number' && entryFee > 0
          ? `${Math.round((addedMoney / entryFee) * 10) / 10}x added/fee`
          : 'value ratio unavailable';

      return {
        id: asString(row.id) ?? `api-event-${index}`,
        name,
        format,
        locationHint,
        baseFieldRange: [Math.round(lower), Math.round(upper)],
        travelCost,
        variance,
        notes: `${valueEdge}${fieldSize ? ` · field ${fieldSize}` : ''}`,
        source: 'api',
        eventDate,
        registrationUrl: asString(row.registrationUrl ?? row.url ?? row.link),
        mapUrl: asString(row.mapUrl ?? row.map ?? row.strMap),
        latitude,
        longitude,
        entryFee,
        addedMoney,
      };
    })
    .filter((item): item is FinderCandidate => Boolean(item));

  return normalized.slice(0, 24);
}

async function fetchTournamentFeed(feedUrl: string): Promise<FinderCandidate[]> {
  const response = await fetch(feedUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  return normalizeFeedCandidates(payload);
}

const tournamentTemplates: TournamentTemplate[] = [
  {
    id: 'local-weekly-handicap',
    name: 'Local Weekly Handicap Tour',
    format: 'Race to 5 (handicap)',
    locationHint: 'Local room (<= 30 min)',
    baseFieldRange: [500, 700],
    travelCost: 'low',
    variance: 'low',
    notes: 'High reps, lower cost, steady pressure exposure.',
  },
  {
    id: 'regional-race-open',
    name: 'Regional Race Open',
    format: 'Race to 7 (open)',
    locationHint: 'Regional room (1-2h travel)',
    baseFieldRange: [600, 760],
    travelCost: 'medium',
    variance: 'medium',
    notes: 'Balanced growth event with stronger fields and manageable volatility.',
  },
  {
    id: 'state-major-open',
    name: 'State Major Open',
    format: 'Race to 9 (open)',
    locationHint: 'State major venue (2h+ travel)',
    baseFieldRange: [680, 820],
    travelCost: 'high',
    variance: 'high',
    notes: 'Maximum upside and test pressure, but higher fatigue and variance.',
  },
];

function travelPenalty(cost: TournamentTemplate['travelCost']): number {
  if (cost === 'low') return 0;
  if (cost === 'medium') return 8;
  return 16;
}

function variancePenalty(value: TournamentTemplate['variance'], readiness: number): number {
  if (value === 'low') return 0;
  if (value === 'medium') return readiness < 65 ? 6 : 2;
  return readiness < 70 ? 14 : 8;
}

function prepStartDate(date: string): string {
  const target = new Date(`${date}T00:00:00`);
  target.setDate(target.getDate() - 14);
  return target.toISOString().slice(0, 10);
}

function buildChecklist(): PrepChecklist[] {
  const steps: Array<{ label: string; daysOut: number }> = [
    { label: 'Lock event goals and match format strategy', daysOut: 14 },
    { label: 'Set break plan and first-inning options', daysOut: 10 },
    { label: 'Pressure-set simulation (race format)', daysOut: 7 },
    { label: 'Safety and kick response rehearsal', daysOut: 5 },
    { label: 'Refine weakest KPI block under timer', daysOut: 3 },
    { label: 'Equipment, logistics, and nutrition prep', daysOut: 2 },
    { label: 'Mental reset routine and visualization', daysOut: 1 },
    { label: 'Event-day warm-up protocol', daysOut: 0 },
  ];

  return steps.map((step) => ({
    id: `prep-${step.daysOut}`,
    label: step.label,
    daysOut: step.daysOut,
    completed: false,
  }));
}

export default function TournamentPrep() {
  const defaultFeedUrl = (import.meta.env.VITE_TOURNAMENT_FEED_URL as string | undefined) ?? '';
  const profile = useSettingsStore((s) => s.profile);
  const tournamentPreps = useProgressStore((s) => s.tournamentPreps);
  const upsertTournamentPrep = useProgressStore((s) => s.upsertTournamentPrep);
  const addCompetitionLog = useTrackerStore((s) => s.addCompetitionLog);
  const matchSimSessions = useTrackerStore((s) => s.matchSimSessions);
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const opponentPrepCards = useTrackerStore((s) => s.opponentPrepCards);
  const upsertOpponentPrepCard = useTrackerStore((s) => s.upsertOpponentPrepCard);
  const confidenceIndexHistory = useTrackerStore((s) => s.confidenceIndexHistory);
  const fargoRatingLog = useTrackerStore((s) => s.fargoRatingLog);

  const [activePrepId, setActivePrepId] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState('Race to 7');
  const [location, setLocation] = useState('');
  const [result, setResult] = useState('Win');
  const [bestDecisions, setBestDecisions] = useState('');
  const [weakestDecisions, setWeakestDecisions] = useState('');
  const [primarySkillGap, setPrimarySkillGap] = useState('');
  const [focusAreaId, setFocusAreaId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardArchetype, setCardArchetype] = useState('');
  const [openingPatternsText, setOpeningPatternsText] = useState('');
  const [safetyPlansText, setSafetyPlansText] = useState('');
  const [bailoutChoicesText, setBailoutChoicesText] = useState('');
  const [cardNotes, setCardNotes] = useState('');
  const [feedUrl, setFeedUrl] = useState(() => {
    if (typeof localStorage === 'undefined') return defaultFeedUrl || BEST_FIT_FEED_URL;
    return (localStorage.getItem(TOURNAMENT_FEED_URL_KEY) ?? defaultFeedUrl) || BEST_FIT_FEED_URL;
  });
  const [feedStatus, setFeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedError, setFeedError] = useState('');
  const [feedEvents, setFeedEvents] = useState<FinderCandidate[]>([]);
  const [savedFeeds, setSavedFeeds] = useState<SavedFeed[]>(() => loadSavedFeeds());
  const [selectedFeedId, setSelectedFeedId] = useState('custom');
  const [selectedFinderId, setSelectedFinderId] = useState('');
  const [selectedTournamentEmbedUrl, setSelectedTournamentEmbedUrl] = useState('');

  const sortedPreps = useMemo(
    () => [...tournamentPreps].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [tournamentPreps],
  );

  const activePrep = useMemo(
    () => sortedPreps.find((entry) => entry.id === activePrepId) ?? sortedPreps[0],
    [activePrepId, sortedPreps],
  );

  const eventReached = activePrep ? new Date(`${activePrep.date}T23:59:59`).getTime() <= Date.now() : false;

  useEffect(() => {
    if (!activePrep) {
      setResult('Win');
      setBestDecisions('');
      setWeakestDecisions('');
      setPrimarySkillGap('');
      setFocusAreaId('');
      setNotes('');
      return;
    }

    const analysis = activePrep.postEventAnalysis;
    setResult(analysis?.result ?? 'Win');
    setBestDecisions((analysis?.bestDecisions ?? []).join('\n'));
    setWeakestDecisions((analysis?.weakestDecisions ?? []).join('\n'));
    setPrimarySkillGap(analysis?.primarySkillGap ?? '');
    setFocusAreaId(analysis?.linkedFocusAreaId ?? analysis?.linkedDrillId ?? '');
    setNotes(analysis?.notes ?? '');
  }, [activePrep]);

  const completionPercent = useMemo(() => {
    if (!activePrep || activePrep.checklistItems.length === 0) return 0;
    const done = activePrep.checklistItems.filter((item) => item.completed).length;
    return Math.round((done / activePrep.checklistItems.length) * 100);
  }, [activePrep]);

  const latestMatchSimulation = useMemo(
    () => [...matchSimSessions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0],
    [matchSimSessions],
  );
  const selectedCard = useMemo(
    () => opponentPrepCards.find((item) => item.id === selectedCardId) ?? opponentPrepCards[0],
    [opponentPrepCards, selectedCardId],
  );
  const opponentCardMap = useMemo(
    () => Object.fromEntries(opponentPrepCards.map((item) => [item.id, item])),
    [opponentPrepCards],
  );
  const drillReadinessScore = useMemo(() => calculateDrillReadinessScore(logs), [logs]);
  const estimatedFargo = useMemo(
    () => estimateFargo(profile.currentFargoRating, logs, fargoRatingLog),
    [fargoRatingLog, logs, profile.currentFargoRating],
  );
  const activePhase = useMemo(() => Math.max(profile.currentPhase, phaseFromFargo(estimatedFargo)), [estimatedFargo, profile.currentPhase]);
  const confidenceScore = confidenceIndexHistory[0]?.score ?? 0;

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TOURNAMENT_FEED_URL_KEY, feedUrl);
  }, [feedUrl]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TOURNAMENT_FEED_PRESETS_KEY, JSON.stringify(savedFeeds));
  }, [savedFeeds]);

  useEffect(() => {
    setSavedFeeds((state) => {
      const merged = [...state];
      for (const preset of DEFAULT_FEED_PRESETS) {
        const exists = merged.some((feed) => feed.id === preset.id || feed.url === preset.url);
        if (!exists) merged.push(preset);
      }
      if (merged.length === state.length) return state;
      return merged.slice(0, 10);
    });
  }, []);

  const refreshEventFeed = useCallback(async (): Promise<void> => {
    if (!feedUrl.trim()) {
      setFeedEvents([]);
      setFeedStatus('idle');
      setFeedError('');
      return;
    }

    try {
      setFeedStatus('loading');
      setFeedError('');
      const events = await fetchTournamentFeed(feedUrl.trim());
      setFeedEvents(events);
      setFeedStatus('success');
      if (!events.length) {
        setFeedError('Feed loaded but returned no usable events.');
      }
    } catch (error) {
      setFeedStatus('error');
      setFeedEvents([]);
      setFeedError(error instanceof Error ? error.message : 'Unable to load feed events.');
    }
  }, [feedUrl]);

  useEffect(() => {
    void refreshEventFeed();
  }, [refreshEventFeed]);

  const finderCandidates = useMemo<FinderCandidate[]>(() => {
    if (feedEvents.length) return feedEvents;
    return tournamentTemplates.map((template) => ({ ...template, source: 'template' }));
  }, [feedEvents]);

  const tournamentFinder = useMemo(() => {
    const readiness = Math.round((drillReadinessScore * 0.65) + (confidenceScore * 0.35));

    const scored = finderCandidates.map((candidate) => {
      const inBand = estimatedFargo >= candidate.baseFieldRange[0] && estimatedFargo <= candidate.baseFieldRange[1];
      const nearBand = Math.abs(estimatedFargo - candidate.baseFieldRange[0]) <= 40 || Math.abs(estimatedFargo - candidate.baseFieldRange[1]) <= 40;

      let score = 55;
      if (inBand) score += 18;
      else if (nearBand) score += 8;

      if (activePhase <= 2 && candidate.id === 'local-weekly-handicap') score += 14;
      if (activePhase === 3 && candidate.id === 'regional-race-open') score += 14;
      if (activePhase >= 4 && candidate.id === 'state-major-open') score += 14;

      if (readiness >= 72 && candidate.variance !== 'low') score += 8;
      if (readiness < 60 && candidate.variance === 'low') score += 8;

      if (candidate.source === 'api' && typeof candidate.entryFee === 'number' && typeof candidate.addedMoney === 'number') {
        const ratio = candidate.entryFee > 0 ? candidate.addedMoney / candidate.entryFee : 0;
        score += Math.max(0, Math.min(12, Math.round(ratio * 2)));
      }

      score -= travelPenalty(candidate.travelCost);
      score -= variancePenalty(candidate.variance, readiness);

      return {
        ...candidate,
        score: Math.max(1, Math.min(100, Math.round(score))),
      };
    }).sort((a, b) => b.score - a.score);

    return {
      readiness,
      best: scored[0],
      alternatives: scored.slice(1),
    };
  }, [activePhase, confidenceScore, drillReadinessScore, estimatedFargo, finderCandidates]);

  useEffect(() => {
    if (!tournamentFinder.best) {
      setSelectedFinderId('');
      return;
    }

    const stillExists = [tournamentFinder.best, ...tournamentFinder.alternatives]
      .some((candidate) => candidate.id === selectedFinderId);

    if (!stillExists) {
      setSelectedFinderId(tournamentFinder.best.id);
    }
  }, [selectedFinderId, tournamentFinder]);

  const selectedTournament = useMemo(
    () => [tournamentFinder.best, ...tournamentFinder.alternatives].find((candidate) => candidate.id === selectedFinderId) ?? tournamentFinder.best,
    [selectedFinderId, tournamentFinder],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadMapEmbed(): Promise<void> {
      const query = normalizeMapQuery(selectedTournament?.locationHint);
      if (typeof selectedTournament?.latitude === 'number' && typeof selectedTournament?.longitude === 'number') {
        setSelectedTournamentEmbedUrl(buildMapEmbedUrl(selectedTournament.latitude, selectedTournament.longitude));
        return;
      }

      if (!query) {
        setSelectedTournamentEmbedUrl('');
        return;
      }

      const coordinates = await geocodeLocation(query);
      if (cancelled) return;
      setSelectedTournamentEmbedUrl(coordinates ? buildMapEmbedUrl(coordinates.lat, coordinates.lon) : '');
    }

    void loadMapEmbed();

    return () => {
      cancelled = true;
    };
  }, [selectedTournament?.latitude, selectedTournament?.locationHint, selectedTournament?.longitude]);

  useEffect(() => {
    if (!selectedCard && opponentPrepCards.length) {
      setSelectedCardId(opponentPrepCards[0].id);
      return;
    }
    if (!selectedCard) {
      setCardName('');
      setCardArchetype('');
      setOpeningPatternsText('');
      setSafetyPlansText('');
      setBailoutChoicesText('');
      setCardNotes('');
      return;
    }

    setCardName(selectedCard.name);
    setCardArchetype(selectedCard.archetype);
    setOpeningPatternsText(selectedCard.openingPatterns.join('\n'));
    setSafetyPlansText(selectedCard.safetyPlans.join('\n'));
    setBailoutChoicesText(selectedCard.bailoutChoices.join('\n'));
    setCardNotes(selectedCard.notes);
  }, [opponentPrepCards, selectedCard]);

  function splitLines(value: string): string[] {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  function createPrep(): void {
    const entry: TournamentPrep = {
      id: `tp-${Date.now()}`,
      tournamentName,
      date,
      format,
      location,
      opponentPrepCardId: selectedCard?.id,
      prepStartDate: prepStartDate(date),
      currentStep: 1,
      checklistItems: buildChecklist(),
    };

    upsertTournamentPrep(entry);
    setActivePrepId(entry.id);
    setTournamentName('');
    setLocation('');
  }

  function toggleChecklist(itemId: string): void {
    if (!activePrep) return;
    const checklistItems = activePrep.checklistItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    );
    const completed = checklistItems.filter((item) => item.completed).length;
    upsertTournamentPrep({
      ...activePrep,
      checklistItems,
      currentStep: Math.min(checklistItems.length, completed + 1),
    });
  }

  function savePostEventAnalysis(): void {
    if (!activePrep) return;

    const best = bestDecisions
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
    const weakest = weakestDecisions
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
    const focusLabel = trackerKpis.find((kpi) => kpi.id === focusAreaId)?.name;
    const prepCard = activePrep.opponentPrepCardId
      ? opponentCardMap[activePrep.opponentPrepCardId]
      : undefined;

    upsertTournamentPrep({
      ...activePrep,
      postEventAnalysis: {
        result,
        bestDecisions: best,
        weakestDecisions: weakest,
        primarySkillGap,
        linkedFocusAreaId: focusAreaId || undefined,
        linkedDrillId: focusAreaId || undefined,
        notes,
      },
    });

    addCompetitionLog({
      id: `competition-${activePrep.id}`,
      date: activePrep.date,
      eventName: activePrep.tournamentName,
      format: activePrep.format,
      result,
      notes: [
        notes.trim(),
        prepCard ? `Opponent card: ${prepCard.name}` : '',
        primarySkillGap ? `Primary skill gap: ${primarySkillGap}` : '',
        focusLabel ? `Recovery focus: ${focusLabel}` : '',
      ]
        .filter(Boolean)
        .join(' | '),
    });
  }

  function saveOpponentPrepCard(): void {
    if (!cardName.trim()) return;

    const entry: OpponentPrepCard = {
      id: selectedCard?.id ?? `opp-${Date.now()}`,
      name: cardName.trim(),
      archetype: cardArchetype.trim() || 'Custom',
      openingPatterns: splitLines(openingPatternsText),
      safetyPlans: splitLines(safetyPlansText),
      bailoutChoices: splitLines(bailoutChoicesText),
      notes: cardNotes.trim(),
      updatedAt: new Date().toISOString(),
    };

    upsertOpponentPrepCard(entry);
    setSelectedCardId(entry.id);
  }

  function createNewOpponentCard(): void {
    setSelectedCardId('');
    setCardName('Custom Opponent Plan');
    setCardArchetype(latestMatchSimulation?.opponentArchetype ?? 'Custom');
    setOpeningPatternsText('');
    setSafetyPlansText('');
    setBailoutChoicesText('');
    setCardNotes('');
  }

  function attachCardToActivePrep(): void {
    if (!activePrep || !selectedCard) return;
    upsertTournamentPrep({
      ...activePrep,
      opponentPrepCardId: selectedCard.id,
    });
  }

  function applyFinderTemplate(): void {
    if (!selectedTournament) return;
    setTournamentName(selectedTournament.name);
    setFormat(selectedTournament.format);
    setLocation(selectedTournament.locationHint);
    if (selectedTournament.eventDate) {
      setDate(selectedTournament.eventDate);
    }
  }

  function applySavedFeed(feedId: string): void {
    setSelectedFeedId(feedId);
    if (feedId === 'custom') return;
    const preset = savedFeeds.find((item) => item.id === feedId);
    if (!preset) return;
    setFeedUrl(preset.url);
  }

  function saveCurrentFeedPreset(): void {
    const url = feedUrl.trim();
    if (!url) return;
    const suggestedName = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return 'Tournament Feed';
      }
    })();
    const name = window.prompt('Name this feed preset', suggestedName)?.trim();
    if (!name) return;

    const existing = savedFeeds.find((item) => item.url === url);
    if (existing) {
      setSavedFeeds((state) => state.map((item) => item.id === existing.id ? { ...item, name } : item));
      setSelectedFeedId(existing.id);
      return;
    }

    const id = `feed-${Date.now()}`;
    setSavedFeeds((state) => [{ id, name, url }, ...state].slice(0, 10));
    setSelectedFeedId(id);
  }

  function removeSelectedFeedPreset(): void {
    if (selectedFeedId === 'custom') return;
    setSavedFeeds((state) => state.filter((item) => item.id !== selectedFeedId));
    setSelectedFeedId('custom');
  }

  const selectedTournamentMapUrl = selectedTournament?.mapUrl ?? buildMapSearchUrl(selectedTournament?.locationHint);

  return (
    <PageWrapper title="Tournament Prep">
      <Card className="mb-4" title="Create Tournament Plan">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={tournamentName}
            onChange={(event) => setTournamentName(event.target.value)}
            placeholder="Tournament name"
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <input
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            placeholder="Format"
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
        </div>
        <Button className="mt-3 w-full" onClick={createPrep} disabled={!tournamentName || !location}>
          Create 14-Day Prep Plan
        </Button>
      </Card>

      <Card className="mb-4" title="Match Simulator Signal">
        {latestMatchSimulation ? (
          <>
            <p className="text-sm text-ivory-100">Last simulation: {latestMatchSimulation.date} · {latestMatchSimulation.opponentArchetype}</p>
            <p className="text-xs text-chalk-300">Match readiness {latestMatchSimulation.matchReadinessScore} vs drill readiness {drillReadinessScore}</p>
            <p className="text-xs text-chalk-300">Pressure execution {latestMatchSimulation.pressureShotsMade}/{latestMatchSimulation.pressureShotsAttempted} · Safety wins {latestMatchSimulation.safetyWins}</p>
          </>
        ) : (
          <p className="text-sm text-chalk-300">No simulation data yet. Run a race-format simulation before your next event prep cycle.</p>
        )}
        <Link to="/match-simulator">
          <Button className="mt-3" variant="secondary">Run Simulation</Button>
        </Link>
      </Card>

      <Card className="mb-4" title="Tournament Value Finder">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <select
            value={selectedFeedId}
            onChange={(event) => applySavedFeed(event.target.value)}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            <option value="custom">Custom feed URL</option>
            {savedFeeds.map((feed) => (
              <option key={feed.id} value={feed.id}>{feed.name}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={saveCurrentFeedPreset} disabled={!feedUrl.trim()}>
            Save Feed
          </Button>
          <Button variant="secondary" onClick={removeSelectedFeedPreset} disabled={selectedFeedId === 'custom'}>
            Remove
          </Button>
        </div>

        <input
          value={feedUrl}
          onChange={(event) => setFeedUrl(event.target.value)}
          placeholder="Tournament API feed URL (JSON)"
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <Button className="mt-2" variant="secondary" onClick={() => void refreshEventFeed()}>
          {feedStatus === 'loading' ? 'Refreshing Feed...' : 'Refresh Event Feed'}
        </Button>
        {feedStatus === 'success' ? <p className="mt-2 text-xs text-cue-300">Feed loaded: {feedEvents.length} events</p> : null}
        {feedError ? <p className="mt-2 text-xs text-chalk-300">Feed note: {feedError}</p> : null}

        <select
          value={selectedTournament?.id ?? ''}
          onChange={(event) => setSelectedFinderId(event.target.value)}
          className="mt-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        >
          {[tournamentFinder.best, ...tournamentFinder.alternatives].map((candidate, index) => (
            <option key={candidate.id} value={candidate.id}>
              {index === 0 ? `Recommended: ${candidate.name}` : `${index}. ${candidate.name}`}
            </option>
          ))}
        </select>

        <p className="text-sm text-ivory-100">Recommended now: {tournamentFinder.best.name}</p>
        <p className="text-xs text-chalk-300">Phase {activePhase} · Est Fargo {estimatedFargo} · Readiness {tournamentFinder.readiness}</p>
        {selectedTournament ? (
          <>
            <p className="mt-2 text-sm text-ivory-100">Selected tournament: {selectedTournament.name}</p>
            <p className="mt-1 text-xs text-chalk-300">Value score: {selectedTournament.score}/100 · {selectedTournament.notes}</p>
            <p className="mt-1 text-xs text-chalk-300">Format: {selectedTournament.format} · Travel: {selectedTournament.travelCost.toUpperCase()} · Variance: {selectedTournament.variance.toUpperCase()}</p>
          </>
        ) : null}
        {selectedTournament?.eventDate ? (
          <p className="mt-1 text-xs text-chalk-300">Event date: {selectedTournament.eventDate}</p>
        ) : null}
        {selectedTournamentEmbedUrl ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-felt-600 bg-felt-800/60">
            <iframe
              title={`Map for ${selectedTournament?.name ?? 'selected tournament'}`}
              src={selectedTournamentEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-48 w-full border-0"
            />
          </div>
        ) : null}
        {selectedTournamentMapUrl ? (
          <a href={selectedTournamentMapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-cue-300 underline underline-offset-2">
            Open venue map
          </a>
        ) : null}
        {selectedTournament?.registrationUrl ? (
          <a href={selectedTournament.registrationUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-cue-300 underline underline-offset-2">
            Open registration link
          </a>
        ) : null}

        <div className="mt-3 space-y-1 text-xs text-chalk-300">
          {tournamentFinder.alternatives.slice(0, 2).map((alternative, index) => (
            <p key={alternative.id}>Alternative {index + 1}: {alternative.name} ({alternative.score})</p>
          ))}
        </div>

        <Button className="mt-3 w-full" variant="secondary" onClick={applyFinderTemplate}>
          Apply Recommended Template
        </Button>
      </Card>

      <Card className="mb-4" title="Opponent Prep Cards">
        <select
          value={selectedCardId}
          onChange={(event) => setSelectedCardId(event.target.value)}
          className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        >
          {opponentPrepCards.map((card) => (
            <option key={card.id} value={card.id}>{card.name} · {card.archetype}</option>
          ))}
        </select>

        <input
          value={cardName}
          onChange={(event) => setCardName(event.target.value)}
          placeholder="Card name"
          className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <input
          value={cardArchetype}
          onChange={(event) => setCardArchetype(event.target.value)}
          placeholder="Opponent archetype"
          className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <textarea
          value={openingPatternsText}
          onChange={(event) => setOpeningPatternsText(event.target.value)}
          placeholder="Opening patterns (one per line)"
          className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />
        <textarea
          value={safetyPlansText}
          onChange={(event) => setSafetyPlansText(event.target.value)}
          placeholder="Safety plans (one per line)"
          className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />
        <textarea
          value={bailoutChoicesText}
          onChange={(event) => setBailoutChoicesText(event.target.value)}
          placeholder="Bailout choices (one per line)"
          className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />
        <textarea
          value={cardNotes}
          onChange={(event) => setCardNotes(event.target.value)}
          placeholder="Card notes"
          className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button onClick={saveOpponentPrepCard} disabled={!cardName.trim()}>
            Save Card Template
          </Button>
          <Button variant="secondary" onClick={createNewOpponentCard}>
            New Card
          </Button>
          <Button variant="secondary" onClick={attachCardToActivePrep} disabled={!activePrep || !selectedCard}>
            Attach To Active Plan
          </Button>
        </div>
      </Card>

      {sortedPreps.length ? (
        <Card className="mb-4" title="Tournament Plans">
          <div className="space-y-2">
            {sortedPreps.map((entry) => {
              const done = entry.checklistItems.filter((item) => item.completed).length;
              const pct = entry.checklistItems.length
                ? Math.round((done / entry.checklistItems.length) * 100)
                : 0;

              return (
                <div
                  key={entry.id}
                  className={`rounded-lg border p-3 text-sm ${
                    activePrep?.id === entry.id
                      ? 'border-cue-500 bg-felt-700/70'
                      : 'border-felt-600 bg-felt-800/60'
                  }`}
                >
                  <p className="text-ivory-100">{entry.tournamentName}</p>
                  <p className="text-chalk-300">{entry.date} · {entry.location} · {entry.format}</p>
                  <p className="text-chalk-300">Progress: {pct}%</p>
                  {entry.opponentPrepCardId && opponentCardMap[entry.opponentPrepCardId] ? (
                    <p className="text-chalk-300">Opponent card: {opponentCardMap[entry.opponentPrepCardId].name}</p>
                  ) : null}
                  <Button className="mt-2" variant="secondary" onClick={() => setActivePrepId(entry.id)}>
                    Open Plan
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {activePrep ? (
        <Card className="mb-4" title="Active Prep Timeline">
          <p className="text-sm text-chalk-300">{activePrep.tournamentName} · {activePrep.date} · {activePrep.location}</p>
          <p className="mb-2 text-sm text-ivory-200">Prep starts: {activePrep.prepStartDate} · Current step: {activePrep.currentStep}/{activePrep.checklistItems.length}</p>
          {activePrep.opponentPrepCardId && opponentCardMap[activePrep.opponentPrepCardId] ? (
            <div className="mb-3 rounded-lg border border-felt-600 bg-felt-800/60 p-2 text-xs text-chalk-300">
              <p className="text-ivory-100">Opponent Card: {opponentCardMap[activePrep.opponentPrepCardId].name}</p>
              <p>Archetype: {opponentCardMap[activePrep.opponentPrepCardId].archetype}</p>
              <p>Opening cue: {opponentCardMap[activePrep.opponentPrepCardId].openingPatterns[0] ?? 'Not set'}</p>
              <p>Safety cue: {opponentCardMap[activePrep.opponentPrepCardId].safetyPlans[0] ?? 'Not set'}</p>
            </div>
          ) : null}
          <div className="mb-3 h-3 rounded-full bg-felt-800">
            <div className="h-3 rounded-full bg-cue-500" style={{ width: `${completionPercent}%` }} />
          </div>

          <div className="space-y-2">
            {activePrep.checklistItems.map((item) => (
              <label key={item.id} className="flex min-h-11 items-center justify-between rounded-lg bg-felt-800 p-2 text-sm text-ivory-100">
                <span>D-{item.daysOut}: {item.label}</span>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleChecklist(item.id)}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
        </Card>
      ) : null}

      {activePrep && eventReached ? (
        <Card title="Post-Event Analysis">
          <select
            value={result}
            onChange={(event) => setResult(event.target.value)}
            className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
            <option value="Mixed">Mixed</option>
          </select>
          <textarea
            value={bestDecisions}
            onChange={(event) => setBestDecisions(event.target.value)}
            placeholder="Best decisions (one per line, up to 3)"
            className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
          />
          <textarea
            value={weakestDecisions}
            onChange={(event) => setWeakestDecisions(event.target.value)}
            placeholder="Weakest decisions (one per line, up to 3)"
            className="mb-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
          />
          <input
            value={primarySkillGap}
            onChange={(event) => setPrimarySkillGap(event.target.value)}
            placeholder="Primary skill gap"
            className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <select
            value={focusAreaId}
            onChange={(event) => setFocusAreaId(event.target.value)}
            className="mb-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          >
            <option value="">Select recovery KPI focus</option>
            {trackerKpis.map((kpi) => (
              <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes (saved to tournament prep and competition log)"
            className="mb-3 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
          />
          <Button className="w-full" onClick={savePostEventAnalysis}>Save Analysis + Update Competition Log</Button>
        </Card>
      ) : null}
    </PageWrapper>
  );
}
