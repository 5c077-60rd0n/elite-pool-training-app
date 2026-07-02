import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { getProgramWeek, useProgramStore } from '../store/useProgramStore';

export default function WeeklySchedule() {
  const currentWeek = useProgramStore((s) => s.currentWeek);
  const week = getProgramWeek(currentWeek);

  return (
    <PageWrapper title="Weekly Schedule">
      <div className="space-y-3">
        {Object.values(week.dailySessions).map((day) => (
          <Card key={day.dayOfWeek}>
            <p className="text-sm uppercase text-chalk-300">{day.dayOfWeek}</p>
            <p className="text-lg text-ivory-100">{day.focusArea}</p>
            <p className="text-sm text-ivory-200">{day.segments.length} segments · 60 minutes</p>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
