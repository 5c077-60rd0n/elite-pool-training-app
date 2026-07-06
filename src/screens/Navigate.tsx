import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';

const quickLinks = [
  { to: '/session/today', label: 'Log Today\'s Session', detail: 'Fast daily entry and save flow' },
  { to: '/match-simulator', label: 'Run Match Simulator', detail: 'Pressure and race-format rehearsal' },
  { to: '/tournament', label: 'Tournament Prep', detail: 'Best-fit events, prep plan, and debrief' },
  { to: '/kpi', label: 'Check KPI Tracker', detail: 'See readiness and trend signals' },
  { to: '/competition', label: 'Competition Log', detail: 'Capture outcomes and post-event notes' },
  { to: '/settings', label: 'Open Settings', detail: 'Profile, reminders, and data controls' },
];

export default function Navigate() {
  return (
    <PageWrapper title="Navigate">
      <p className="mb-3 text-sm text-chalk-300">Quick access with larger tap targets for common workflows.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {quickLinks.map((entry) => (
          <Link key={entry.to} to={entry.to}>
            <Card className="min-h-24 border-cue-600/30 transition hover:border-cue-500/70 hover:bg-felt-700/90">
              <p className="text-base text-ivory-100">{entry.label}</p>
              <p className="mt-1 text-sm text-chalk-300">{entry.detail}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}
