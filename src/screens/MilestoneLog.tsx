import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useTrackerStore } from '../store/useTrackerStore';

export default function MilestoneLog() {
  const milestones = useTrackerStore((s) => s.milestoneTrackerRows);

  return (
    <PageWrapper title="Milestone Log">
      <div className="space-y-3">
        {milestones.map((milestone) => (
          <Card key={milestone.id}>
            <p className="text-sm text-chalk-300">{milestone.phaseLabel} · {milestone.fargoRange} · {milestone.timeline}</p>
            <p className="text-lg text-ivory-100">{milestone.milestoneTestDescription}</p>
            <p className="text-sm text-ivory-200">Target: {milestone.targetMetric}</p>
            <p className="text-sm text-ivory-200">Current Best: {milestone.currentBest}</p>
            <p className={milestone.status === 'Met' ? 'text-cue-300' : 'text-chalk-300'}>{milestone.status}</p>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
