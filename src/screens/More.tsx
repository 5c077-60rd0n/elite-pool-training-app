import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useSettingsStore } from '../store/useSettingsStore';

const sections = [
  {
    title: 'Training Core',
    links: [
      { to: '/kpi', label: 'KPI Tracker', detail: 'Monitor key training metrics' },
      { to: '/schedule', label: 'Weekly Schedule', detail: 'Review weekly workload structure' },
      { to: '/phases', label: 'Phase Roadmap', detail: 'Track phase progression targets' },
      { to: '/milestones', label: 'Milestone Verifications', detail: 'Log pass/fail milestone checks' },
      { to: '/mechanics', label: 'Mechanics Audit', detail: 'Run stroke and form checkpoints' },
      { to: '/mental', label: 'Mental Game', detail: 'Train routines and focus control' },
    ],
  },
  {
    title: 'Competition',
    links: [
      { to: '/match-simulator', label: 'Match Simulator', detail: 'Practice race-format pressure' },
      { to: '/tournament', label: 'Tournament Prep', detail: 'Execute event prep and debrief loops' },
      { to: '/competition', label: 'Competition Log', detail: 'Store outcomes and post-event notes' },
      { to: '/elite-lab', label: 'Elite Performance Lab', detail: 'Run advanced decision and readiness modules' },
    ],
  },
  {
    title: 'System',
    links: [
      { to: '/settings', label: 'Settings', detail: 'Profile, notifications, backup, and reset' },
    ],
  },
];

export default function More() {
  const adhdModeEnabled = Boolean(useSettingsStore((s) => s.profile.adhdModeEnabled));
  const [showAllModules, setShowAllModules] = useState(false);
  const visibleSections = useMemo(() => {
    if (!adhdModeEnabled || showAllModules) return sections;
    return sections.map((section) => ({
      ...section,
      links: section.links.slice(0, section.title === 'Training Core' ? 2 : 1),
    }));
  }, [adhdModeEnabled, showAllModules]);

  return (
    <PageWrapper title="More">
      <p className="mb-3 text-sm text-chalk-300">Browse all modules grouped by purpose.</p>
      {adhdModeEnabled ? (
        <div className="mb-3 flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setShowAllModules((prev) => !prev)}>
            {showAllModules ? 'Show Essential Modules' : 'Show Full Module List'}
          </Button>
          <p className="text-xs text-chalk-300">Use essential mode for low-cognitive-load days.</p>
        </div>
      ) : null}
      <div className="space-y-4">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-chalk-400">{section.title}</p>
            {section.links.map((entry) => (
              <Link key={entry.to} to={entry.to}>
                <Card>
                  <p className="text-ivory-100">{entry.label}</p>
                  <p className="text-xs text-chalk-300">{entry.detail}</p>
                </Card>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
