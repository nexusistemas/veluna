// Service Worker minimalista pass-through (sem cache de bundles ou APIs)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Pass-through intencional: evita cache viciado em deploys novos
});
