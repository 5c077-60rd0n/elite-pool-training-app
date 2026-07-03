import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { drills } from '../data/drills';

export default function DrillDetail() {
  const params = useParams();
  const drill = useMemo(() => drills.find((entry) => entry.id === params.drillId), [params.drillId]);

  if (!drill) {
    return (
      <PageWrapper title="Drill Detail">
        <Card>
          <p className="text-ivory-100">Drill not found.</p>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={drill.name}>
      <Card className="mb-4">
        <p className="text-sm text-chalk-300">{drill.category}</p>
        <p className="text-ivory-100">{drill.description}</p>
      </Card>
      <Card title="Setup" className="mb-4">
        <p className="text-ivory-100">{drill.setup}</p>
      </Card>
      <Card title="Table Layout" className="mb-4">
        <pre className="whitespace-pre-wrap rounded-lg bg-felt-800 p-3 text-sm text-ivory-200">{drill.tableLayoutDescription}</pre>
      </Card>
      <Card title="Instructions">
        <ol className="list-decimal space-y-2 pl-5 text-ivory-100">
          {drill.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Card>
      <Card title="Scoring" className="mt-4">
        <p className="mb-2 text-sm text-ivory-200">Method: {drill.scoringMethod.type} ({drill.scoringMethod.unit})</p>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-ivory-200">
          {drill.scoringMethod.trackingFields.map((field) => (
            <li key={field.id}>{field.label}</li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="rounded-lg bg-felt-800 p-2 text-ivory-100">Phase 1: {drill.targetScore.phase1}</p>
          <p className="rounded-lg bg-felt-800 p-2 text-ivory-100">Phase 2: {drill.targetScore.phase2}</p>
          <p className="rounded-lg bg-felt-800 p-2 text-ivory-100">Phase 3: {drill.targetScore.phase3}</p>
          <p className="rounded-lg bg-felt-800 p-2 text-ivory-100">Phase 4: {drill.targetScore.phase4}</p>
        </div>
      </Card>
      <Card title="Pro Tip" className="mt-4">
        <p className="text-ivory-100">{drill.proTip}</p>
      </Card>
    </PageWrapper>
  );
}
