const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(input: string): string | null {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  const parsed = Date.parse(input);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function shiftDateKeyUtc(dateKey: string, dayOffset: number): string {
  const ts = Date.parse(`${dateKey}T00:00:00Z`) + dayOffset * DAY_MS;
  return new Date(ts).toISOString().slice(0, 10);
}

export function getTrainingStreak(logDates: string[], now = new Date()): number {
  if (!logDates.length) return 0;

  const dateSet = new Set<string>();
  logDates.forEach((value) => {
    const key = toDateKey(value);
    if (key) dateSet.add(key);
  });

  if (!dateSet.size) return 0;

  const today = now.toISOString().slice(0, 10);
  const yesterday = shiftDateKeyUtc(today, -1);

  let cursor: string | null = null;
  if (dateSet.has(today)) {
    cursor = today;
  } else if (dateSet.has(yesterday)) {
    cursor = yesterday;
  }

  if (!cursor) return 0;

  let streak = 0;
  while (cursor && dateSet.has(cursor)) {
    streak += 1;
    cursor = shiftDateKeyUtc(cursor, -1);
  }

  return streak;
}
