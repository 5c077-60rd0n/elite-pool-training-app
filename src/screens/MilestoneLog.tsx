import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useTrackerStore } from '../store/useTrackerStore';

export default function MilestoneLog() {
  const milestones = useTrackerStore((s) => s.milestoneTrackerRows);
  const attempts = useTrackerStore((s) => s.milestoneVerificationAttempts);
  const addMilestoneVerificationAttempt = useTrackerStore((s) => s.addMilestoneVerificationAttempt);

  const [measuredValue, setMeasuredValue] = useState<Record<string, string>>({});
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<Record<string, 'Pass' | 'Fail'>>({});
  const [evaluator, setEvaluator] = useState<Record<string, string>>({});

  const attemptsByMilestone = useMemo(() => {
    const grouped = new Map<string, typeof attempts>();
    attempts.forEach((attempt) => {
      const list = grouped.get(attempt.milestoneId) ?? [];
      list.push(attempt);
      grouped.set(attempt.milestoneId, list);
    });
    return grouped;
  }, [attempts]);

  function saveAttempt(milestoneId: string): void {
    const value = measuredValue[milestoneId]?.trim() ?? '';
    if (!value) return;

    addMilestoneVerificationAttempt({
      id: `verify-${milestoneId}-${Date.now()}`,
      milestoneId,
      date: new Date().toISOString().slice(0, 10),
      measuredValue: value,
      outcome: outcome[milestoneId] ?? 'Fail',
      evidenceNotes: evidenceNotes[milestoneId] ?? '',
      evaluator: evaluator[milestoneId] ?? 'Self',
      createdAt: new Date().toISOString(),
    });

    setMeasuredValue((state) => ({ ...state, [milestoneId]: '' }));
    setEvidenceNotes((state) => ({ ...state, [milestoneId]: '' }));
  }

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

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={measuredValue[milestone.id] ?? ''}
                onChange={(event) =>
                  setMeasuredValue((state) => ({ ...state, [milestone.id]: event.target.value }))
                }
                placeholder="Measured value (example: 6/10, 58%, Yes)"
                className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
              />
              <select
                value={outcome[milestone.id] ?? 'Fail'}
                onChange={(event) =>
                  setOutcome((state) => ({ ...state, [milestone.id]: event.target.value as 'Pass' | 'Fail' }))
                }
                className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
              >
                <option value="Fail">Fail</option>
                <option value="Pass">Pass</option>
              </select>
            </div>

            <input
              value={evaluator[milestone.id] ?? ''}
              onChange={(event) =>
                setEvaluator((state) => ({ ...state, [milestone.id]: event.target.value }))
              }
              placeholder="Evaluator (Self / Coach Name)"
              className="mt-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
            <textarea
              value={evidenceNotes[milestone.id] ?? ''}
              onChange={(event) =>
                setEvidenceNotes((state) => ({ ...state, [milestone.id]: event.target.value }))
              }
              placeholder="Evidence notes (conditions, pressure set details, observations)"
              className="mt-2 min-h-20 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
            />
            <Button className="mt-2" onClick={() => saveAttempt(milestone.id)} disabled={!(measuredValue[milestone.id] ?? '').trim()}>
              Save Verification Attempt
            </Button>

            <div className="mt-3 space-y-1 text-xs text-chalk-300">
              {(attemptsByMilestone.get(milestone.id) ?? []).slice(0, 3).map((attempt) => (
                <p key={attempt.id}>
                  {attempt.date} · {attempt.outcome} · {attempt.measuredValue}
                  {attempt.evaluator ? ` · ${attempt.evaluator}` : ''}
                </p>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
