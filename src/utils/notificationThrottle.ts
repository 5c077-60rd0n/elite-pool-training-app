const DAY_MS = 24 * 60 * 60 * 1000;

export function pruneRecentAlertHistory(history: string[], now = new Date()): string[] {
  const nowMs = now.getTime();
  return history
    .filter((value) => {
      const parsed = Date.parse(value);
      return !Number.isNaN(parsed) && nowMs - parsed <= 72 * 60 * 60 * 1000;
    })
    .sort((a, b) => Date.parse(a) - Date.parse(b));
}

export function shouldPauseSmartAlerts(history: string[], now = new Date()): boolean {
  return pruneRecentAlertHistory(history, now).length >= 3;
}

export function buildPauseUntilIso(now = new Date()): string {
  return new Date(now.getTime() + 2 * DAY_MS).toISOString();
}

export function isPaused(pausedUntilIso: string | undefined, now = new Date()): boolean {
  if (!pausedUntilIso) return false;
  const pausedUntil = Date.parse(pausedUntilIso);
  if (Number.isNaN(pausedUntil)) return false;
  return pausedUntil > now.getTime();
}
