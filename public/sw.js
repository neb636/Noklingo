/* NokLingo: prefix-safe, offline-first service worker.
 *
 * The final static-build step replaces the two tokens below with a content
 * revision and the complete, non-video application shell. Keeping the source
 * file as a template makes cache rotation deterministic without coupling the
 * browser runtime to a server or deployment-specific absolute path.
 */
const PRODUCT_CACHE_VERSION = "noklingo-v4";
const BUILD_REVISION = "__NOKLINGO_BUILD_REVISION__";
const PRECACHE_PATHS = /* __NOKLINGO_PRECACHE_PATHS__ */ [];
const scopeUrl = new URL(self.registration.scope);
const scopePath = scopeUrl.pathname.endsWith("/") ? scopeUrl.pathname : `${scopeUrl.pathname}/`;
const scopeCacheKey = scopePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z\d._-]+/gi, "-") || "root";
const CACHE_NAMESPACE = `${PRODUCT_CACHE_VERSION}-${scopeCacheKey}`;
const SHELL_CACHE = `${CACHE_NAMESPACE}-${BUILD_REVISION}-shell`;
const ASSET_CACHE = `${CACHE_NAMESPACE}-${BUILD_REVISION}-assets`;
const CURRENT_CACHES = new Set([SHELL_CACHE, ASSET_CACHE]);
const LEGACY_CACHE_PREFIXES = ["noklingo-thai-study-v3-", "thai-study-v2-"];
const precacheUrls = PRECACHE_PATHS.map((path) => new URL(path, scopeUrl).href);
const precacheUrlSet = new Set(precacheUrls);

function ownsCache(cacheName) {
  return cacheName.startsWith(`${CACHE_NAMESPACE}-`)
    || LEGACY_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix));
}

function isWithinScope(url) {
  return url.origin === scopeUrl.origin && url.pathname.startsWith(scopePath);
}

function isCacheableResponse(response) {
  return response.ok && response.status === 200 && !response.headers.has("Content-Range");
}

function isSafeCompleteAsset(request, url) {
  const safeDestination = ["script", "style", "font", "image", "track", "audio"].includes(request.destination);
  const safeExtension = /\.(?:css|js|mjs|json|webmanifest|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|otf|vtt|m4a|mp3|aac|ogg|wav)$/i.test(url.pathname);
  return safeDestination || safeExtension;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(precacheUrls.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => ownsCache(key) && !CURRENT_CACHES.has(key)).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!isWithinScope(url)) return;

  // Partial responses and video are deliberately network-only. A byte range
  // must never be mistaken for a complete asset, and MP4s are not prefetched.
  const isVideo = url.pathname.toLowerCase().endsWith(".mp4") || request.destination === "video";
  if (request.headers.has("range") || isVideo) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheableResponse(response)) {
            const copy = response.clone();
            void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const shellCache = await caches.open(SHELL_CACHE);
          const cached = await shellCache.match(request, { ignoreSearch: true });
          if (cached) return cached;
          const fallback = await shellCache.match(new URL("./today/", scopeUrl));
          return fallback || new Response(
            "NokLingo is offline. Open the app once while connected to finish installation.",
            { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
          );
        }),
    );
    return;
  }

  if (!isSafeCompleteAsset(request, url)) return;

  event.respondWith(
    caches.open(precacheUrlSet.has(url.href) ? SHELL_CACHE : ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (isCacheableResponse(response)) void cache.put(request, response.clone());
      return response;
    }),
  );
});
