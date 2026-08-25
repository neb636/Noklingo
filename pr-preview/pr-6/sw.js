/* Thai Study: prefix-safe, offline-first service worker.
 *
 * The final static-build step replaces the two tokens below with a content
 * revision and the complete, non-video application shell. Keeping the source
 * file as a template makes cache rotation deterministic without coupling the
 * browser runtime to a server or deployment-specific absolute path.
 */
const PRODUCT_CACHE_VERSION = "noklingo-thai-study-v3";
const BUILD_REVISION = "32764b14bd10c98a";
const PRECACHE_PATHS = [
  "./",
  "./today/",
  "./study/",
  "./results/",
  "./library/",
  "./progress/",
  "./settings/",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./_next/static/79f4b674-71c7-4dff-a682-a38e1ae2b0eb/_buildManifest.js",
  "./_next/static/79f4b674-71c7-4dff-a682-a38e1ae2b0eb/_ssgManifest.js",
  "./_next/static/chunks/AppLink-DHpk68U9.js",
  "./_next/static/chunks/PageHeader-BW8-in7A.js",
  "./_next/static/chunks/_app-XpNovuym.js",
  "./_next/static/chunks/arrow-right-CAgaP94N.js",
  "./_next/static/chunks/book-open-DsBdV4I3.js",
  "./_next/static/chunks/check-DTDBFGp4.js",
  "./_next/static/chunks/circle-check-Dn6xbuon.js",
  "./_next/static/chunks/clock-3-CyLNhyzI.js",
  "./_next/static/chunks/db-C0Z_DZ82.js",
  "./_next/static/chunks/filter-props-C_olJvd_.js",
  "./_next/static/chunks/framework-B8V_a_AU.js",
  "./_next/static/chunks/index-DtwfmITu.js",
  "./_next/static/chunks/languages-D3zQs7Gq.js",
  "./_next/static/chunks/library-GAqlvUrt.js",
  "./_next/static/chunks/play-DDzYoKuS.js",
  "./_next/static/chunks/progress-pB0g33-L.js",
  "./_next/static/chunks/results-D8uwidzH.js",
  "./_next/static/chunks/rolldown-runtime-B0Z9INg1.js",
  "./_next/static/chunks/rotate-ccw-CTRqIARU.js",
  "./_next/static/chunks/settings-CApvQDD-.js",
  "./_next/static/chunks/study-BK5NoCpZ.js",
  "./_next/static/chunks/study-store-BEGW78t7.js",
  "./_next/static/chunks/today-DMBOaCpV.js",
  "./_next/static/chunks/use-client-ready-D6kivG7q.js",
  "./_next/static/chunks/vinext-DTdK61wO.js",
  "./_next/static/chunks/volume-2-6YnX2U3c.js",
  "./_next/static/css/_app.C35g3vN_.css"
];
const scopeUrl = new URL(self.registration.scope);
const scopePath = scopeUrl.pathname.endsWith("/") ? scopeUrl.pathname : `${scopeUrl.pathname}/`;
const scopeCacheKey = scopePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z\d._-]+/gi, "-") || "root";
const CACHE_NAMESPACE = `${PRODUCT_CACHE_VERSION}-${scopeCacheKey}`;
const SHELL_CACHE = `${CACHE_NAMESPACE}-${BUILD_REVISION}-shell`;
const ASSET_CACHE = `${CACHE_NAMESPACE}-${BUILD_REVISION}-assets`;
const CURRENT_CACHES = new Set([SHELL_CACHE, ASSET_CACHE]);
const LEGACY_CACHES = new Set(["thai-study-v2-shell", "thai-study-v2-assets"]);
const precacheUrls = PRECACHE_PATHS.map((path) => new URL(path, scopeUrl).href);
const precacheUrlSet = new Set(precacheUrls);

function ownsCache(cacheName) {
  return cacheName.startsWith(`${CACHE_NAMESPACE}-`) || LEGACY_CACHES.has(cacheName);
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
            "Thai Study is offline. Open the app once while connected to finish installation.",
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
