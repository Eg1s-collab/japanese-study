/* Service worker for offline use + installability.
 *
 * Strategy:
 *   • navigations (the HTML doc): network-first, fall back to cached shell
 *     so a new deploy's index.html (with fresh ?v= asset URLs) is preferred
 *     when online, but the app still opens offline. Only 200 responses are
 *     cached (never cache an error page as the shell).
 *   • same-origin static assets (css/js/png/csv/json): stale-while-revalidate
 *     — serve from cache instantly, refresh the cache in the background.
 *     If an asset isn't cached yet (e.g. a freshly-bumped ?v=) and the network
 *     returns a 404/error during a mid-deploy propagation window, fall back to
 *     ANY previously-cached version of the same path (ignoreSearch) instead of
 *     serving the 404. This keeps the page from rendering unstyled/broken while
 *     a deploy is still propagating; the next load picks up the new file.
 *
 * IMPORTANT: cross-origin requests are never intercepted. Firebase Auth and
 * Firestore (gstatic.com / *.googleapis.com / *.firebaseapp.com) must reach
 * the network untouched, or cloud sync breaks. We only ever call
 * respondWith() for same-origin GETs.
 */
const CACHE = "nihongo-v20260619a";
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
          // only cache a healthy shell — never persist a 404/error page
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // stale-while-revalidate: serve cache now, refresh in the background
        e.waitUntil(refresh(req));
        return cached;
      }
      // not cached (likely a freshly-bumped ?v=) — fetch, but tolerate a
      // 404/error during deploy propagation by falling back to a cached sibling
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }
          return caches.match(req, { ignoreSearch: true }).then((alt) => alt || res);
        })
        .catch(() => caches.match(req, { ignoreSearch: true }));
    })
  );
});

/* background cache refresh for a request (fire-and-forget, errors ignored) */
function refresh(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.status === 200 && res.type === "basic") {
        return caches.open(CACHE).then((c) => c.put(req, res.clone()));
      }
    })
    .catch(() => {});
}
