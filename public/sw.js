const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const scopedPath = (path) => `${scopePath}${path}`;
const CACHE_SCOPE_KEY = `:${scopePath || "/"}`;
const CACHE_VERSION = `noklingo-shell-v3${CACHE_SCOPE_KEY}`;
const VIDEO_PATH = /\.(?:mp4|m4v|mov|webm)$/i;
const CORE = [
  scopedPath("/"),
  scopedPath("/manifest.webmanifest"),
  scopedPath("/apple-touch-icon.png"),
  scopedPath("/icon-32.png"),
  scopedPath("/icon-192.png"),
  scopedPath("/icon-512.png"),
];

const isInScope = (url) =>
  url.origin === self.location.origin &&
  (!scopePath ||
    url.pathname === scopePath ||
    url.pathname.startsWith(`${scopePath}/`));

const isVideoRequest = (request, url) =>
  request.destination === "video" || VIDEO_PATH.test(url.pathname);

const isCompleteCacheableResponse = (response) =>
  response.status === 200 &&
  response.type !== "opaque" &&
  !response.headers.has("Content-Range");

const prefetchableUrls = (urls) => {
  const resolved = new Set();

  for (const value of urls) {
    try {
      const url = new URL(value, self.registration.scope);
      if (isInScope(url) && !VIDEO_PATH.test(url.pathname)) {
        resolved.add(url.href);
      }
    } catch {
      // Ignore malformed client-supplied URLs.
    }
  }

  return [...resolved];
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("noklingo-") &&
                key.endsWith(CACHE_SCOPE_KEY) &&
                key !== CACHE_VERSION,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_URLS" && Array.isArray(event.data.urls)) {
    const urls = prefetchableUrls(event.data.urls);

    event.waitUntil(
      caches.open(CACHE_VERSION).then((cache) =>
        Promise.allSettled(
          urls.map(async (url) => {
            const request = new Request(url, { credentials: "same-origin" });
            const response = await fetch(request);
            if (isCompleteCacheableResponse(response)) {
              await cache.put(request, response);
            }
          }),
        ),
      ),
    );
  }

  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (!isInScope(url)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);

        try {
          const response = await fetch(event.request);
          if (isCompleteCacheableResponse(response)) {
            await cache.put(scopedPath("/"), response.clone());
          }
          return response;
        } catch {
          return (await cache.match(scopedPath("/"))) || Response.error();
        }
      })(),
    );
    return;
  }

  // Native media playback depends on byte ranges. Let the browser and host own
  // video and every Range request so a cached 200/206 response is never served as
  // the wrong representation. MP4s are intentionally not runtime-cached.
  if (
    event.request.headers.has("Range") ||
    isVideoRequest(event.request, url)
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (isCompleteCacheableResponse(response)) {
        await cache.put(event.request, response.clone());
      }
      return response;
    })(),
  );
});
