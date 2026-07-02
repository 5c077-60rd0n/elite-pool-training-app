import type { MentalGameTip } from '../types/models';

export const mentalGameTips: MentalGameTip[] = [
  {
    id: 'mg-1',
    category: 'routine',
    title: 'Breathe Before the Trigger',
    content: 'Take one full breath before your final set and let your grip relax on the exhale.',
  },
  {
    id: 'mg-2',
    category: 'focus',
    title: 'Quiet Eye Rule',
    content: 'Lock eyes on the object ball contact point for one second before initiating your final stroke.',
  },
  {
    id: 'mg-3',
    category: 'resilience',
    title: '10-Second Reset',
    content: 'Step back, name the lesson, reset stance, then commit. No analysis while down on the shot.',
  },
  {
    id: 'mg-4',
    category: 'pressure',
    title: 'Own the Decision',
    content: 'Your confidence follows commitment. Pick one shot line and execute it with full intent.',
  },
];

export function getTipOfDay(date = new Date()): MentalGameTip {
  const dayIndex = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return mentalGameTips[dayIndex % mentalGameTips.length];
}
