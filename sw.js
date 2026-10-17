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
  // וידאו (סרטון ההיכרות) נשלח ישירות לרשת בלי ה-SW - בקשות Range של
  // נגן הווידאו לא תמיד עוברות תקין דרך respondWith (בעיקר בספארי).
  if (event.request.destination === 'video') return;
  event.respondWith(fetch(event.request));
});
