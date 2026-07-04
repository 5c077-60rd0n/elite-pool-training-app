# React Component Map

## Route-Level Screens
- `/` -> `Dashboard`
- `/session/today` -> `TodaySession`
- `/drills` -> `DrillLibrary`
- `/drills/:drillId` -> `DrillDetail`
- `/schedule` -> `WeeklySchedule`
- `/progress` -> `Progress`
- `/kpi` -> `KPITracker`
- `/phases` -> `PhaseOverview`
- `/milestones` -> `MilestoneLog`
- `/mental` -> `MentalGame`
- `/tournament` -> `TournamentPrep`
- `/settings` -> `Settings`
- `/more` -> `More`

## Tracker-Centric Screen Ownership
- `TodaySession`
  - Owns Daily Session Log entry creation
  - Captures Ghost/Line-Up/Safety/WPB/Bullseye fields
- `Dashboard`
  - Reads workbook dashboard metrics
  - Renders official Fargo line chart and weekly ghost trend chart
- `Progress`
  - Manages Weekly Summary table
  - Manages Official Fargo Rating log entry + table
  - Shows Bullseye Category tracker
- `PhaseOverview`
  - Shows current phase + phase status rollup
- `MilestoneLog`
  - Shows milestone tracker rows (target/current/status)
- `WeeklySchedule`
  - Shows 7-day schedule with focus/app/length/key drills

## Shared UI Components
- Layout: `Header`, `BottomNav`, `PageWrapper`
- UI primitives: `Card`, `Button`
- PWA UX: `PwaExperience`

## Store Dependencies
- `useTrackerStore`: primary source for tracker parity features
- `useSettingsStore`: profile + baseline rating
- Legacy stores retained for compatibility where not yet migrated
