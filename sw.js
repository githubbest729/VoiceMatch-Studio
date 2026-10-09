const CACHE = 'voicematch-v3';
const SHELL = [
  './', 'index.html', 'offline.html', '404.html', 'privacy.html', 'terms.html',
  'css/style.css', 'js/app.js', 'js/sw-register.js', 'manifest.webmanifest',
  'icons/icon-16x16.png', 'icons/icon-32x32.png', 'icons/icon-48x48.png',
  'icons/icon-192x192.png', 'icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Stale-while-revalidate for the app shell.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) return cached;
      const res = await network;
      if (res) return res;
      if (req.mode === 'navigate') return (await cache.match('offline.html')) || Response.error();
      return Response.error();
    })
  );
});
