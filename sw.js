// Offline support: network first (always fresh when online), cache as fallback.
const CACHE = 'bnn-v1';
const FILES = [
  './',
  'index.html',
  'app.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/model.js',
  'js/store.js',
  'js/ui/detail.js',
  'js/ui/dom.js',
  'js/ui/form.js',
  'js/ui/link-picker.js',
  'js/ui/list.js',
  'js/ui/settings.js',
  'icons/icon-180.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
