const STATIC_CACHE = "chronosync-static-v1";
const PAGE_CACHE = "chronosync-pages-v1";
const API_CACHE = "chronosync-api-v1";
const STATIC_PATHS = ["/", "/dashboard", "/plan", "/tracking", "/education", "/settings"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.addAll(STATIC_PATHS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (![STATIC_CACHE, PAGE_CACHE, API_CACHE].includes(key)) {
              return caches.delete(key);
            }
            return Promise.resolve();
          }),
        ),
      ),
  );
  self.clients.claim();
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cache.match(request);
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || networkPromise;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.includes("/api/v1/plans/") || url.pathname.includes("/api/v1/tracking/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (
    ["/", "/dashboard", "/plan", "/tracking", "/education", "/settings"].some((path) =>
      url.pathname.startsWith(path),
    )
  ) {
    event.respondWith(staleWhileRevalidate(request, PAGE_CACHE));
  }
});
