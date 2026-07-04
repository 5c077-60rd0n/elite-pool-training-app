import type { OpponentPrepCard } from '../types/tracker';

export const opponentPrepCardSeed: OpponentPrepCard[] = [
  {
    id: 'opp-aggressive-breaker',
    name: 'Aggressive Breaker Plan',
    archetype: 'Aggressive breaker',
    openingPatterns: [
      'Choose controlled opening rack with cue-ball center-table emphasis.',
      'Favor first safe window when layout is low-percentage.',
    ],
    safetyPlans: [
      'Use distance + blocker safety early to force first kick error.',
      'Prioritize containing safety over low-odds two-way shots.',
    ],
    bailoutChoices: [
      'Reset to long-safe when pattern line is crowded.',
      'Take intentional containing safety instead of hero bank.',
    ],
    notes: 'Keep pace calm after their high-energy starts.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'opp-safety-grinder',
    name: 'Safety Grinder Counter',
    archetype: 'Safety grinder',
    openingPatterns: [
      'Start with simple 2-3 ball pattern and avoid low value attacks.',
      'Pre-plan two-rail escape lanes before key transition shots.',
    ],
    safetyPlans: [
      'Use thin-hit lockup safety to avoid return banks.',
      'Force kick from head rail to reduce return quality.',
    ],
    bailoutChoices: [
      'Bank only when cue-ball control has full-table margin.',
      'Choose rail-first containing shot if object ball is tied up.',
    ],
    notes: 'Patience wins; avoid giving free offensive starts.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'opp-counter-puncher',
    name: 'Counter-Puncher Denial',
    archetype: 'Counter-puncher',
    openingPatterns: [
      'Use first opportunity to simplify rack and remove clusters early.',
      'Favor patterns that deny easy return shots.',
    ],
    safetyPlans: [
      'Keep cue-ball off side rails to reduce kick-and-stick replies.',
      'Trade one-for-one safeties only with strong blocker available.',
    ],
    bailoutChoices: [
      'Take percentage cut with cue-ball to end rail over thin combo.',
      'Leave length rather than side-pocket scratch risk.',
    ],
    notes: 'Do not feed rhythm; reset tempo after misses.',
    updatedAt: new Date().toISOString(),
  },
];
