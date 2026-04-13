// Minimal service worker for PWA installability.
// No caching strategy — just enough to satisfy the install criteria.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass through — let the network handle everything.
  // Caching can be added later as an optimization.
});
