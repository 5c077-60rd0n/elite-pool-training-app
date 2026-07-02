import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { monthlyMilestones } from '../data/milestones';

export default function MilestoneLog() {
  return (
    <PageWrapper title="Milestone Log">
      <div className="space-y-3">
        {monthlyMilestones.map((milestone) => (
          <Card key={milestone.month}>
            <p className="text-sm text-chalk-300">Month {milestone.month}</p>
            <p className="text-lg text-ivory-100">Fargo Target {milestone.fargoTarget}</p>
            <p className="text-ivory-200">{milestone.description}</p>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
