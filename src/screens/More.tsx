import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';

const links = [
  { to: '/schedule', label: 'Schedule' },
  { to: '/phases', label: 'Phases' },
  { to: '/milestones', label: 'Milestones' },
  { to: '/mechanics', label: 'Mechanics Audit' },
  { to: '/competition', label: 'Competition Log' },
  { to: '/match-simulator', label: 'Match Simulator' },
  { to: '/mental', label: 'Mental Game' },
  { to: '/tournament', label: 'Tournament Prep' },
  { to: '/settings', label: 'Settings' },
  { to: '/kpi', label: 'KPI Tracker' },
];

export default function More() {
  return (
    <PageWrapper title="More">
      <div className="space-y-3">
        {links.map((entry) => (
          <Link key={entry.to} to={entry.to}>
            <Card>
              <p className="text-ivory-100">{entry.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}
