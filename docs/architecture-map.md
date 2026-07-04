# Elite Pool PWA Architecture Map

## Source of Truth
- Word plan: `Pro Pool Training Plan — 550 to 800+ Fargo.docx`
- Tracker workbook: `Pro Pool Training Tracker — 550 to 800+ Fargo.xlsx`
- Workbook sheets mapped 1:1:
  - Dashboard
  - Daily Session Log
  - Weekly Summary
  - Fargo Rating Log
  - Bullseye Category Tracker
  - Milestone Tracker
  - Mechanics Audit
  - Drill Reference Card

## Application Layers

### 1) UI Layer (React + TS)
- Daily session flow: `src/screens/TodaySession.tsx`
- Weekly schedule: `src/screens/WeeklySchedule.tsx`
- Dashboard (ratings + chart parity): `src/screens/Dashboard.tsx`
- Progress tracking tables: `src/screens/Progress.tsx`
- Phase + milestones: `src/screens/PhaseOverview.tsx`, `src/screens/MilestoneLog.tsx`
- Settings/backup: `src/screens/Settings.tsx`

### 2) Domain/Data Layer
- Core tracker models: `src/types/tracker.ts`
- Plan/schedule/drill reference seeds: `src/data/trackerPlan.ts`
- Calculations and progression logic: `src/utils/trackerCalculations.ts`

### 3) Persistence Layer (Offline-first)
- IndexedDB adapter: `src/store/idbStorage.ts`
- Tracker state store: `src/store/useTrackerStore.ts`
- Other app stores remain available for legacy paths.

### 4) PWA/Runtime Layer
- Service worker notifications: `src/sw.ts`
- Build-time PWA packaging via Vite plugin (existing setup)
- Sync queue strategy:
  - All saved logs are queued in `syncState.pendingLogIds`
  - Flush on demand or when browser returns online

## Data Flow
1. User runs session in Daily Session Flow.
2. Session row is persisted to Daily Session Log model in tracker store.
3. Weekly Summary is recomputed for affected week(s).
4. Estimated Fargo model recomputes from official log + training metrics.
5. Milestone rows and phase statuses are re-evaluated.
6. Dashboard and Progress views update from the same source store.

## Training Engine Coverage
- 7-day schedule: implemented from Word+Workbook overview.
- Daily templates: schedule cards use exact focus/app/length/key-drill structure.
- Drill execution modules included in flow:
  - Ghost Drill race-to-10 simulator
  - Line-Up shot counter
  - Safety exchange tracker
  - Bullseye proximity/category logging
  - WPB lesson and module logging
- Mechanics audit:
  - Checklist + weekly audit model scaffolded in tracker store.
- Phase advancement:
  - Phase 1..5 thresholds 600/650/700/750/800+
  - Milestone rows reflected from workbook structure.

## Chart Parity Notes
Workbook chart references mirrored:
- Official Fargo rating over time: line chart over Fargo log entries.
- Weekly Ghost Drill trend: bar chart over weekly summaries.

## Known Extension Points
- Add dedicated Mechanics Audit screen for editing checklist/audit rows.
- Add competition event log screen if tournament prep is separated.
- If workbook formulas are expanded, plug exact formulas into `trackerCalculations.ts`.
