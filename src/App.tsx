import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import AppRouter from './router/AppRouter';
import { useTrackerStore } from './store/useTrackerStore';
import { installAudioUnlockListeners } from './utils/mobileAudio';

const PwaExperience = lazy(() => import('./components/pwa/PwaExperience').then((module) => ({ default: module.PwaExperience })));

function App() {
  const flushSyncQueue = useTrackerStore((s) => s.flushSyncQueue);
  const [showPwaExperience, setShowPwaExperience] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncIfOnline = () => {
      if (navigator.onLine) {
        flushSyncQueue();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncIfOnline();
      }
    };

    const intervalId = window.setInterval(syncIfOnline, 5 * 60 * 1000);
    window.addEventListener('online', syncIfOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);
    syncIfOnline();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', syncIfOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [flushSyncQueue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const activate = () => setShowPwaExperience(true);
    const idleAwareWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleAwareWindow.requestIdleCallback && idleAwareWindow.cancelIdleCallback) {
      const idleId = idleAwareWindow.requestIdleCallback(activate, { timeout: 2500 });
      return () => idleAwareWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = globalThis.setTimeout(activate, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  useEffect(() => installAudioUnlockListeners(), []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-felt-900 text-ivory-100 selection:bg-cue-500/30">
        <Header />
        <AppRouter />
        <BottomNav />
        {showPwaExperience ? (
          <Suspense fallback={null}>
            <PwaExperience />
          </Suspense>
        ) : null}
      </div>
    </BrowserRouter>
  );
}

export default App;
