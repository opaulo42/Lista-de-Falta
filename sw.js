// Versão do cache. Aumente (v6, v7...) a cada atualização do index.html.
const C = 'chamada-v6';
const F = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

// Instala baixando sempre a versão mais nova do servidor (ignora o cache do navegador).
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(C)
      .then(c => Promise.all(F.map(u =>
        fetch(new Request(u, {cache: 'reload'})).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

// Com internet: pega sempre o arquivo mais novo e atualiza o cache.
// Sem internet (ou rede lenta, mais de 4 s): usa a cópia guardada.
self.addEventListener('fetch', e => {
  const q = e.request;
  if (q.method !== 'GET' || new URL(q.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(C);
    try {
      const net = await Promise.race([
        fetch(q.url, {cache: 'no-cache'}),
        new Promise((_, rej) => setTimeout(rej, 4000))
      ]);
      if (net && net.ok) c.put(q, net.clone());
      return net;
    } catch (err) {
      const m = (await c.match(q, {ignoreSearch: true})) || (await c.match('./index.html'));
      return m || Response.error();
    }
  })());
});
