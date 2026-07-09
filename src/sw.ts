/* eslint-disable no-restricted-globals */
/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const appShellRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'app-pages-v1',
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
  {
    denylist: [/^\/api\//, /^\/demo\//, /^\/catalogs\//, /\/[^/?]+\.[^/]+$/],
  },
);

registerRoute(appShellRoute);

setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    const fallback = await matchPrecache('/offline.html');
    if (fallback) {
      return fallback;
    }
  }
  return Response.error();
});

registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
  new StaleWhileRevalidate({
    cacheName: 'static-resources-v1',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

registerRoute(
  ({ request, sameOrigin, url }) =>
    request.method === 'GET' &&
    sameOrigin &&
    request.destination === '' &&
    request.headers.get('accept')?.includes('application/json') === true &&
    (url.pathname.startsWith('/demo/') || url.pathname.startsWith('/catalogs/')),
  new StaleWhileRevalidate({
    cacheName: 'training-data-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

self.addEventListener('push', (event: PushEvent) => {
  const title = 'Fargo Climb Reminder';
  const body = event.data?.text() ?? 'Your one-hour training window is ready.';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png',
      data: {
        url: '/session/today',
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = String(event.notification.data?.url ?? '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        const windowClient = client as WindowClient;
        if ('focus' in windowClient) {
          if (windowClient.url.includes(self.location.origin)) {
            void windowClient.navigate(destination);
          }
          return windowClient.focus();
        }
      }
      return self.clients.openWindow(destination);
    }),
  );
});

export {};
