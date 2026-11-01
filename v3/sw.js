// Kirakai a déménagé sur https://nexus44567.github.io/KirakaiTCG/.
// Ce service worker remplace l'ancien chez ceux qui l'avaient : il efface ses caches (préfixés « nexus3- »,
// jamais ceux de la V2), se retire, puis recharge les pages ouvertes, qui affichent alors la redirection.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('nexus3-')) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url).catch(() => {});
  })());
});
