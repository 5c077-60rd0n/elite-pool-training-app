# Migration Plan: Old PWA -> Tracker-First PWA

## Goal
Migrate existing persisted data (legacy stores) into the new tracker-aligned model without data loss.

## Scope
- Source stores:
  - `useProgressStore`
  - `useSessionStore`
  - `useProgramStore`
  - `useSettingsStore`
- Target store:
  - `useTrackerStore`

## Migration Stages

## 1) Pre-Migration Snapshot
- Export full JSON backup using Settings export.
- Include timestamp and app version in migration metadata.

## 2) Mapping Rules

### 2.1 Legacy Session Log -> `daily_session_log`
Map where available:
- `date` <- legacy `date`
- `week_number` <- legacy `week`
- `focus_area` <- legacy `focusArea`
- `length_minutes` <- legacy `totalDurationMinutes`
- `notes` <- legacy `sessionNotes`

Derive defaults if missing:
- `day_of_week` from date
- `drillroom_shotmaking_pct` from drill result aggregate (or `0`)
- `bullseye_proximity` from relevant drill result if present (or `0`)
- `bullseye_category` default `Mixed`
- `wpb_lesson` default `No`
- `wpb_module_name` default empty
- `ghost_drill_win_rate_pct` from drill result if present (or `0`)
- `line_up_shot_count` from drill result if present (or `0`)
- `safety_exchange_success_pct` from drill result if present (or `0`)

### 2.2 Legacy Fargo History -> `fargo_rating_log`
- For each historical point:
  - `date` <- point date
  - `event_tournament_name` <- `Imported Legacy Fargo History`
  - `new_fargo_rating` <- point rating
  - Set games/result fields to neutral placeholders.

### 2.3 Legacy KPI/Break/Tournament Data
- Keep legacy data in place for now (read-only fallback).
- Optionally map tournament entries into `competition_log`.

## 3) Recompute Derived Data
After importing `daily_session_log`:
- Rebuild `weekly_summary` per week.
- Recompute estimated Fargo model.
- Recompute milestone row statuses and phase statuses.

## 4) Validation Checklist
- At least one daily log row exists after migration.
- Weekly summary rows match week counts from daily logs.
- Fargo chart has non-empty line series.
- Milestone rows show deterministic status values.
- App builds and loads with no runtime errors.

## 5) Rollback Strategy
- Keep original persisted keys untouched until migration succeeds.
- Write migrated tracker state under `fargo-climb-tracker`.
- If migration fails validation, restore from exported JSON.

## Suggested Implementation Task List
1. Add `migrationVersion` to tracker state.
2. Add one-time migration runner in app bootstrap.
3. Add migration report in Settings (counts imported per entity).
4. Add an explicit `Re-run Migration` button for local troubleshooting.
