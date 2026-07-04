import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useTrackerStore } from '../store/useTrackerStore';
import type { MechanicsChecklistItem } from '../types/tracker';

export default function MechanicsAudit() {
  const checklist = useTrackerStore((s) => s.mechanicsChecklist);
  const weeklyAudits = useTrackerStore((s) => s.mechanicsWeeklyAuditLog);
  const upsertChecklistItem = useTrackerStore((s) => s.upsertMechanicsChecklistItem);
  const addWeeklyAudit = useTrackerStore((s) => s.addMechanicsWeeklyAudit);

  const sortedChecklist = useMemo(
    () => [...checklist].sort((a, b) => a.checkpointItem.localeCompare(b.checkpointItem)),
    [checklist],
  );

  const [weekNumber, setWeekNumber] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [keyFinding, setKeyFinding] = useState('');
  const [actionItem, setActionItem] = useState('');
  const [signOff, setSignOff] = useState('');

  const itemsPassed = checklist.filter((item) => item.status === 'Pass').length;
  const itemsFailed = checklist.filter((item) => item.status === 'Needs Work').length;

  function updateChecklist(item: MechanicsChecklistItem): void {
    upsertChecklistItem(item);
  }

  function saveWeeklyAudit(): void {
    addWeeklyAudit({
      id: `weekly-audit-${Date.now()}`,
      weekNumber,
      date,
      itemsPassed,
      itemsFailed,
      keyFinding,
      actionItem,
      signOff,
    });

    setKeyFinding('');
    setActionItem('');
    setSignOff('');
  }

  return (
    <PageWrapper title="Mechanics Audit">
      <Card className="mb-4" title="Mechanics Checklist">
        <div className="space-y-3">
          {sortedChecklist.map((item) => (
            <div key={item.id} className="rounded-xl border border-felt-600 bg-felt-800/60 p-3">
              <p className="text-sm text-ivory-100">{item.checkpointItem}</p>
              <p className="mt-1 text-xs text-chalk-300">{item.whatToVerify}</p>
              <p className="mt-1 text-xs text-chalk-300">Tool: {item.toolToUse} · Frequency: {item.frequency}</p>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={item.status}
                  onChange={(event) =>
                    updateChecklist({
                      ...item,
                      status: event.target.value as MechanicsChecklistItem['status'],
                    })
                  }
                  className="min-h-11 rounded-xl border border-felt-600 bg-felt-900 px-3 text-ivory-100"
                >
                  <option value="Not Checked">Not Checked</option>
                  <option value="Pass">Pass</option>
                  <option value="Needs Work">Needs Work</option>
                </select>

                <input
                  type="date"
                  value={item.lastCheckedDate ?? ''}
                  onChange={(event) =>
                    updateChecklist({
                      ...item,
                      lastCheckedDate: event.target.value,
                    })
                  }
                  className="min-h-11 rounded-xl border border-felt-600 bg-felt-900 px-3 text-ivory-100"
                />

                <input
                  value={item.notes}
                  placeholder="Notes"
                  onChange={(event) =>
                    updateChecklist({
                      ...item,
                      notes: event.target.value,
                    })
                  }
                  className="min-h-11 rounded-xl border border-felt-600 bg-felt-900 px-3 text-ivory-100"
                />
              </div>

              <input
                value={item.clipReferenceUrl ?? ''}
                placeholder="Clip reference URL"
                onChange={(event) =>
                  updateChecklist({
                    ...item,
                    clipReferenceUrl: event.target.value,
                  })
                }
                className="mt-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-900 px-3 text-ivory-100"
              />

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <textarea
                  value={item.beforeSnapshotNotes ?? ''}
                  placeholder="Before snapshot notes"
                  onChange={(event) =>
                    updateChecklist({
                      ...item,
                      beforeSnapshotNotes: event.target.value,
                    })
                  }
                  className="min-h-20 rounded-xl border border-felt-600 bg-felt-900 p-3 text-ivory-100"
                />
                <textarea
                  value={item.afterSnapshotNotes ?? ''}
                  placeholder="After snapshot notes"
                  onChange={(event) =>
                    updateChecklist({
                      ...item,
                      afterSnapshotNotes: event.target.value,
                    })
                  }
                  className="min-h-20 rounded-xl border border-felt-600 bg-felt-900 p-3 text-ivory-100"
                />
              </div>

              {(item.beforeSnapshotNotes || item.afterSnapshotNotes) && (
                <div className="mt-2 rounded-lg border border-felt-600 bg-felt-900/60 p-2 text-xs text-chalk-300">
                  <p className="text-ivory-100">Checkpoint Snapshot Compare</p>
                  <p>Before: {item.beforeSnapshotNotes || 'Not set'}</p>
                  <p>After: {item.afterSnapshotNotes || 'Not set'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4" title="Weekly Audit Log Entry">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-sm text-chalk-300">
            Week #
            <input
              type="number"
              min={1}
              value={weekNumber}
              onChange={(event) => setWeekNumber(Math.max(1, Number(event.target.value) || 1))}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
          <label className="text-sm text-chalk-300">
            Date Audited
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
            />
          </label>
        </div>

        <p className="mt-2 text-sm text-ivory-200">Items Passed: {itemsPassed} · Items Failed: {itemsFailed}</p>

        <input
          value={keyFinding}
          onChange={(event) => setKeyFinding(event.target.value)}
          placeholder="Key Finding"
          className="mt-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <input
          value={actionItem}
          onChange={(event) => setActionItem(event.target.value)}
          placeholder="Action Item"
          className="mt-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <input
          value={signOff}
          onChange={(event) => setSignOff(event.target.value)}
          placeholder="Sign-Off"
          className="mt-2 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
        />
        <Button className="mt-3 w-full" onClick={saveWeeklyAudit} disabled={!keyFinding.trim() || !actionItem.trim()}>
          Save Weekly Audit
        </Button>
      </Card>

      <Card title="Weekly Audit History">
        <div className="space-y-2">
          {[...weeklyAudits]
            .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
            .map((audit) => (
              <div key={audit.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-3 text-sm">
                <p className="text-ivory-100">Week {audit.weekNumber} · {audit.date}</p>
                <p className="text-chalk-300">Pass {audit.itemsPassed} · Fail {audit.itemsFailed}</p>
                <p className="text-ivory-200">Key Finding: {audit.keyFinding}</p>
                <p className="text-ivory-200">Action Item: {audit.actionItem}</p>
                {audit.signOff ? <p className="text-chalk-300">Sign-Off: {audit.signOff}</p> : null}
              </div>
            ))}
        </div>
      </Card>
    </PageWrapper>
  );
}
