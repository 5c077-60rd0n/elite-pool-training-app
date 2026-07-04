import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useTrackerStore } from '../store/useTrackerStore';

export default function CompetitionLog() {
  const competitionLog = useTrackerStore((s) => s.competitionLog);
  const addCompetitionLog = useTrackerStore((s) => s.addCompetitionLog);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventName, setEventName] = useState('');
  const [format, setFormat] = useState('Race to 7');
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');

  function saveEntry(): void {
    addCompetitionLog({
      id: `competition-${Date.now()}`,
      date,
      eventName,
      format,
      result,
      notes,
    });

    setEventName('');
    setResult('');
    setNotes('');
  }

  return (
    <PageWrapper title="Competition Log">
      <Card className="mb-4" title="New Competition Entry">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <input
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            placeholder="Event Name"
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <input
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            placeholder="Format"
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
          <input
            value={result}
            onChange={(event) => setResult(event.target.value)}
            placeholder="Result"
            className="min-h-11 rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
          />
        </div>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes"
          className="mt-2 min-h-24 w-full rounded-xl border border-felt-600 bg-felt-800 p-3 text-ivory-100"
        />
        <Button className="mt-3 w-full" onClick={saveEntry} disabled={!eventName.trim() || !result.trim()}>
          Save Competition Entry
        </Button>
      </Card>

      <Card title="Competition History">
        <div className="space-y-2">
          {[...competitionLog]
            .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
            .map((entry) => (
              <div key={entry.id} className="rounded-lg border border-felt-600 bg-felt-800/60 p-3 text-sm">
                <p className="text-ivory-100">{entry.date} · {entry.eventName}</p>
                <p className="text-chalk-300">Format: {entry.format} · Result: {entry.result}</p>
                {entry.notes ? <p className="text-ivory-200">{entry.notes}</p> : null}
              </div>
            ))}
        </div>
      </Card>
    </PageWrapper>
  );
}
