// Service Worker מינימלי - קיים כדי לענות על קריטריון ההתקנה של Chrome
// (דורש service worker רשום עם fetch handler). אין caching/עבודה אופליין
// בכוונה - data/news.json חייב תמיד להיות טרי, לא cached.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
