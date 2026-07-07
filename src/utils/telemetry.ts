export interface TelemetryEventPayload {
  event: string;
  context?: Record<string, unknown>;
  at: string;
}

export function emitTelemetryEvent(event: string, context?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const detail: TelemetryEventPayload = {
    event,
    context,
    at: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent<TelemetryEventPayload>('elite-telemetry', { detail }));
}
