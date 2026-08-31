/* NokLingo: prefix-safe, offline-first service worker.
 *
 * The final static-build step replaces the two tokens below with a content
 * revision and the complete, non-video application shell. Keeping the source
 * file as a template makes cache rotation deterministic without coupling the
 * browser runtime to a server or deployment-specific absolute path.
 */
const PRODUCT_CACHE_VERSION = "noklingo-v4";
const BUILD_REVISION = "eb8337d83af36b29";
const PRECACHE_PATHS = [
  "./",
  "./welcome/",
  "./today/",
  "./study/",
  "./results/",
  "./review/",
  "./library/",
  "./library-2/",
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
  "./lessons/reel-2026-07-25/",
  "./lessons/reel-2026-07-26/",
  "./lessons/reel-2026-07-27/",
  "./lessons/reel-2026-07-28/",
  "./lessons/reel-2026-07-30/",
  "./lessons/reel-2026-08-25/",
  "./lessons/reel-2026-08-27/",
  "./lessons/reel-2026-08-28/",
  "./lessons/reel-2026-08-29/",
  "./lessons/reel-2026-08-30/",
  "./lessons/reel-2026-08-31/",
  "./lessons/time-units/",
  "./lessons/times-of-day/",
  "./lessons/waking-up/",
  "./lessons/weather/",
  "./lessons/what-are-you-doing/",
  "./library-2/affectionate-phrases/",
  "./library-2/coffee-order/",
  "./library-2/common-verbs/",
  "./library-2/compliments/",
  "./library-2/connectors/",
  "./library-2/country-names/",
  "./library-2/directions/",
  "./library-2/encouragement/",
  "./library-2/feeling-unwell/",
  "./library-2/food-allergies/",
  "./library-2/food-flavors/",
  "./library-2/its-okay/",
  "./library-2/large-numbers/",
  "./library-2/making-up/",
  "./library-2/movie-invitation/",
  "./library-2/parting-safely/",
  "./library-2/quantities/",
  "./library-2/question-words/",
  "./library-2/reel-2026-07-25/",
  "./library-2/reel-2026-07-26/",
  "./library-2/reel-2026-07-27/",
  "./library-2/reel-2026-07-28/",
  "./library-2/reel-2026-07-30/",
  "./library-2/reel-2026-08-25/",
  "./library-2/reel-2026-08-27/",
  "./library-2/reel-2026-08-28/",
  "./library-2/reel-2026-08-29/",
  "./library-2/reel-2026-08-30/",
  "./library-2/reel-2026-08-31/",
  "./library-2/time-units/",
  "./library-2/times-of-day/",
  "./library-2/waking-up/",
  "./library-2/weather/",
  "./library-2/what-are-you-doing/",
  "./manifest.webmanifest",
  "./noklingo-logo-black.png",
  "./noklingo-icon-192.png",
  "./noklingo-icon-512.png",
  "./noklingo-apple-touch-icon.png",
  "./lessons/audio/quiz-feedback/correct.mp3",
  "./lessons/audio/quiz-feedback/incorrect.mp3",
  "./lessons/audio/quiz-feedback/perfect.mp3",
  "./_next/static/chunks/AppLink-BKlvC0Yg.js",
  "./_next/static/chunks/CueCardCarousel-bNjpaMSO.js",
  "./_next/static/chunks/LessonExperience-CxbAyQo4.js",
  "./_next/static/chunks/PageHeader-BW8-in7A.js",
  "./_next/static/chunks/PracticeQuiz-7AKUmwZl.js",
  "./_next/static/chunks/_app-Bjx9JBLH.js",
  "./_next/static/chunks/_lessonId_-Cy20W5aK.js",
  "./_next/static/chunks/_lessonId_-DhjybVjx.js",
  "./_next/static/chunks/arrow-right-DCoa1HWN.js",
  "./_next/static/chunks/asset-path-CU_Nx4OU.js",
  "./_next/static/chunks/brain-BQbdAsFk.js",
  "./_next/static/chunks/circle-alert-ChZhWwKV.js",
  "./_next/static/chunks/clock-3-CpuBq3Ny.js",
  "./_next/static/chunks/createLucideIcon-CRYDvHlK.js",
  "./_next/static/chunks/db-_NPh5VZC.js",
  "./_next/static/chunks/filter-props-C_olJvd_.js",
  "./_next/static/chunks/framework-B8V_a_AU.js",
  "./_next/static/chunks/index-B9iTrTc8.js",
  "./_next/static/chunks/layers-CZlTvU2w.js",
  "./_next/static/chunks/library-2--kWyKm6Z.js",
  "./_next/static/chunks/library-AjV2wq0d.js",
  "./_next/static/chunks/play-31j_X6YN.js",
  "./_next/static/chunks/proxy-BH9eZ7t3.js",
  "./_next/static/chunks/results-BtZq1n55.js",
  "./_next/static/chunks/review-BWIkKSY9.js",
  "./_next/static/chunks/rolldown-runtime-B0Z9INg1.js",
  "./_next/static/chunks/rotate-ccw-Dqu4miw9.js",
  "./_next/static/chunks/settings-DLvaMdnP.js",
  "./_next/static/chunks/study-1vK8DjK7.js",
  "./_next/static/chunks/study-store-x_IZ89_A.js",
  "./_next/static/chunks/today-fNCuAy6s.js",
  "./_next/static/chunks/vinext-yQoKx2dr.js",
  "./_next/static/chunks/volume-2-0wR4jiA4.js",
  "./_next/static/chunks/welcome-Ch5wBZYQ.js",
  "./_next/static/chunks/x-CH7HL_BE.js",
  "./_next/static/css/_app.D3MO-EKH.css",
  "./_next/static/d6416a72-12c6-4a91-b28d-11517bf2091d/_buildManifest.js",
  "./_next/static/d6416a72-12c6-4a91-b28d-11517bf2091d/_ssgManifest.js"
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
