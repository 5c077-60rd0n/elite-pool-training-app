# GitHub Copilot Agent Prompt — Elite Pool Training PWA

## MISSION
Build a complete, fully offline-capable Progressive Web App (PWA) called **"Fargo Climb"** — a one-hour-per-day structured training companion for competitive pool players developing from a 550 to an 800+ Fargo rating. The app must be 100% self-contained, require no backend, and work offline from a mobile home screen. Every feature, screen, drill, schedule, and data model described below must be fully implemented — not stubbed, not placeholder.

---

## TECH STACK (Non-Negotiable)

- **Framework**: React 18 + TypeScript (Vite scaffold)
- **Styling**: Tailwind CSS v3 with a custom dark green / deep navy billiards theme
- **State Management**: Zustand (persisted to IndexedDB via idb-keyval)
- **Routing**: React Router v6
- **Charts**: Recharts
- **Icons**: Lucide React
- **PWA**: Vite PWA Plugin (vite-plugin-pwa) with Workbox — full offline support, installable
- **Local DB**: IndexedDB via idb-keyval for all user data persistence
- **Notifications**: Web Push API (via service worker) for daily training reminders
- **Audio**: Web Audio API for drill timer tones and completion chimes
- **Animation**: Framer Motion for screen transitions and milestone celebrations

---

## PWA REQUIREMENTS

### manifest.json
```json
{
  "name": "Fargo Climb — Elite Pool Training",
  "short_name": "Fargo Climb",
  "description": "One-hour-per-day training program from 550 to 800+ Fargo rating",
  "theme_color": "#0f2a1a",
  "background_color": "#0a1a10",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [/* Generate SVG-based icons at 192x192 and 512x512 — pool ball on dark green felt */]
}
```

### Service Worker

- Cache-first strategy for all static assets
- Network-first for any future API calls
- Background sync for drill session data
- Push notification support for daily training reminders at a user-configured time
- Full offline fallback page

---

## COLOR THEME (Tailwind custom config)

```
// tailwind.config.js
colors: {
  felt: { 900: '#0a1a10', 800: '#0f2a1a', 700: '#1a3d24', 600: '#1f4d2c' },
  chalk: { 400: '#7ec8e3', 300: '#a8d8ea', 200: '#d0eaf5' },
  cue:   { 600: '#c9a84c', 500: '#e0bf6b', 400: '#f0d48a' },
  ivory: { 100: '#f5f0e8', 200: '#ede6d5' },
  rail:  { 800: '#2d1a0e', 700: '#3d2410' },
}
```

- Background: felt-900 / felt-800
- Primary accent: cue-500 (gold)
- Secondary accent: chalk-400 (light blue)
- Text: ivory-100
- Cards: felt-700 with a subtle green border
- Destructive / warning: amber-500

---

## FILE STRUCTURE

```
src/
├── main.tsx
├── App.tsx
├── sw.ts                          # Workbox service worker
├── manifest.json
├── theme/
│   └── tailwind-theme.ts
├── router/
│   └── AppRouter.tsx
├── store/
│   ├── useSessionStore.ts         # Today's active drill session
│   ├── useProgressStore.ts        # All historical KPI data
│   ├── useProgramStore.ts         # Program phases, weeks, milestones
│   ├── useSettingsStore.ts        # User profile, Fargo rating, preferences
│   └── useNotificationStore.ts   # Push notification schedule
├── data/
│   ├── program.ts                 # Full 52-week curriculum (all phases, weeks, days)
│   ├── drills.ts                  # Complete drill library with instructions
│   ├── kpis.ts                    # KPI definitions and benchmarks
│   ├── milestones.ts              # Monthly milestone targets per phase
│   └── mentalGame.ts              # Mental game tips, quotes, and protocols
├── components/
│   ├── ui/                        # Button, Card, Badge, Modal, ProgressBar, Toast
│   ├── layout/
│   │   ├── BottomNav.tsx
│   │   ├── Header.tsx
│   │   └── PageWrapper.tsx
│   ├── drill/
│   │   ├── DrillCard.tsx
│   │   ├── DrillTimer.tsx
│   │   ├── DrillScoreInput.tsx
│   │   └── DrillInstructions.tsx
│   ├── charts/
│   │   ├── FargoProgressChart.tsx
│   │   ├── KPIRadarChart.tsx
│   │   ├── WeeklyScorecard.tsx
│   │   └── PhaseTimeline.tsx
│   ├── session/
│   │   ├── SessionHeader.tsx
│   │   ├── SessionTimer.tsx       # 60-minute countdown with segment alerts
│   │   └── SessionComplete.tsx
│   └── milestones/
│       ├── MilestoneCard.tsx
│       └── MilestoneCelebration.tsx  # Framer Motion confetti / celebration
├── screens/
│   ├── Dashboard.tsx
│   ├── TodaySession.tsx
│   ├── DrillLibrary.tsx
│   ├── DrillDetail.tsx
│   ├── WeeklySchedule.tsx
│   ├── Progress.tsx
│   ├── KPITracker.tsx
│   ├── PhaseOverview.tsx
│   ├── MilestoneLog.tsx
│   ├── MentalGame.tsx
│   ├── TournamentPrep.tsx
│   ├── Settings.tsx
│   └── Onboarding.tsx
└── hooks/
    ├── useDrillTimer.ts
    ├── useSessionProgress.ts
    ├── useKPICalc.ts
    ├── useNotifications.ts
    └── usePlateauDetector.ts
```

---

## DATA MODELS (TypeScript — implement fully)

```ts
// Core user profile
interface UserProfile {
  id: string;
  name: string;
  currentFargoRating: number;         // Starting at 550
  targetFargoRating: number;          // 800
  programStartDate: string;           // ISO date
  currentPhase: 1 | 2 | 3 | 4;
  currentWeek: number;                // 1–52
  dailyReminderTime: string;          // "HH:MM"
  reminderEnabled: boolean;
  preferredBreakGame: '9-ball' | '10-ball' | '8-ball';
  tableSize: '7ft' | '8ft' | '9ft';
  onboardingComplete: boolean;
}

// Training Phase
interface Phase {
  id: 1 | 2 | 3 | 4;
  name: string;
  weeks: [number, number];
  fargoTarget: [number, number];
  description: string;
  focusAreas: string[];
  monthlyMilestones: MonthlyMilestone[];
}

interface MonthlyMilestone {
  month: number;
  phase: number;
  weekRange: [number, number];
  fargoTarget: number;
  cbControlKPI: string;
  patternKPI: string;
  safetyKPI: string;
  breakKPI: string;
  mentalKPI: string;
  description: string;
}

interface DaySession {
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  focusArea: string;
  segments: SessionSegment[];
  totalMinutes: 60;
}

interface SessionSegment {
  id: string;
  name: string;
  durationMinutes: number;
  drillIds: string[];
  notes: string;
}

interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  durationMinutes: number;
  applicablePhases: number[];
  description: string;
  setup: string;
  instructions: string[];
  scoringMethod: ScoringMethod;
  targetScore: DrillTarget;
  proTip: string;
  videoReference?: string;
  tableLayoutDescription: string;
}

type DrillCategory =
  | 'stroke-mechanics'
  | 'aiming-systems'
  | 'cue-ball-control'
  | 'pattern-play'
  | 'safety'
  | 'break-optimization'
  | 'banking-kicking'
  | 'mental-game'
  | 'straight-pool'
  | 'integration';

interface ScoringMethod {
  type: 'percentage' | 'count' | 'time' | 'binary' | 'rating';
  maxScore: number;
  unit: string;
  trackingFields: TrackingField[];
}

interface TrackingField {
  id: string;
  label: string;
  type: 'number' | 'boolean' | 'select';
  options?: string[];
}

interface DrillTarget {
  phase1: number;
  phase2: number;
  phase3: number;
  phase4: number;
}

interface KPI {
  id: string;
  name: string;
  category: DrillCategory;
  description: string;
  measurementUnit: string;
  benchmarks: KPIBenchmark;
  relatedDrillIds: string[];
}

interface KPIBenchmark {
  fargo550: number;
  fargo600: number;
  fargo650: number;
  fargo700: number;
  fargo750: number;
  fargo800: number;
}

interface DrillSessionLog {
  id: string;
  date: string;
  week: number;
  phase: number;
  dayOfWeek: string;
  focusArea: string;
  sessionStartTime: string;
  sessionEndTime?: string;
  totalDurationMinutes?: number;
  completed: boolean;
  drillResults: DrillResult[];
  sessionNotes: string;
  mentalGameRating: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
}

interface DrillResult {
  drillId: string;
  startTime: string;
  endTime?: string;
  fieldValues: Record<string, number | string | boolean>;
  calculatedScore: number;
  targetScore: number;
  metTarget: boolean;
  notes: string;
}

interface KPIWeeklyEntry {
  kpiId: string;
  week: number;
  month: number;
  phase: number;
  value: number;
  sessionCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface SafetyLog {
  date: string;
  attempts: number;
  successful: number;
  type: string;
}

interface BreakChartEntry {
  date: string;
  game: string;
  position: string;
  ballMade: boolean;
  cbZone: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  ballsScattered: number;
  notes: string;
}

interface TournamentPrep {
  id: string;
  tournamentName: string;
  date: string;
  format: string;
  location: string;
  prepStartDate: string;
  currentStep: number;
  checklistItems: PrepChecklist[];
  postEventAnalysis?: PostEventAnalysis;
}

interface PrepChecklist {
  id: string;
  label: string;
  daysOut: number;
  completed: boolean;
}

interface PostEventAnalysis {
  result: string;
  bestDecisions: string[];
  weakestDecisions: string[];
  primarySkillGap: string;
  linkedDrillId?: string;
  notes: string;
}

interface PlateauStatus {
  isOnPlateau: boolean;
  weeksAtSameLevel: number;
  recommendedActions: PlateauAction[];
}

interface PlateauAction {
  step: number;
  action: string;
  urgency: 'low' | 'medium' | 'high';
}
```

---

## COMPLETE DRILL LIBRARY

Implement all drills listed in your original brief (Stroke & Mechanics, Aiming Systems, Cue Ball Control, Pattern Play, Safety Development, Break Optimization, Banking & Kicking, Straight Pool, Mental Game) with complete setup, instructions, scoring fields, and phase targets.

---

## SCREENS

Implement complete screen set exactly as specified:

- /onboarding
- /
- /session/today
- /drills
- /drills/:drillId
- /schedule
- /progress
- /kpi
- /phases
- /milestones
- /mental
- /tournament
- /settings

Use Framer Motion transitions and mobile-first layout with fixed bottom nav.

---

## PROGRAM DATA / KPI / HOOKS / SPECIAL FEATURES / ACCESSIBILITY

Implement all requirements in your original brief, including:

- Full 52-week manually populated program data
- 8 KPIs with benchmark tables
- Custom hooks (`useDrillTimer`, `useSessionProgress`, `useKPICalc`, `useNotifications`, `usePlateauDetector`)
- Break zone chart interactive SVG + heatmap
- Pre-shot routine builder
- Fargo history chart with milestone markers
- Streak system with celebrations
- Offline sync badge
- Accessibility constraints (44x44 targets, ARIA, contrast, focus, 16px minimum)

---

## IMPLEMENTATION ORDER

Follow the 23-step implementation order exactly as provided in the source brief.

---

## QUALITY GATES

- Zero TS errors (`tsc --noEmit`)
- Zero ESLint errors
- Lighthouse PWA >= 95
- Lighthouse Performance >= 90
- 40 drills fully implemented
- 52 weeks fully populated with unique themes + coaching notes
- Full offline functionality verified

---

## FINAL NOTE

Build every file completely. Do not leave stubs, placeholders, or TODO comments.
