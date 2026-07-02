import type { DaySession, DayOfWeek, ProgramWeek } from '../types/models';

interface WeekPlan {
  week: number;
  phase: 1 | 2 | 3 | 4;
  month: number;
  fargoRangeTarget: [number, number];
  theme: string;
  weeklyFocus: string;
  coachNote: string;
}

const days: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function makeDay(dayOfWeek: DayOfWeek, focusArea: string, mainDrills: string[]): DaySession {
  return {
    dayOfWeek,
    focusArea,
    totalMinutes: 60,
    segments: [
      {
        id: `${dayOfWeek}-warmup`,
        name: 'Warm-up',
        durationMinutes: 10,
        drillIds: ['straight-line-drill', 'stop-shot-matrix'],
        notes: 'Set rhythm and center-ball alignment.',
      },
      {
        id: `${dayOfWeek}-primary`,
        name: 'Primary Drill Block',
        durationMinutes: 30,
        drillIds: mainDrills,
        notes: 'Core technical objective for the day.',
      },
      {
        id: `${dayOfWeek}-application`,
        name: 'Application Block',
        durationMinutes: 15,
        drillIds: ['pre-shot-commitment-drill'],
        notes: 'Convert mechanics into decision-ready execution.',
      },
      {
        id: `${dayOfWeek}-review`,
        name: 'Review and Journal',
        durationMinutes: 5,
        drillIds: [],
        notes: 'Write one tactical win and one adjustment for tomorrow.',
      },
    ],
  };
}

function drillsForDay(phase: 1 | 2 | 3 | 4, day: DayOfWeek, week: number): { focus: string; drills: string[] } {
  if (phase === 1) {
    const patternCycle = week % 3;
    const tuesdayDrill = patternCycle === 0 ? 'five-position-drill' : patternCycle === 1 ? 'l-drill' : 'stop-shot-matrix';
    const wednesdayDrill = patternCycle === 2 ? 'fractional-ball-drill' : 'cut-shot-matrix';
    return {
      monday: { focus: 'Stroke and Mechanics', drills: ['straight-line-drill', 'pause-at-back-verification'] },
      tuesday: { focus: 'Cue Ball Control Basics', drills: [tuesdayDrill, 'rail-control-drill'] },
      wednesday: { focus: 'Aiming System Fundamentals', drills: [wednesdayDrill, 'ghost-ball-visualization-drill'] },
      thursday: { focus: 'Pattern Introduction', drills: ['3-ball-pattern-sequence', 'key-ball-identification-drill'] },
      friday: { focus: 'Break Fundamentals', drills: ['half-power-mechanics-break', 'rack-reading-drill'] },
      saturday: { focus: 'Ghost Match Development', drills: ['pressure-ghost-match'] },
      sunday: { focus: 'Mental Recovery and Study', drills: ['quiet-eye-practice', 'deliberate-mistake-drill'] },
    }[day];
  }

  if (phase === 2) {
    const advancedToggle = week % 2 === 0;
    return {
      monday: { focus: 'Runout Consistency', drills: ['9-ball-roadmap-drill', '9-ball-shape-drill'] },
      tuesday: { focus: 'Advanced Positioning', drills: [advancedToggle ? 'rail-control-drill' : 'speed-control-5-zone-drill', 'l-drill'] },
      wednesday: { focus: 'Safety Battles', drills: ['two-way-shot-drill', 'thin-cut-safe-drill'] },
      thursday: { focus: 'Pattern Pressure Sets', drills: ['problem-ball-first-drill', '8-ball-strategic-assessment-drill'] },
      friday: { focus: 'Break Optimization', drills: ['9-ball-break-zone-chart', '8-ball-break-control'] },
      saturday: { focus: 'Tournament Simulation', drills: ['9-ball-roadmap-drill', 'pressure-ghost-match'] },
      sunday: { focus: 'Mental Protocol and Review', drills: ['pre-shot-commitment-drill', 'quiet-eye-practice'] },
    }[day];
  }

  if (phase === 3) {
    return {
      monday: { focus: 'Elite Stroke Discipline', drills: ['slow-motion-stroke-drill', 'thin-cut-practice'] },
      tuesday: { focus: 'Two-Rail Cue Ball Control', drills: ['rail-control-drill', 'clock-system-drill'] },
      wednesday: { focus: 'Straight Pool Positioning', drills: ['break-ball-drill', 'high-run-builder'] },
      thursday: { focus: 'Pressure Pattern Execution', drills: ['9-ball-roadmap-drill', 'problem-ball-first-drill'] },
      friday: { focus: 'Defensive Maturity', drills: ['kick-safe-drill', 'cluster-safe-drill'] },
      saturday: { focus: 'Competitive Integration', drills: ['9-ball-roadmap-drill', 'pressure-ghost-match'] },
      sunday: { focus: 'Mental and Video Debrief', drills: ['deliberate-mistake-drill', 'pre-shot-commitment-drill'] },
    }[day];
  }

  return {
    monday: { focus: 'High-Run Building', drills: ['high-run-builder', 'break-ball-drill'] },
    tuesday: { focus: 'World-Class Cue Ball Routes', drills: ['l-drill', 'speed-control-5-zone-drill'] },
    wednesday: { focus: 'Straight Pool Refinement', drills: ['high-run-builder', 'safety-cluster-drill'] },
    thursday: { focus: 'Mental Game Specialization', drills: ['pre-shot-commitment-drill', 'quiet-eye-practice', 'deliberate-mistake-drill'] },
    friday: { focus: 'Break Peak Performance', drills: ['9-ball-break-zone-chart', 'rack-reading-drill'] },
    saturday: { focus: 'Full Competitive Simulation', drills: ['9-ball-roadmap-drill', 'pressure-ghost-match'] },
    sunday: { focus: 'Performance Review and Planning', drills: ['pre-shot-commitment-drill'] },
  }[day];
}

const weekPlans: WeekPlan[] = [
  { week: 1, phase: 1, month: 1, fargoRangeTarget: [550, 556], theme: 'Baseline Stroke Audit', weeklyFocus: 'Identify current stroke leaks and lock setup fundamentals.', coachNote: 'Do not chase power yet. Precision habits are your fastest path upward.' },
  { week: 2, phase: 1, month: 1, fargoRangeTarget: [552, 558], theme: 'Bridge and Alignment Stability', weeklyFocus: 'Repeatable bridge length and chin-line alignment.', coachNote: 'Repetition beats intensity this week. Keep every rep clean and intentional.' },
  { week: 3, phase: 1, month: 1, fargoRangeTarget: [554, 560], theme: 'Backswing Tempo Control', weeklyFocus: 'Smooth transition from backswing to delivery without jab.', coachNote: 'If timing slips, slow down and own the pause before accelerating.' },
  { week: 4, phase: 1, month: 1, fargoRangeTarget: [556, 563], theme: 'Delivery Line Consistency', weeklyFocus: 'Maintain straight cue travel under moderate session fatigue.', coachNote: 'Your finish tells the truth. Stay down and hold form after impact.' },
  { week: 5, phase: 1, month: 2, fargoRangeTarget: [558, 566], theme: 'Cut Shot Foundations', weeklyFocus: 'Anchor basic ghost-ball visuals at standard angles.', coachNote: 'Pick one miss pattern and solve it completely before moving on.' },
  { week: 6, phase: 1, month: 2, fargoRangeTarget: [560, 569], theme: 'Fractional Contact Accuracy', weeklyFocus: 'Recognize quarter and half-ball references more quickly.', coachNote: 'Call contacts out loud. Verbal clarity creates visual clarity.' },
  { week: 7, phase: 1, month: 2, fargoRangeTarget: [563, 572], theme: 'Stun and Stop Mastery', weeklyFocus: 'Control cue-ball stop window from multiple distances.', coachNote: 'Make cue-ball behavior boringly predictable before adding spin.' },
  { week: 8, phase: 1, month: 2, fargoRangeTarget: [565, 575], theme: 'L-Drill Introduction', weeklyFocus: 'Route cue ball into boxes with speed-first thinking.', coachNote: 'Missing short is information. Missing long is usually impatience.' },
  { week: 9, phase: 1, month: 2, fargoRangeTarget: [568, 579], theme: 'Rail-Aware Positioning', weeklyFocus: 'One-rail positioning precision to fixed zones.', coachNote: 'Study first-rail contact points and trust the geometry.' },
  { week: 10, phase: 1, month: 3, fargoRangeTarget: [571, 583], theme: 'Three-Ball Pattern Planning', weeklyFocus: 'Plan routes two balls ahead before every opening shot.', coachNote: 'Your pattern is only as good as your key transition angle.' },
  { week: 11, phase: 1, month: 3, fargoRangeTarget: [574, 587], theme: 'Cluster Awareness Basics', weeklyFocus: 'Locate and solve problem balls early in innings.', coachNote: 'A simple breakout early beats a heroic breakout late.' },
  { week: 12, phase: 1, month: 3, fargoRangeTarget: [577, 591], theme: 'Safety Fundamentals', weeklyFocus: 'Thin safe touch and speed control under control.', coachNote: 'Defensive quality is measured by opponent options, not table beauty.' },
  { week: 13, phase: 1, month: 3, fargoRangeTarget: [580, 595], theme: 'Phase 1 Integration Week', weeklyFocus: 'Blend mechanics, aiming, and simple tactical decisions.', coachNote: 'Celebrate consistency gains. You built the platform for phase 2 growth.' },

  { week: 14, phase: 2, month: 4, fargoRangeTarget: [595, 603], theme: 'Pattern Mastery Kickoff', weeklyFocus: 'Runout path quality becomes the top metric.', coachNote: 'Start each rack with intention, not reaction.' },
  { week: 15, phase: 2, month: 4, fargoRangeTarget: [598, 607], theme: 'Key Ball Reliability', weeklyFocus: 'Improve key-ball recognition in 9-ball decision trees.', coachNote: 'Stop judging shots in isolation. Judge them by what they unlock next.' },
  { week: 16, phase: 2, month: 4, fargoRangeTarget: [601, 611], theme: 'Transition Angles Under Pressure', weeklyFocus: 'Protect cue-ball windows through middle-of-rack routes.', coachNote: 'Protect the natural angle and stop forcing cue-ball heroics.' },
  { week: 17, phase: 2, month: 4, fargoRangeTarget: [604, 615], theme: 'Runout Conversion Week', weeklyFocus: 'Turn pattern plans into completed racks at higher rates.', coachNote: 'A clear plan plus committed speed wins more than perfect mechanics alone.' },
  { week: 18, phase: 2, month: 5, fargoRangeTarget: [607, 620], theme: '10-Ball Introduction', weeklyFocus: 'Adapt pattern pacing to tougher shot selection constraints.', coachNote: 'Accept lower immediate runout rates while your decision quality rises.' },
  { week: 19, phase: 2, month: 5, fargoRangeTarget: [611, 624], theme: 'Two-Rail Position Growth', weeklyFocus: 'Expand controlled two-rail routes to key zones.', coachNote: 'First rail point is the steering wheel. Lock it in before stroking.' },
  { week: 20, phase: 2, month: 5, fargoRangeTarget: [614, 629], theme: 'Safety Exchange Development', weeklyFocus: 'Build first-inning defensive pressure and return safety options.', coachNote: 'Great players win the table before they run the table.' },
  { week: 21, phase: 2, month: 5, fargoRangeTarget: [618, 634], theme: 'Two-Way Shot Confidence', weeklyFocus: 'Choose offense that still protects your downside.', coachNote: 'Your miss pattern should still leave a problem for the opponent.' },
  { week: 22, phase: 2, month: 6, fargoRangeTarget: [622, 639], theme: 'Safety Maturity Block', weeklyFocus: 'Move from basic hide shots to strategic trap building.', coachNote: 'Distance and angle are tactical weapons. Use both on purpose.' },
  { week: 23, phase: 2, month: 6, fargoRangeTarget: [626, 644], theme: 'Break Efficiency Week', weeklyFocus: 'Increase cue-ball target-zone frequency on competitive breaks.', coachNote: 'Break control raises your innings quality before shot one.' },
  { week: 24, phase: 2, month: 6, fargoRangeTarget: [630, 649], theme: 'Tournament Rhythm Preparation', weeklyFocus: 'Simulate race formats and reset routines between racks.', coachNote: 'Practice the pace you expect to play in real events.' },
  { week: 25, phase: 2, month: 6, fargoRangeTarget: [634, 654], theme: 'First Tournament Prep Cycle', weeklyFocus: 'Apply 14-day readiness checklist mechanics.', coachNote: 'Preparation reduces anxiety. Build certainty through routine.' },
  { week: 26, phase: 2, month: 6, fargoRangeTarget: [638, 660], theme: 'Phase 2 Consolidation', weeklyFocus: 'Stabilize pattern-plus-safety decisions before elite jump.', coachNote: 'You are not just making balls now. You are controlling matches.' },

  { week: 27, phase: 3, month: 7, fargoRangeTarget: [660, 667], theme: 'Elite Development Launch', weeklyFocus: 'Raise technical standards while introducing straight pool discipline.', coachNote: 'Patience is now a scoring skill, not just a mindset.' },
  { week: 28, phase: 3, month: 7, fargoRangeTarget: [663, 671], theme: '14.1 Pattern Discipline', weeklyFocus: 'Prioritize break-ball planning and transition control.', coachNote: 'Each shot should serve the current rack and the next rack.' },
  { week: 29, phase: 3, month: 7, fargoRangeTarget: [666, 675], theme: 'High-Value Positional Precision', weeklyFocus: 'Shrink cue-ball target windows for elite consistency.', coachNote: 'Tighter windows force cleaner decisions and cleaner speed.' },
  { week: 30, phase: 3, month: 7, fargoRangeTarget: [669, 679], theme: 'Straight Pool Continuity', weeklyFocus: 'Sustain run length by avoiding low-value hero patterns.', coachNote: 'Choose high-probability progress over low-probability brilliance.' },
  { week: 31, phase: 3, month: 8, fargoRangeTarget: [672, 684], theme: 'Pressure Drill Escalation', weeklyFocus: 'Increase consequences and tracking in race scenarios.', coachNote: 'Pressure reveals routine quality. Trust your process fully.' },
  { week: 32, phase: 3, month: 8, fargoRangeTarget: [676, 689], theme: 'Ghost Race Expansion', weeklyFocus: 'Move race formats toward race-to-7 competitive demand.', coachNote: 'The scoreline is noise. The decision on this shot is signal.' },
  { week: 33, phase: 3, month: 8, fargoRangeTarget: [680, 694], theme: 'Defensive Counterpunching', weeklyFocus: 'Turn kicks and returns into table-control opportunities.', coachNote: 'Your reply safety can be as powerful as your original safety.' },
  { week: 34, phase: 3, month: 8, fargoRangeTarget: [684, 699], theme: 'Pattern Speed Under Clock', weeklyFocus: 'Maintain strategic clarity with reduced pre-shot time.', coachNote: 'Fast is fine when your framework is clear and disciplined.' },
  { week: 35, phase: 3, month: 8, fargoRangeTarget: [688, 704], theme: 'Tournament Simulation Twice Weekly', weeklyFocus: 'Adapt to repeat match-day fatigue and mental resets.', coachNote: 'Win your between-match routine and your session quality improves.' },
  { week: 36, phase: 3, month: 9, fargoRangeTarget: [692, 709], theme: 'All-Game Integration Start', weeklyFocus: 'Blend 8-ball, 9-ball, 10-ball, and 14.1 decision layers.', coachNote: 'Your system should transfer across formats with minimal friction.' },
  { week: 37, phase: 3, month: 9, fargoRangeTarget: [696, 714], theme: 'Advanced Banking and Kicking', weeklyFocus: 'Raise contact reliability and tactical outcomes on escapes.', coachNote: 'A reliable kick turns defense from panic into opportunity.' },
  { week: 38, phase: 3, month: 9, fargoRangeTarget: [700, 720], theme: 'Competitive Simulation Endurance', weeklyFocus: 'Sustain decision quality deep into long sessions.', coachNote: 'Fatigue management is now a technical skill.' },
  { week: 39, phase: 3, month: 9, fargoRangeTarget: [704, 726], theme: 'Phase 3 Elite Checkpoint', weeklyFocus: 'Audit strengths and isolate final climb bottlenecks.', coachNote: 'You are close to the top tier. Precision in preparation now matters most.' },

  { week: 40, phase: 4, month: 10, fargoRangeTarget: [726, 733], theme: 'World-Class Refinement Begins', weeklyFocus: 'Adopt championship pace, discipline, and execution standards.', coachNote: 'Every session should look and feel like match day.' },
  { week: 41, phase: 4, month: 10, fargoRangeTarget: [730, 738], theme: 'Daily High-Run Commitment', weeklyFocus: 'Straight pool high-run repetition for sustained concentration.', coachNote: 'Long runs come from tiny position wins repeated perfectly.' },
  { week: 42, phase: 4, month: 10, fargoRangeTarget: [734, 743], theme: 'Break-Ball Precision Week', weeklyFocus: 'Sharpen break-ball cue-ball windows and continuation options.', coachNote: 'Break-ball mistakes are planning mistakes first, stroke mistakes second.' },
  { week: 43, phase: 4, month: 10, fargoRangeTarget: [738, 748], theme: '20+ Run Target Push', weeklyFocus: 'Push weekly best run benchmarks into elite territory.', coachNote: 'Stay patient in run-building. One forced shot can erase twenty good ones.' },
  { week: 44, phase: 4, month: 11, fargoRangeTarget: [742, 753], theme: 'Mental Specialization Block 1', weeklyFocus: 'Stress-proof routines and emotional reset speed.', coachNote: 'Calm under pressure is trained, not gifted.' },
  { week: 45, phase: 4, month: 11, fargoRangeTarget: [746, 758], theme: 'Mental Specialization Block 2', weeklyFocus: 'Commitment training against stronger opponents and tougher layouts.', coachNote: 'Against better players, indecision costs more than missed execution.' },
  { week: 46, phase: 4, month: 11, fargoRangeTarget: [750, 764], theme: 'Opponent Adaptation Week', weeklyFocus: 'Track tactical adjustments by opponent style and pace.', coachNote: 'Elite play includes adaptation speed, not just shotmaking.' },
  { week: 47, phase: 4, month: 11, fargoRangeTarget: [754, 770], theme: 'Closing Rack Excellence', weeklyFocus: 'Improve finish rates on final three-ball patterns under pressure.', coachNote: 'Championship sets are often decided by closing quality.' },
  { week: 48, phase: 4, month: 11, fargoRangeTarget: [758, 776], theme: 'Pressure Set Conversion', weeklyFocus: 'Win more deciding racks through routine discipline.', coachNote: 'When pressure rises, shrink focus to process and tempo.' },
  { week: 49, phase: 4, month: 12, fargoRangeTarget: [762, 783], theme: 'Full Integration Cycle 1', weeklyFocus: 'Blend all game modules into competitive-ready sessions.', coachNote: 'No weak links now. Each module must support match outcomes.' },
  { week: 50, phase: 4, month: 12, fargoRangeTarget: [768, 790], theme: 'Full Integration Cycle 2', weeklyFocus: 'Refine break, safety, and pattern synergy across formats.', coachNote: 'Elite confidence comes from repeatable systems, not isolated hot streaks.' },
  { week: 51, phase: 4, month: 12, fargoRangeTarget: [775, 797], theme: 'Performance Review Week', weeklyFocus: 'Analyze trend lines and target final technical adjustments.', coachNote: 'Your data should now guide small, precise interventions.' },
  { week: 52, phase: 4, month: 12, fargoRangeTarget: [782, 805], theme: 'Next-Year Goal Setting Week', weeklyFocus: 'Lock next-cycle goals and preserve championship practice habits.', coachNote: 'You built an elite foundation. Protect it with standards, not motivation.' },
];

export const programWeeks: ProgramWeek[] = weekPlans.map((plan) => {
  const dailySessions = days.reduce((acc, day) => {
    const mapping = drillsForDay(plan.phase, day, plan.week);
    acc[day] = makeDay(day, mapping.focus, mapping.drills);
    return acc;
  }, {} as ProgramWeek['dailySessions']);

  return {
    week: plan.week,
    phase: plan.phase,
    month: plan.month,
    theme: plan.theme,
    fargoRangeTarget: plan.fargoRangeTarget,
    dailySessions,
    weeklyFocus: plan.weeklyFocus,
    coachNote: plan.coachNote,
  };
});
