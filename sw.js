// Service worker de NEXUS TCG : le site s'ouvre instantanément après la première visite et reste
// consultable hors ligne (derniers prix connus). Les prix sont toujours redemandés au réseau d'abord.
const VERSION = '59ee066640';
const STATIC = 'nexus-static-' + VERSION;   // fichiers du site (versionnés)
const DATA = 'nexus-data-v1';               // catalogues et prix (réseau d'abord)
const IMAGES = 'nexus-images-v1';           // images des cartes (cache d'abord)
const MAX_IMAGES = 900;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'favicon.svg'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('nexus-static-') && k !== STATIC) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

// Réseau d'abord, avec repli sur le cache (et délai max pour ne pas bloquer sur un réseau lent si on a déjà une copie)
async function networkFirst(req, cacheName, timeout = 6000) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreSearch: false });
  const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; });
  if (!cached) return net;
  return Promise.race([net.catch(() => cached), new Promise((r) => setTimeout(() => r(cached), timeout))]);
}

async function cacheFirst(req, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); if (max) trim(cacheName, max); }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (same && req.mode === 'navigate') { e.respondWith(networkFirst(new Request('index.html'), STATIC, 4000).catch(() => caches.match('index.html'))); return; }
  if (same && /\/assets\/|\/img\/|\/db\/packs\/|\.(svg|png|webmanifest)$/.test(url.pathname)) { e.respondWith(cacheFirst(req, STATIC)); return; }
  if (same && /\/db\//.test(url.pathname)) { e.respondWith(networkFirst(req, DATA)); return; }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { e.respondWith(cacheFirst(req, STATIC)); return; }
  if (req.destination === 'image') { e.respondWith(cacheFirst(req, IMAGES, MAX_IMAGES).catch(() => fetch(req))); return; }
});
