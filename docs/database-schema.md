# Database Schema (IndexedDB Logical Model)

This project currently persists in IndexedDB through Zustand persisted JSON state.
The schema below is the logical relational model mirrored by `src/types/tracker.ts`.

## Tables

## `daily_session_log`
- `id` TEXT PK
- `date` DATE NOT NULL
- `day_of_week` TEXT NOT NULL
- `week_number` INTEGER NOT NULL
- `focus_area` TEXT NOT NULL
- `length_minutes` INTEGER NOT NULL
- `drillroom_shotmaking_pct` REAL NOT NULL
- `bullseye_proximity` REAL NOT NULL
- `bullseye_category` TEXT NOT NULL
- `wpb_lesson` TEXT NOT NULL CHECK (`Yes`/`No`)
- `wpb_module_name` TEXT
- `ghost_drill_win_rate_pct` REAL NOT NULL
- `line_up_shot_count` INTEGER NOT NULL
- `safety_exchange_success_pct` REAL NOT NULL
- `notes` TEXT
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL
- `synced_at` DATETIME NULL

Indexes:
- idx_daily_session_date (`date`)
- idx_daily_session_week (`week_number`)

## `weekly_summary`
- `id` TEXT PK
- `week_number` INTEGER UNIQUE NOT NULL
- `start_date` DATE NOT NULL
- `end_date` DATE NOT NULL
- `sessions_completed` INTEGER NOT NULL
- `total_training_minutes` INTEGER NOT NULL
- `avg_drillroom_shotmaking_pct` REAL NOT NULL
- `avg_bullseye_proximity_score` REAL NOT NULL
- `ghost_drill_best_win_rate_pct` REAL NOT NULL
- `wpb_lessons_completed` INTEGER NOT NULL
- `line_up_best_score` INTEGER NOT NULL
- `rolling_4_week_avg_drillroom_pct` REAL NOT NULL
- `rolling_4_week_avg_ghost_drill_pct` REAL NOT NULL
- `notes_adjustments` TEXT
- `generated_at` DATETIME NOT NULL

## `fargo_rating_log`
- `id` TEXT PK
- `date` DATE NOT NULL
- `event_tournament_name` TEXT NOT NULL
- `opponent_fargo_rating` REAL NULL
- `match_result` TEXT NOT NULL CHECK (`Win`/`Loss`)
- `games_won` INTEGER NOT NULL
- `games_lost` INTEGER NOT NULL
- `new_fargo_rating` REAL NOT NULL
- `rating_change` REAL NULL
- `notes` TEXT

Indexes:
- idx_fargo_date (`date`)

## `bullseye_category_tracker`
- `id` TEXT PK
- `category` TEXT UNIQUE NOT NULL
- `current_proficiency_level` TEXT NOT NULL
- `last_tested_date` DATE NULL
- `best_proximity_score` REAL NULL
- `sessions_practiced` INTEGER NOT NULL
- `target_by_phase` TEXT NOT NULL
- `achievement_unlocked` TEXT NOT NULL CHECK (`Yes`/`No`)

## `milestone_tracker_row`
- `id` TEXT PK
- `phase` INTEGER NOT NULL
- `phase_label` TEXT NOT NULL
- `fargo_range` TEXT NOT NULL
- `timeline` TEXT NOT NULL
- `milestone_test_description` TEXT NOT NULL
- `target_metric` TEXT NOT NULL
- `current_best` TEXT NOT NULL
- `status` TEXT NOT NULL CHECK (`Met`/`Not Met`)

Indexes:
- idx_milestone_phase (`phase`)

## `milestone_phase_status`
- `phase` INTEGER PK
- `label` TEXT NOT NULL
- `target_weeks` TEXT NOT NULL
- `phase_status` TEXT NOT NULL CHECK (`Not Started`/`In Progress`/`Met`)

## `mechanics_checklist`
- `id` TEXT PK
- `checkpoint_item` TEXT NOT NULL
- `what_to_verify` TEXT NOT NULL
- `tool_to_use` TEXT NOT NULL
- `frequency` TEXT NOT NULL
- `last_checked_date` DATE NULL
- `status` TEXT NOT NULL CHECK (`Not Checked`/`Pass`/`Needs Work`)
- `notes` TEXT

## `mechanics_weekly_audit_log`
- `id` TEXT PK
- `week_number` INTEGER NOT NULL
- `date` DATE NOT NULL
- `items_passed` INTEGER NOT NULL
- `items_failed` INTEGER NOT NULL
- `key_finding` TEXT NOT NULL
- `action_item` TEXT NOT NULL
- `sign_off` TEXT

## `competition_log`
- `id` TEXT PK
- `date` DATE NOT NULL
- `event_name` TEXT NOT NULL
- `format` TEXT NOT NULL
- `result` TEXT NOT NULL
- `notes` TEXT

## `sync_state`
- `id` TEXT PK (single row)
- `pending_log_ids_json` TEXT NOT NULL
- `last_sync_at` DATETIME NULL

## If Migrating to SQLite WASM
Use this logical schema directly as SQL DDL.
Primary differences from IndexedDB mode:
- add FK constraints where needed
- use transaction bundles for session-save + weekly recompute
- perform sync queue updates in one transaction
