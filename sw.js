/* AprendoLibre — service worker v13
   Estrategia: red primero para HTML, caché primero para assets.
   NO hace skipWaiting automático: espera a que el frontend lo autorice
   para no interrumpir un examen en curso. */
const CACHE = 'aprendolibre-v13';
const ASSETS = ['manifest.json', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  // Precachea assets pero NO llama a skipWaiting: el SW queda en espera.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// El frontend manda el mensaje 'SKIP_WAITING' cuando no hay examen en curso.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;

  // HTML: red primero para tener siempre la última versión; caché si no hay red.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Assets: caché primero.
  e.respondWith(caches.match(req).then(c => c || fetch(req)));
});
