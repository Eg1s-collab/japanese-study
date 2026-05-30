/* Service worker for offline use + installability.
 *
 * Strategy:
 *   • navigations (the HTML doc): network-first, fall back to cached shell
 *     so a new deploy's index.html (with fresh ?v= asset URLs) is preferred
 *     when online, but the app still opens offline.
 *   • same-origin static assets (css/js/png/csv/json): stale-while-revalidate
 *     — serve from cache instantly, refresh the cache in the background.
 *
 * IMPORTANT: cross-origin requests are never intercepted. Firebase Auth and
 * Firestore (gstatic.com / *.googleapis.com / *.firebaseapp.com) must reach
 * the network untouched, or cloud sync breaks. We only ever call
 * respondWith() for same-origin GETs.
 */
const CACHE = "nihongo-v20260530e";
const SHELL = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle our own origin — let Firebase/CDN traffic go straight to net.
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
