import { emitTelemetryEvent } from './telemetry';

const PWA_METRICS_KEY = 'fargo-climb-pwa-metrics-v1';

export type PwaMetricEvent =
  | 'install_prompt_shown'
  | 'install_accepted'
  | 'install_dismissed'
  | 'ios_install_tip_shown'
  | 'ios_install_tip_dismissed'
  | 'update_prompt_shown'
  | 'update_applied'
  | 'update_deferred'
  | 'offline_ready_shown';

export interface PwaMetricsSnapshot {
  installPromptShown: number;
  installAccepted: number;
  installDismissed: number;
  iosInstallTipShown: number;
  iosInstallTipDismissed: number;
  updatePromptShown: number;
  updateApplied: number;
  updateDeferred: number;
  offlineReadyShown: number;
  lastEventAt?: string;
  installAcceptanceRatePct: number;
  updateAdoptionRatePct: number;
}

interface PwaMetricStore {
  counters: Record<PwaMetricEvent, number>;
  lastEventAt?: string;
}

const defaultStore = (): PwaMetricStore => ({
  counters: {
    install_prompt_shown: 0,
    install_accepted: 0,
    install_dismissed: 0,
    ios_install_tip_shown: 0,
    ios_install_tip_dismissed: 0,
    update_prompt_shown: 0,
    update_applied: 0,
    update_deferred: 0,
    offline_ready_shown: 0,
  },
  lastEventAt: undefined,
});

function readStore(): PwaMetricStore {
  if (typeof window === 'undefined') return defaultStore();

  try {
    const raw = window.localStorage.getItem(PWA_METRICS_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<PwaMetricStore>;
    return {
      counters: {
        ...defaultStore().counters,
        ...(parsed.counters ?? {}),
      },
      lastEventAt: parsed.lastEventAt,
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(store: PwaMetricStore): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PWA_METRICS_KEY, JSON.stringify(store));
}

export function recordPwaMetric(event: PwaMetricEvent, context?: Record<string, unknown>): void {
  const store = readStore();
  store.counters[event] = (store.counters[event] ?? 0) + 1;
  store.lastEventAt = new Date().toISOString();
  writeStore(store);

  emitTelemetryEvent('pwa_metric_recorded', {
    metric: event,
    metricCount: store.counters[event],
    ...context,
  });
}

function safeRate(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function getPwaMetricsSnapshot(): PwaMetricsSnapshot {
  const store = readStore();
  const counters = store.counters;

  return {
    installPromptShown: counters.install_prompt_shown,
    installAccepted: counters.install_accepted,
    installDismissed: counters.install_dismissed,
    iosInstallTipShown: counters.ios_install_tip_shown,
    iosInstallTipDismissed: counters.ios_install_tip_dismissed,
    updatePromptShown: counters.update_prompt_shown,
    updateApplied: counters.update_applied,
    updateDeferred: counters.update_deferred,
    offlineReadyShown: counters.offline_ready_shown,
    lastEventAt: store.lastEventAt,
    installAcceptanceRatePct: safeRate(counters.install_accepted, counters.install_prompt_shown),
    updateAdoptionRatePct: safeRate(counters.update_applied, counters.update_prompt_shown),
  };
}

export function clearPwaMetrics(): void {
  writeStore(defaultStore());
  emitTelemetryEvent('pwa_metric_cleared');
}
