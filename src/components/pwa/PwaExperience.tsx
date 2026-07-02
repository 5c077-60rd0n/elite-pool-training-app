import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '../ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaExperience() {
  const initializedRef = useRef(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installVisible, setInstallVisible] = useState(false);
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
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) {
          return;
        }
        window.setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      },
    });

    setUpdateServiceWorker(() => update);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallVisible(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setInstallVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
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
      setInstallVisible(false);
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
                setInstallVisible(false);
              }}
            >
              Not now
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
                await updateServiceWorker?.(true);
              }}
            >
              Update now
            </Button>
            <Button variant="secondary" onClick={() => setNeedRefresh(false)}>
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