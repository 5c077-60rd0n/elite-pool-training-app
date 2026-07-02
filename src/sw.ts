/* eslint-disable no-restricted-globals */
/// <reference lib="WebWorker" />

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event: PushEvent) => {
  const title = 'Fargo Climb Reminder';
  const body = event.data?.text() ?? 'Your one-hour training window is ready.';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/pwa-192.svg',
      badge: '/icons/pwa-192.svg',
    }),
  );
});

export {};
