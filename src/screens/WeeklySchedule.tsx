import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { weeklyScheduleTemplate } from '../data/trackerPlan';

export default function WeeklySchedule() {
  return (
    <PageWrapper title="Weekly Schedule">
      <div className="space-y-3">
        {weeklyScheduleTemplate.map((day) => (
          <Card key={day.day}>
            <p className="text-sm uppercase text-chalk-300">{day.day}</p>
            <p className="text-lg text-ivory-100">{day.focusArea}</p>
            <p className="text-sm text-ivory-200">Primary App: {day.primaryApp} · {day.sessionLengthLabel}</p>
            <p className="mt-1 text-xs text-chalk-300">Key Drills: {day.keyDrills.join(' · ')}</p>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
