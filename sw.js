// Offline support. Network first (so updates show up right away), falling back
// to the cache when offline. Every app on nssharpe.github.io shares this origin,
// so only caches with our own prefix are ever touched.

const PREFIX = 'mamou-fr-';
const CACHE = PREFIX + 'v1';
const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'js/answer.js',
  'js/app.js',
  'js/art.js',
  'js/audio.js',
  'js/data.js',
  'js/fx.js',
  'js/games/escargot.js',
  'js/games/memory.js',
  'js/games/speed.js',
  'js/main.js',
  'js/progress.js',
  'js/screens/carnet.js',
  'js/screens/classement.js',
  'js/screens/common.js',
  'js/screens/dashboard.js',
  'js/screens/duel.js',
  'js/screens/games.js',
  'js/screens/home.js',
  'js/screens/settings.js',
  'js/screens/shop.js',
  'js/screens/study.js',
  'js/screens/tour.js',
  'js/screens/trophies.js',
  'js/session.js',
  'js/srs.js',
  'js/store.js',
  'js/ui.js',
  'js/util.js',
  'js/words.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const ours = url.origin === location.origin && url.pathname.startsWith(new URL('./', self.registration.scope).pathname);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!ours && !fonts) return;
  // Always revalidate our own files (cheap 304s) so a fresh deploy never mixes
  // new modules with stale ones from the HTTP cache.
  const net = ours && req.mode !== 'navigate' ? fetch(req, { cache: 'no-cache' }) : fetch(req);
  event.respondWith(
    net
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))),
  );
});
