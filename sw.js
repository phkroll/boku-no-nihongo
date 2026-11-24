// Offline support: network first (always fresh when online), cache as fallback.
// GitHub Pages lets browsers keep files for 10 minutes; 'no-cache' revalidates every request instead.
const CACHE = 'bnn-v6';
const NETWORK_TIMEOUT = 2500;
const FILES = [
  './',
  'index.html',
  'app.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/model/calculated.js',
  'js/model/data.js',
  'js/model/io.js',
  'js/model/migrate.js',
  'js/model/ratings.js',
  'js/model/relations.js',
  'js/model/search.js',
  'js/model/starter.js',
  'js/model/units.js',
  'js/store.js',
  'js/ui/describe.js',
  'js/ui/detail.js',
  'js/ui/dom.js',
  'js/ui/edit.js',
  'js/ui/fields.js',
  'js/ui/kinds.js',
  'js/ui/list.js',
  'js/ui/nav.js',
  'js/ui/picker.js',
  'js/ui/questions.js',
  'js/ui/rate.js',
  'js/ui/relation.js',
  'js/ui/review.js',
  'js/ui/settings.js',
  'js/version.js',
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
  event.respondWith(respond(request));
});

// Network first, but a hanging network (weak signal) falls back to the cache after a timeout.
function respond(request, timeout = NETWORK_TIMEOUT) {
  const network = fetch(request, { cache: 'no-cache' }).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
    }
    return response;
  });
  const cached = () => caches.match(request, { ignoreSearch: true });
  // Network failed (offline): use the cache right away.
  const fallback = network.catch(() => cached().then((hit) => hit ?? Promise.reject(new Error('offline'))));
  // Network too slow: use the cache if there is a copy, else keep waiting.
  const slow = new Promise((resolve) => setTimeout(resolve, timeout)).then(cached).then((hit) => hit ?? fallback);
  return Promise.race([fallback, slow]);
}
