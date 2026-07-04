# Source Mapping (Word + Excel -> Code)

## Workbook Sheet to Store/Screen Mapping
- `Dashboard` -> `Dashboard` screen + tracker calculations
- `Daily Session Log` -> `DailySessionLog` interface + `TodaySession` save flow
- `Weekly Summary` -> `WeeklySummary` interface + summary recomputation
- `Fargo Rating Log` -> `FargoRatingLogEntry` + Fargo entry form in `Progress`
- `Bullseye Category Tracker` -> `BullseyeCategoryTrackerEntry` + `Progress`
- `Milestone Tracker` -> `MilestoneTrackerRow` + `MilestoneLog`
- `Mechanics Audit` -> `MechanicsChecklistItem` + `MechanicsWeeklyAuditLog`
- `Drill Reference Card` -> `trackerDrills` in `trackerPlan.ts`

## Word Plan to Schedule Mapping
- Weekly schedule table -> `weeklyScheduleTemplate`
- Day-by-day sections -> `TodaySession` execution modules and labels
- Operational rule "Every session must produce a log entry. No exceptions." -> `beforeunload` enforcement in `TodaySession`
- Phase progression (P1..P5 600/650/700/750/800+) -> `phaseTargets` + phase resolver + milestone status
- Tracking cadence + metrics table -> weekly recomputation and dashboard metrics
