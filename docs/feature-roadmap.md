# Elite Pool Training App - Full Feature Roadmap

This roadmap includes all requested features and sequences them into implementation waves to minimize risk and preserve app stability.

## Guiding Principles

- Keep tracker-first data architecture as the source of truth.
- Ship in vertical slices (data model + UI + validation) per feature.
- Avoid large cross-cutting rewrites in a single release.
- Keep offline-first behavior and sync integrity in each milestone.

## Release 1 - Adaptive Training Core

Goal: turn logging data into immediate daily decisions.

### Features

1. Adaptive Daily Plan
- Auto-generate next session plan based on weakest KPI, plateau state, and recent session quality.
- Show target values per field (Ghost %, DrillRoom %, Safety %, Line-Up score, WPB count).

2. Recovery Recommendation Engine
- Trigger 3-day recovery plan after weak sessions or poor competition outcomes.
- Connect recommendations to KPI focus and upcoming weekly schedule.

3. Smart Milestone Verification
- Add milestone test mode with explicit pass/fail criteria and evidence notes.
- Save attempts and trend over time.

4. Notification Intelligence
- Dynamic reminders for streak risk, near-complete quests, and missed KPI targets.

### Primary Surfaces

- Today Session
- Dashboard
- Milestone Log
- Notifications

### Data Additions

- adaptivePlan (per day)
- recoveryPlan (3-day blocks)
- milestoneAttemptLog
- notificationRules and lastTriggeredAt

### Acceptance Criteria

- Next-session plan appears automatically after log save.
- Weak-session recovery recommendations available within 1 tap.
- Milestone tests can be started, scored, and audited.
- Smart reminders only fire when conditions are met.

## Release 2 - Competition Performance Layer

Goal: close training-to-match gap with tactical preparation and simulation.

### Features

1. Match Simulator Mode
- Race-format simulations with innings, break outcomes, safety exchanges, and pressure markers.
- Separate score for match-readiness vs drill-readiness.

2. Opponent Prep Cards
- Match plan templates by opponent archetype.
- Recommended opening patterns, safety plans, and bailout choices.

3. Personal Records and Confidence Index
- Track KPI personal bests and compute confidence trend before events.
- Display confidence trend next to estimated Fargo and competition history.

### Primary Surfaces

- Tournament Prep
- Competition Log
- Dashboard

### Data Additions

- matchSimSessions
- opponentCards
- personalRecords
- confidenceIndexHistory

### Acceptance Criteria

- User can run a complete simulation and log outcomes.
- Opponent prep card can be attached to tournament entries.
- Confidence index updates automatically from recent data.

## Release 3 - Coaching and Engagement Expansion

Goal: improve accountability, feedback loops, and sustained motivation.

### Features

1. Coach Review Export
- Generate weekly share report (PDF-ready payload) with KPIs, trends, notes, and focus priorities.

2. Video Checkpoint Integration
- Attach short clip references to mechanics checklist items and milestone attempts.
- Compare before/after checkpoint snapshots.

3. Advanced Gamification Seasons
- Seasonal ladders, themed quest chains, and boss challenges tied to quality, not only volume.

### Primary Surfaces

- Settings (export)
- Mechanics Audit
- Milestone Log
- Dashboard (season panel)

### Data Additions

- coachExportHistory
- videoCheckpointLinks
- seasonMeta and challengeProgress

### Acceptance Criteria

- Weekly coach export generated from live tracker data.
- Mechanics and milestone entries accept linked clips.
- Seasonal progression and challenge completion persist and display correctly.

## Engineering Execution Order

1. Extend tracker types and store slices per release.
2. Add pure calculation utilities with tests/validation paths.
3. Wire screen UI with minimal migration bridges.
4. Add dashboard visibility and settings controls.
5. Validate build + offline persistence + backup/import compatibility.

## Backward Compatibility Rules

- Keep legacy import fields supported for progress/session payloads.
- New exports should version payload shape and include migration-safe defaults.
- Never remove existing persisted fields in-place; deprecate gradually.

## Suggested Build Sequence (Fastest Value)

1. Adaptive Daily Plan
2. Recovery Recommendation Engine
3. Notification Intelligence
4. Smart Milestone Verification
5. Match Simulator Mode
6. Opponent Prep Cards
7. Confidence Index + Personal Records
8. Coach Review Export
9. Video Checkpoint Integration
10. Advanced Gamification Seasons

## Effort Estimate (Relative)

- Release 1: Medium-High
- Release 2: High
- Release 3: Medium

Total: High, but practical with staged delivery.
