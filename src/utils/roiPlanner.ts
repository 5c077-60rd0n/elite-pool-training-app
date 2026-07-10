import type { AdaptiveDailyPlan, CompetitionLogEntry, DailySessionLog } from '../types/tracker';

interface DrillOption {
  app: 'DrillRoom' | 'WPB' | 'Bullseye';
  category: string;
  name: string;
}

export interface RoiPrescriptionDrill {
  slot: 'weakness' | 'pressure' | 'tournament';
  app: 'DrillRoom' | 'WPB' | 'Bullseye';
  label: string;
  rationale: string;
}

export interface RoiTravelTemplate {
  id: 'road-30' | 'standard-60' | 'full-90';
  label: string;
  minutes: number;
  emphasis: string;
}

export interface RoiConversionMetrics {
  prescriptionAdherencePct: number;
  targetHitRatePct: number;
  improvementRatePct: number;
  matchTransferScore: number;
}

export interface RoiWeeklyAutoFocus {
  weakestTwo: string[];
  nextWeekRotation: string[];
}

export interface RoiTournamentMode {
  active: boolean;
  eventName?: string;
  daysOut?: number;
  phaseLabel: string;
  emphasis: string;
}

export interface RoiPlannerSnapshot {
  focusBucket: string;
  recommendedMinutes: number;
  dailyTriadFlow: {
    totalMinutes: number;
    blocks: Array<{
      app: 'DrillRoom' | 'Bullseye' | 'WPB';
      minutes: number;
      label: string;
      objective: string;
    }>;
    executionOrder: string[];
    expectedOutcome: string;
  };
  prescription: RoiPrescriptionDrill[];
  checklist: string[];
  travelTemplates: RoiTravelTemplate[];
  weeklyAutoFocus: RoiWeeklyAutoFocus;
  tournamentMode: RoiTournamentMode;
  conversion: RoiConversionMetrics;
  coachBrief: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseDrillRoomOption(raw: string): DrillOption | null {
  const [category, name] = raw.split('>').map((item) => item.trim());
  if (!category || !name) return null;
  return { app: 'DrillRoom', category, name };
}

function parseWpbOption(raw: string): DrillOption | null {
  const parts = raw.split('>').map((item) => item.trim());
  if (parts.length < 3) return null;
  return { app: 'WPB', category: `${parts[0]} / ${parts[1]}`, name: parts[2] };
}

function pickFirst(options: DrillOption[], predicate: (option: DrillOption) => boolean, fallback: DrillOption): DrillOption {
  return options.find(predicate) ?? fallback;
}

function deriveFocusBucket(plan: AdaptiveDailyPlan | null): string {
  return plan?.focusKpiName || 'Execution Consistency';
}

function selectWeaknessDrill(
  focusBucket: string,
  drillroom: DrillOption[],
  wpb: DrillOption[],
  bullseyeCategories: string[],
): DrillOption {
  const normalized = focusBucket.toLowerCase();

  // Map metrics to drill apps per specifications:
  // DrillRoom = Accuracy & Shotmaking (foundational potting consistency)
  // Bullseye = Position Play (cue ball control & landing zones)
  // WPB = Runouts & Multiple Shot Drills (decision-making & pattern play)

  if (normalized.includes('shotmaking')) {
    return pickFirst(drillroom, (option) => option.category.toLowerCase().includes('shotmaking'), 
      drillroom[0] ?? { app: 'DrillRoom', category: 'Shotmaking', name: 'Straight Shot Level II' }
    );
  }

  if (normalized.includes('proximity') || normalized.includes('bullseye')) {
    const category = bullseyeCategories.find((item) => item !== 'Mixed') ?? 'Follow';
    return { app: 'Bullseye', category, name: `${category} Hard Set` };
  }

  if (normalized.includes('safety')) {
    return pickFirst(wpb, (option) => option.category.toLowerCase().includes('defense'), 
      { app: 'WPB', category: 'Defense / Containing Safes', name: 'Consecutive Containing Safes' }
    );
  }

  if (normalized.includes('line-up') || normalized.includes('ghost')) {
    return pickFirst(wpb, (option) => option.category.toLowerCase().includes('position'), 
      { app: 'WPB', category: 'Position Play & Runouts / Progressive Rotation Runs', name: 'Progressive Rotation Runs' }
    );
  }

  // Default: route to WPB for multi-shot pattern work
  return pickFirst(wpb, (option) => option.category.toLowerCase().includes('position'),
    { app: 'WPB', category: 'Position Play & Runouts / Progressive Rotation Runs', name: 'Progressive Rotation Runs' }
  );
}

function selectPressureDrill(drillroom: DrillOption[], wpb: DrillOption[]): DrillOption {
  // Pressure work = challenges to shotmaking accuracy + safety execution
  // DrillRoom for speed/challenge components, WPB for defensive pressure
  return (
    drillroom.find((option) => option.category.toLowerCase().includes('challenge'))
    ?? wpb.find((option) => option.category.toLowerCase().includes('defense'))
    ?? wpb.find((option) => option.category.toLowerCase().includes('safety'))
    ?? { app: 'WPB', category: 'Defense / Containing Safes', name: 'Consecutive Containing Safes' }
  );
}

function selectTournamentDrill(daysOut: number | undefined, wpb: DrillOption[], drillroom: DrillOption[]): DrillOption {
  if (typeof daysOut === 'number' && daysOut <= 2) {
    // D-2 to D-1: Focus on accuracy/shotmaking consistency (DrillRoom)
    return (
      drillroom.find((option) => option.category.toLowerCase().includes('speed'))
      ?? drillroom.find((option) => option.category.toLowerCase().includes('shotmaking'))
      ?? { app: 'DrillRoom', category: 'Speed Control', name: 'LAG SHOT' }
    );
  }

  // Default tournament prep: Runouts and multi-shot pattern play (WPB)
  return (
    wpb.find((option) => option.category.toLowerCase().includes('position'))
    ?? wpb.find((option) => option.category.toLowerCase().includes('runout'))
    ?? { app: 'WPB', category: 'Position Play & Runouts / Progressive Rotation Runs', name: 'Progressive Rotation Runs' }
  );
}

function allocateTriadMinutes(total: number): { drillroom: number; bullseye: number; wpb: number } {
  const clamped = clamp(total, 30, 120);
  const drillroom = Math.max(12, Math.round(clamped * 0.45));
  const bullseye = Math.max(10, Math.round(clamped * 0.3));
  const wpb = Math.max(8, clamped - drillroom - bullseye);
  return { drillroom, bullseye, wpb };
}

function getUpcomingEvent(competitionLog: CompetitionLogEntry[], nowMs: number): { name: string; daysOut: number } | undefined {
  const upcoming = competitionLog
    .map((entry) => ({
      name: entry.eventName,
      daysOut: Math.round((Date.parse(entry.date) - nowMs) / 86_400_000),
    }))
    .filter((entry) => Number.isFinite(entry.daysOut) && entry.daysOut >= 0)
    .sort((a, b) => a.daysOut - b.daysOut)[0];

  return upcoming;
}

function tournamentMode(upcoming: { name: string; daysOut: number } | undefined): RoiTournamentMode {
  if (!upcoming) {
    return {
      active: false,
      phaseLabel: 'No event booked',
      emphasis: 'Run balanced development blocks and schedule your next competition date.',
    };
  }

  const { daysOut } = upcoming;
  if (daysOut >= 8 && daysOut <= 14) {
    return {
      active: true,
      eventName: upcoming.name,
      daysOut,
      phaseLabel: 'D-14 to D-8 Reliability Build',
      emphasis: 'Prioritize repeatability and clean fundamentals under moderate volume.',
    };
  }
  if (daysOut >= 3 && daysOut <= 7) {
    return {
      active: true,
      eventName: upcoming.name,
      daysOut,
      phaseLabel: 'D-7 to D-3 Pressure Transfer',
      emphasis: 'Shift to pressure sets, safety exchanges, and decision-speed drills.',
    };
  }
  if (daysOut <= 2) {
    return {
      active: true,
      eventName: upcoming.name,
      daysOut,
      phaseLabel: 'D-2 to D-1 Confidence Preservation',
      emphasis: 'Keep volume lower, protect confidence, and avoid introducing new mechanics.',
    };
  }

  return {
    active: true,
    eventName: upcoming.name,
    daysOut,
    phaseLabel: 'General Build Window',
    emphasis: 'Blend development and match-transfer work with one pressure block each session.',
  };
}

function computeWeakestTwo(logs: DailySessionLog[], plan: AdaptiveDailyPlan | null): string[] {
  const recent = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 7);
  if (!recent.length || !plan) return [deriveFocusBucket(plan), 'Safety Exchange Success'];

  const targets = plan.targetMetrics;
  const deficits = [
    {
      name: 'DrillRoom Shotmaking',
      value: avg(recent.map((item) => item.drillRoomShotmakingPct)),
      target: targets.drillRoomShotmakingPct,
      lowerIsBetter: false,
    },
    {
      name: 'Safety Exchange Success',
      value: avg(recent.map((item) => item.safetyExchangeSuccessPct)),
      target: targets.safetyExchangeSuccessPct,
      lowerIsBetter: false,
    },
    {
      name: 'Line-Up Efficiency',
      value: avg(recent.map((item) => item.lineUpShotCount)),
      target: targets.lineUpShotCount,
      lowerIsBetter: false,
    },
    {
      name: 'Bullseye Proximity',
      value: avg(recent.map((item) => item.bullseyeProximity)),
      target: targets.bullseyeProximity,
      lowerIsBetter: true,
    },
  ].map((item) => {
    const deficit = item.lowerIsBetter ? item.value - item.target : item.target - item.value;
    return { ...item, deficit };
  });

  return deficits
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 2)
    .map((item) => item.name);
}

function computeConversionMetrics(logs: DailySessionLog[], competitionLog: CompetitionLogEntry[]): RoiConversionMetrics {
  const recent = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 14);
  if (!recent.length) {
    return {
      prescriptionAdherencePct: 0,
      targetHitRatePct: 0,
      improvementRatePct: 0,
      matchTransferScore: 0,
    };
  }

  const adherence = recent.filter(
    (item) =>
      Boolean(item.drillRoomDrillName)
      && item.wpbLesson === 'Yes'
      && Boolean(item.wpbModuleName)
      && item.bullseyeProximity > 0,
  ).length / recent.length;
  const targetHits = recent.filter((item) => item.drillRoomShotmakingPct >= 75 || item.safetyExchangeSuccessPct >= 60).length / recent.length;

  const split = Math.max(1, Math.floor(recent.length / 2));
  const newer = recent.slice(0, split);
  const older = recent.slice(split);
  const newerScore = avg(newer.map((item) => item.drillRoomShotmakingPct + item.safetyExchangeSuccessPct));
  const olderScore = avg(older.map((item) => item.drillRoomShotmakingPct + item.safetyExchangeSuccessPct));
  const improvementRatePct = clamp(Math.round(((newerScore - olderScore) / Math.max(1, olderScore)) * 100), -30, 40);

  const recentEvents = [...competitionLog].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 8);
  const wins = recentEvents.filter((entry) => entry.result.toLowerCase().includes('win')).length;
  const winRate = recentEvents.length ? wins / recentEvents.length : 0.5;
  const transfer = clamp(Math.round((targetHits * 40) + (Math.max(0, improvementRatePct) * 0.8) + (winRate * 35)), 0, 100);

  return {
    prescriptionAdherencePct: Math.round(adherence * 100),
    targetHitRatePct: Math.round(targetHits * 100),
    improvementRatePct,
    matchTransferScore: transfer,
  };
}

export function buildRoiPlannerSnapshot(args: {
  logs: DailySessionLog[];
  adaptiveDailyPlan: AdaptiveDailyPlan | null;
  competitionLog: CompetitionLogEntry[];
  drillRoomSuggestions: string[];
  wpbSuggestions: string[];
  bullseyeCategories: string[];
  now?: Date;
}): RoiPlannerSnapshot {
  const now = args.now ?? new Date();
  const nowMs = now.getTime();
  const focusBucket = deriveFocusBucket(args.adaptiveDailyPlan);

  const drillroom = args.drillRoomSuggestions
    .map(parseDrillRoomOption)
    .filter((item): item is DrillOption => Boolean(item));
  const wpb = args.wpbSuggestions
    .map(parseWpbOption)
    .filter((item): item is DrillOption => Boolean(item));

  const upcoming = getUpcomingEvent(args.competitionLog, nowMs);
  const tourney = tournamentMode(upcoming);
  const weakness = selectWeaknessDrill(focusBucket, drillroom, wpb, args.bullseyeCategories);
  const pressure = selectPressureDrill(drillroom, wpb);
  const tournament = selectTournamentDrill(upcoming?.daysOut, wpb, drillroom);

  const recommendedMinutes = clamp(args.adaptiveDailyPlan?.recommendedMinutes ?? 75, 30, 95);
  const triadMinutes = allocateTriadMinutes(recommendedMinutes);
  const bullseyeCategory = args.bullseyeCategories.find((item) => item !== 'Mixed') ?? 'Follow';
  const drillroomAnchor = weakness.app === 'DrillRoom'
    ? weakness
    : (drillroom.find((option) => option.category.toLowerCase().includes('shotmaking'))
      ?? { app: 'DrillRoom', category: 'Shotmaking', name: 'Straight Shot Level II' });
  const wpbAnchor = weakness.app === 'WPB'
    ? weakness
    : (wpb.find((option) => option.category.toLowerCase().includes('aiming') || option.category.toLowerCase().includes('position'))
      ?? { app: 'WPB', category: 'Aiming & Shot Making / Aim Training', name: 'Aim Training - Level II' });
  const weeklyWeakest = computeWeakestTwo(args.logs, args.adaptiveDailyPlan);
  const weeklyRotation = [
    `${weeklyWeakest[0]} precision day`,
    `${weeklyWeakest[1]} pressure day`,
    'Pattern transfer and runout day',
    'Safety and kick response day',
    'Match simulation day',
    `${weeklyWeakest[0]} reload day`,
    'Low-load review and mental protocol day',
  ];

  const conversion = computeConversionMetrics(args.logs, args.competitionLog);

  return {
    focusBucket,
    recommendedMinutes,
    dailyTriadFlow: {
      totalMinutes: recommendedMinutes,
      blocks: [
        {
          app: 'DrillRoom',
          minutes: triadMinutes.drillroom,
          label: `${drillroomAnchor.category} > ${drillroomAnchor.name}`,
          objective: 'Technical consistency and table-speed calibration.',
        },
        {
          app: 'Bullseye',
          minutes: triadMinutes.bullseye,
          label: `${bullseyeCategory} > ${bullseyeCategory} Hard Set`,
          objective: 'Cue-ball precision and pattern landing-zone control.',
        },
        {
          app: 'WPB',
          minutes: triadMinutes.wpb,
          label: `${wpbAnchor.category} > ${wpbAnchor.name}`,
          objective: 'Decision transfer and competitive pattern clarity.',
        },
      ],
      executionOrder: [
        'Block 1: DrillRoom anchor work',
        'Block 2: Bullseye precision block',
        'Block 3: WPB transfer block',
        '2-minute closeout: log key lesson and next cue.',
      ],
      expectedOutcome: 'One complete technical + precision + transfer cycle each day, with no app left unused.',
    },
    prescription: [
      {
        slot: 'weakness',
        app: weakness.app,
        label: `${weakness.category} > ${weakness.name}`,
        rationale: `Directly addresses weakest KPI bucket: ${focusBucket}.`,
      },
      {
        slot: 'pressure',
        app: pressure.app,
        label: `${pressure.category} > ${pressure.name}`,
        rationale: 'Transfers skill into pressure and decision-quality scenarios.',
      },
      {
        slot: 'tournament',
        app: tournament.app,
        label: `${tournament.category} > ${tournament.name}`,
        rationale: upcoming ? `Aligned with ${upcoming.name} in ${upcoming.daysOut} days.` : 'Keeps match-readiness progressing without event lock.',
      },
    ],
    checklist: [
      'Run each prescribed drill before any optional work.',
      'Log result quality immediately after each drill block.',
      'Record one tactical lesson to carry into next session.',
    ],
    travelTemplates: [
      { id: 'road-30', label: 'Road 30', minutes: 30, emphasis: 'One weakness drill + one pressure set.' },
      { id: 'standard-60', label: 'Standard 60', minutes: 60, emphasis: 'Weakness + pressure + transfer in equal blocks.' },
      { id: 'full-90', label: 'Full 90', minutes: 90, emphasis: 'Full progression with tournament transfer close-out.' },
    ],
    weeklyAutoFocus: {
      weakestTwo: weeklyWeakest,
      nextWeekRotation: weeklyRotation,
    },
    tournamentMode: tourney,
    conversion,
    coachBrief: [
      `Primary focus this week: ${weeklyWeakest.join(' and ')}.`,
      `Prescription adherence: ${conversion.prescriptionAdherencePct}% and target hit rate: ${conversion.targetHitRatePct}%.`,
      `Match transfer score: ${conversion.matchTransferScore}/100; keep pressure block non-negotiable.`,
      tourney.active
        ? `Tournament phase: ${tourney.phaseLabel}. ${tourney.emphasis}`
        : 'No event on deck: schedule one and maintain balanced progression.',
    ],
  };
}
