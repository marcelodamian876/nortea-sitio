// Finanzas · guarda la app para abrir sin señal. Los datos no pasan por aquí (van a la hoja de Google).
const V = "finanzas-ffb3f2f1a6";
const APP = ["/finanzas/", "/finanzas/manifest.webmanifest", "/finanzas/icon-192.png", "/finanzas/apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(APP)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;            // la hoja de Google y las fuentes van directo
  const nav = e.request.mode === "navigate" && u.pathname.startsWith("/finanzas/");
  if (!nav && !APP.includes(u.pathname)) return;                                      // lo demás del sitio no se toca
  const clave = nav ? "/finanzas/" : u.pathname;
  // primero lo guardado (abre al instante y sin señal); por detrás baja la versión nueva para la siguiente vez
  const red = fetch(e.request).then((r) => r && r.ok ? caches.open(V).then((c) => c.put(clave, r.clone())).then(() => r) : r).catch(() => null);
  e.waitUntil(red.then(() => {}));
  e.respondWith(caches.match(clave).then((g) => g || red.then((r) => r || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }))));
});
