// Service worker de NEXUS V3 (portée /nexus-tcg/v3/) : ouverture instantanée après la première visite,
// consultation hors ligne avec les derniers prix connus. Les prix sont toujours redemandés au réseau d'abord.
// Les caches sont préfixés « nexus3- » pour ne jamais toucher à ceux de la V2.
const VERSION = '60687afb81';
const STATIC = 'nexus3-static-' + VERSION;
const DATA = 'nexus3-data-v1';
const IMAGES = 'nexus3-images-v1';
const MAX_IMAGES = 1200;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon.svg'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('nexus3-static-') && k !== STATIC) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

async function networkFirst(req, cacheName, timeout = 6000) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
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

const SCOPE = new URL('./', self.location).pathname;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (same && req.mode === 'navigate' && url.pathname.startsWith(SCOPE)) { e.respondWith(networkFirst(new Request('index.html'), STATIC, 4000).catch(() => caches.match('index.html'))); return; }
  if (same && url.pathname.startsWith(SCOPE + 'assets/')) { e.respondWith(cacheFirst(req, STATIC)); return; }
  if (same && /\/(img|db\/packs)\/|\.(svg|png|jpg|webmanifest)$/.test(url.pathname)) { e.respondWith(cacheFirst(req, STATIC)); return; }
  if (same && /\/db\//.test(url.pathname)) { e.respondWith(networkFirst(req, DATA)); return; }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { e.respondWith(cacheFirst(req, STATIC)); return; }
  if (req.destination === 'image') { e.respondWith(cacheFirst(req, IMAGES, MAX_IMAGES).catch(() => fetch(req))); return; }
});
