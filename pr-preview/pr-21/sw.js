/* NokLingo: prefix-safe, offline-first service worker.
 *
 * The final static-build step replaces the two tokens below with a content
 * revision and the complete, non-video application shell. Keeping the source
 * file as a template makes cache rotation deterministic without coupling the
 * browser runtime to a server or deployment-specific absolute path.
 */
const PRODUCT_CACHE_VERSION = "noklingo-v4";
const BUILD_REVISION = "cb8d93978ff3f576";
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
  "./lessons/time-units/",
  "./lessons/times-of-day/",
  "./lessons/waking-up/",
  "./lessons/weather/",
  "./lessons/what-are-you-doing/",
  "./library-2/affectionate-phrases/",
  "./library-2/coffee-order/",
  "./library-2/common-verbs/",
  "./library-2/compliments/",
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
  "./_next/static/chunks/AppLink-BG-_6kO0.js",
  "./_next/static/chunks/CueCardCarousel-BbyVdUZO.js",
  "./_next/static/chunks/LessonExperience-CX0G9mCe.js",
  "./_next/static/chunks/PageHeader-BW8-in7A.js",
  "./_next/static/chunks/PracticeQuiz-CQdm6y0y.js",
  "./_next/static/chunks/_app-CXOIt0SM.js",
  "./_next/static/chunks/_lessonId_-DHjAhxgx.js",
  "./_next/static/chunks/_lessonId_-MpJbw9AI.js",
  "./_next/static/chunks/arrow-right-BU-VjAiQ.js",
  "./_next/static/chunks/asset-path-CN-jiMmN.js",
  "./_next/static/chunks/brain-Viq8Z-xB.js",
  "./_next/static/chunks/circle-alert-RmoyocO9.js",
  "./_next/static/chunks/clock-3-C2zIZoKF.js",
  "./_next/static/chunks/createLucideIcon-CK78ZR0E.js",
  "./_next/static/chunks/db-Blx0tmF0.js",
  "./_next/static/chunks/filter-props-C_olJvd_.js",
  "./_next/static/chunks/framework-B8V_a_AU.js",
  "./_next/static/chunks/index-f4W-fjTH.js",
  "./_next/static/chunks/layers-smKJ6SRt.js",
  "./_next/static/chunks/library-2-CVMC6G2t.js",
  "./_next/static/chunks/library-Cg5sR1h5.js",
  "./_next/static/chunks/play-q9-0Hmkj.js",
  "./_next/static/chunks/proxy-BH9eZ7t3.js",
  "./_next/static/chunks/results-C-nzS9Px.js",
  "./_next/static/chunks/review-DY-uZweV.js",
  "./_next/static/chunks/rolldown-runtime-B0Z9INg1.js",
  "./_next/static/chunks/rotate-ccw-cSPvZs5f.js",
  "./_next/static/chunks/settings-B7Zxv8NJ.js",
  "./_next/static/chunks/study-mt28S3Ny.js",
  "./_next/static/chunks/study-store-CsN69no4.js",
  "./_next/static/chunks/today-BguysTVd.js",
  "./_next/static/chunks/vinext-yQoKx2dr.js",
  "./_next/static/chunks/volume-2-BDScGHnQ.js",
  "./_next/static/chunks/welcome-BN2U8BqW.js",
  "./_next/static/chunks/x-DQVHbupi.js",
  "./_next/static/css/_app.C2RCLZzV.css",
  "./_next/static/f71755ae-271f-428e-b145-7264393cdd38/_buildManifest.js",
  "./_next/static/f71755ae-271f-428e-b145-7264393cdd38/_ssgManifest.js"
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
