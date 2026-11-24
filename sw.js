// Offline-first: the app always runs from one complete, consistent copy of its files.
// A new version is downloaded in full in the background (bypassing the browser cache);
// only if every file arrives does it replace the old copy — any error keeps the old one.
const BUILD = '4ca05e108c73';
const CACHE = `bnn-${BUILD}`;
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
  'js/model/split.js',
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
  'js/ui/report.js',
  'js/ui/review.js',
  'js/ui/settings.js',
  'js/version.js',
  'icons/icon-180.png',
  'icons/icon-512.png',
];

function precache() {
  return caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function respond(request) {
  return caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(respond(request));
});
