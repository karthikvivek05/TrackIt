// @ts-nocheck
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

declare const self: any;

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// A2Z sheet - cache-first so the problem list loads offline.
registerRoute(
  ({ url, request }) => url.pathname === '/api/dsa/sheet' && request.method === 'GET',
  new CacheFirst({
    cacheName: 'a2z-sheet',
    plugins: [
      new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// API GETs - network-first with cache fallback.
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
);

// Background Sync - tell open pages to flush the IndexedDB pending queue.
self.addEventListener('sync', (event) => {
  if (event.tag === 'trackit-sync') {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ type: 'TRACKIT_SYNC' }),
          );
        }),
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
