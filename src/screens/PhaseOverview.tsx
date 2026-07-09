import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { getActiveTrainingFargo } from '../utils/fargoProfile';
import { estimateFargo, phaseFromFargo } from '../utils/trackerCalculations';

export default function PhaseOverview() {
  const profile = useSettingsStore((s) => s.profile);
  const logs = useTrackerStore((s) => s.dailySessionLogs);
  const ratings = useTrackerStore((s) => s.fargoRatingLog);
  const phaseStatuses = useTrackerStore((s) => s.milestonePhaseStatuses);
  const milestoneRows = useTrackerStore((s) => s.milestoneTrackerRows);
  const activeTrainingFargo = getActiveTrainingFargo(profile);
  const estimatedFargo = estimateFargo(activeTrainingFargo, logs, ratings);
  const phase = phaseFromFargo(estimatedFargo);

  return (
    <PageWrapper title="Phase Overview">
      <Card>
        <p className="text-sm text-chalk-300">Current phase</p>
        <p className="text-xl text-ivory-100">Phase {phase}</p>
        <p className="text-ivory-200">Estimated Fargo: {estimatedFargo}</p>
      </Card>

      <div className="mt-4 space-y-3">
        {phaseStatuses.map((item) => (
          <Card key={item.phase}>
            <p className="text-sm text-chalk-300">{item.label}</p>
            <p className="text-lg text-ivory-100">Target Fargo {item.phase === 5 ? '800+' : item.phase === 1 ? 600 : item.phase === 2 ? 650 : item.phase === 3 ? 700 : 750}</p>
            <p className={item.phaseStatus === 'Met' ? 'text-cue-300' : item.phaseStatus === 'In Progress' ? 'text-flash-400' : 'text-chalk-300'}>
              {item.phaseStatus}
            </p>
            <p className="text-sm text-ivory-200">Timeline: {item.targetWeeks}</p>
            <p className="mt-2 text-xs text-chalk-300">Tests met: {milestoneRows.filter((row) => row.phase === item.phase && row.status === 'Met').length}/{milestoneRows.filter((row) => row.phase === item.phase).length}</p>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
