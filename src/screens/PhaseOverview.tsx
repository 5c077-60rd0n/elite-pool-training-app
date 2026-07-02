import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { getProgramWeek, useProgramStore } from '../store/useProgramStore';

export default function PhaseOverview() {
  const currentWeek = useProgramStore((s) => s.currentWeek);
  const week = getProgramWeek(currentWeek);

  return (
    <PageWrapper title="Phase Overview">
      <Card>
        <p className="text-sm text-chalk-300">Current phase</p>
        <p className="text-xl text-ivory-100">Phase {week.phase}</p>
        <p className="text-ivory-200">Target range: {week.fargoRangeTarget[0]} - {week.fargoRangeTarget[1]}</p>
      </Card>
    </PageWrapper>
  );
}
