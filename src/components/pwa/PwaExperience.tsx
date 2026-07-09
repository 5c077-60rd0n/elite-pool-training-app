import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '../ui/Button';
import { recordPwaMetric } from '../../utils/pwaMetrics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALL_DISMISS_KEY = 'fargo-climb-install-dismissed-at';
const INSTALL_DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;

function hasDismissCooldownActive(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(INSTALL_DISMISS_KEY);
  if (!raw) return false;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < INSTALL_DISMISS_COOLDOWN_MS;
}

function markInstallDismissed(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INSTALL_DISMISS_KEY, `${Date.now()}`);
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaExperience() {
  const initializedRef = useRef(false);
  const updateIntervalRef = useRef<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [showIosInstallTip, setShowIosInstallTip] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        recordPwaMetric('update_prompt_shown');
        setNeedRefresh(true);
      },
      onOfflineReady() {
        recordPwaMetric('offline_ready_shown');
        setOfflineReady(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) {
          return;
        }
        if (updateIntervalRef.current) {
          window.clearInterval(updateIntervalRef.current);
        }
        updateIntervalRef.current = window.setInterval(() => {
          if (navigator.onLine) {
            void registration.update();
          }
        }, 45 * 60 * 1000);
      },
    });

    setUpdateServiceWorker(() => update);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      recordPwaMetric('install_prompt_shown');
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallVisible(true);
    };

    const onAppInstalled = () => {
      recordPwaMetric('install_accepted', { via: 'appinstalled-event' });
      setDeferredPrompt(null);
      setInstallVisible(false);
      setShowIosInstallTip(false);
    };

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const standalone = isStandaloneMode();
    if (isIos && !standalone && !hasDismissCooldownActive()) {
      recordPwaMetric('ios_install_tip_shown');
      setShowIosInstallTip(true);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      if (updateIntervalRef.current) {
        window.clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      return;
    }
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    if (result.outcome === 'accepted') {
      recordPwaMetric('install_accepted', { via: 'prompt-choice' });
      setInstallVisible(false);
      setDeferredPrompt(null);
    } else {
      recordPwaMetric('install_dismissed', { via: 'prompt-choice' });
      markInstallDismissed();
    }
  };

  return (
    <>
      {installVisible ? (
        <div
          className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-felt-500 bg-felt-700/95 p-3 shadow-2xl backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-ivory-100">Install Fargo Climb for fast access and full-screen training.</p>
          <div className="mt-2 flex gap-2">
            <Button onClick={installApp}>Install App</Button>
            <Button
              variant="secondary"
              onClick={() => {
                recordPwaMetric('install_dismissed', { via: 'not-now-button' });
                markInstallDismissed();
                setInstallVisible(false);
              }}
            >
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      {showIosInstallTip ? (
        <div
          className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-felt-500 bg-felt-700/95 p-3 shadow-2xl backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-ivory-100">Install on iPhone or iPad: tap Share, then Add to Home Screen.</p>
          <div className="mt-2">
            <Button
              variant="secondary"
              onClick={() => {
                recordPwaMetric('ios_install_tip_dismissed');
                markInstallDismissed();
                setShowIosInstallTip(false);
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {needRefresh ? (
        <div
          className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-cue-500 bg-felt-700/95 p-3 shadow-2xl backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-ivory-100">A new version is available.</p>
          <div className="mt-2 flex gap-2">
            <Button
              onClick={async () => {
                recordPwaMetric('update_applied');
                await updateServiceWorker?.(true);
              }}
            >
              Update now
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                recordPwaMetric('update_deferred');
                setNeedRefresh(false);
              }}
            >
              Later
            </Button>
          </div>
        </div>
      ) : null}

      {offlineReady ? (
        <div
          className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-felt-500 bg-felt-700/95 p-3 shadow-2xl backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-ivory-100">Offline mode is ready. Training sessions will keep working without internet.</p>
          <div className="mt-2">
            <Button variant="secondary" onClick={() => setOfflineReady(false)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}