// Retire the legacy cache-first/offline-sync worker at its original URL.
// Keeping this file lets previously installed copies receive a safe update.
// Clinical/financial writes must not be queued against nonexistent HTTP APIs.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('medicare-plus-')).map(name => caches.delete(name)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
