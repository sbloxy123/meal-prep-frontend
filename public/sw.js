// Minimal offline shell cache (§8.5). Caches the app shell + Next static assets
// + the last generated-list response, so the app opens with no connection in
// the supermarket. It deliberately does NOT cache other API responses, and it
// does NOT use Background Sync — the localStorage write queue handles offline
// writes (Safari lacks Background Sync).
const CACHE = "mise-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) (await caches.open(CACHE)).put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(CACHE)).put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return; // never intercept writes
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // same-origin only (not Cloudinary/Anthropic)

  // App shell: navigations fall back to a cached page when offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Immutable build assets + icons + manifest.
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // The one permitted API cache: the last generated aisle list, so shopping
  // mode opens offline.
  if (url.pathname === "/backend/generated-shopping-list") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else (auth, other data API) goes straight to the network.
});
