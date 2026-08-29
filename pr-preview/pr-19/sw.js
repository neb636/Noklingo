/* NokLingo: prefix-safe, offline-first service worker.
 *
 * The final static-build step replaces the two tokens below with a content
 * revision and the complete, non-video application shell. Keeping the source
 * file as a template makes cache rotation deterministic without coupling the
 * browser runtime to a server or deployment-specific absolute path.
 */
const PRODUCT_CACHE_VERSION = "noklingo-v4";
const BUILD_REVISION = "7e66801820a790e7";
const PRECACHE_PATHS = [
  "./",
  "./welcome/",
  "./today/",
  "./study/",
  "./results/",
  "./library/",
  "./settings/",
  "./lessons/affectionate-phrases/",
  "./lessons/coffee-order/",
  "./lessons/common-verbs/",
  "./lessons/compliments/",
  "./lessons/connectors/",
  "./lessons/country-names/",
  "./lessons/directions/",
  "./lessons/encouragement/",
  "./lessons/feeling-unwell/",
  "./lessons/food-allergies/",
  "./lessons/food-flavors/",
  "./lessons/its-okay/",
  "./lessons/large-numbers/",
  "./lessons/making-up/",
  "./lessons/movie-invitation/",
  "./lessons/parting-safely/",
  "./lessons/quantities/",
  "./lessons/question-words/",
  "./lessons/time-units/",
  "./lessons/times-of-day/",
  "./lessons/waking-up/",
  "./lessons/weather/",
  "./lessons/what-are-you-doing/",
  "./manifest.webmanifest",
  "./noklingo-logo-black.png",
  "./noklingo-icon-192.png",
  "./noklingo-icon-512.png",
  "./noklingo-apple-touch-icon.png",
  "./_next/static/27fb84ea-dde9-4d02-91ee-f39b1698bb17/_buildManifest.js",
  "./_next/static/27fb84ea-dde9-4d02-91ee-f39b1698bb17/_ssgManifest.js",
  "./_next/static/chunks/AppLink-D8AskV78.js",
  "./_next/static/chunks/LessonExperience-gc28SQXE.js",
  "./_next/static/chunks/PageHeader-BW8-in7A.js",
  "./_next/static/chunks/_app-DvOg0xd3.js",
  "./_next/static/chunks/_lessonId_-DQ5Hq3iE.js",
  "./_next/static/chunks/asset-path-CdqsNLqQ.js",
  "./_next/static/chunks/clock-3-CaLVqSN6.js",
  "./_next/static/chunks/createLucideIcon-D-h3xglt.js",
  "./_next/static/chunks/db-Da_Nc79c.js",
  "./_next/static/chunks/filter-props-C_olJvd_.js",
  "./_next/static/chunks/framework-B8V_a_AU.js",
  "./_next/static/chunks/index-XSteNO_4.js",
  "./_next/static/chunks/library-Dw4iq6Qq.js",
  "./_next/static/chunks/play-D0_zdgo6.js",
  "./_next/static/chunks/proxy-BH9eZ7t3.js",
  "./_next/static/chunks/results-BwOJZYRp.js",
  "./_next/static/chunks/rolldown-runtime-B0Z9INg1.js",
  "./_next/static/chunks/rotate-ccw-BzFyGKTm.js",
  "./_next/static/chunks/settings-DIotIlym.js",
  "./_next/static/chunks/study-BGnZdYvF.js",
  "./_next/static/chunks/study-store-BvN-qlOj.js",
  "./_next/static/chunks/today-B0Gm4pRQ.js",
  "./_next/static/chunks/vinext-DTdK61wO.js",
  "./_next/static/chunks/volume-2-BYf2FohE.js",
  "./_next/static/chunks/welcome-fnDHyOJf.js",
  "./_next/static/chunks/x-CwKALzpi.js",
  "./_next/static/css/_app.Dx7_kRFj.css"
];
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
