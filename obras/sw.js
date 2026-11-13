// Obras NORTEA · guarda la app para abrir sin señal. Los datos no pasan por aquí (van a la hoja de Google).
const V = "obras-b4924f7eae";
const APP = ["/obras/", "/obras/manifest.webmanifest", "/assets/img/marca/icon-192.png", "/assets/img/marca/apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(APP)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;           // la hoja de Google y las fuentes, directo
  if (!u.pathname.startsWith("/obras/") || /\.(webp|jpg|png)$/.test(u.pathname) && !APP.includes(u.pathname)) return;  // fotos del portafolio: no se tocan
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(V).then((k) => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match("/obras/"))));
});
