/* Thai Study: prefix-safe, offline-first service worker. */
const VERSION = "thai-study-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const shellUrls = [
  "./",
  "./today/",
  "./study/",
  "./results/",
  "./library/",
  "./progress/",
  "./settings/",
  "./manifest.webmanifest",
  "./icon.svg",
].map((path) => new URL(path, self.location.href).href);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(shellUrls)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![SHELL_CACHE, ASSET_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Partial media responses are deliberately network-only. They are unsafe to
  // store as if they were complete files, and videos are never prefetched.
  const isVideo = url.pathname.toLowerCase().endsWith(".mp4") || request.destination === "video";
  if (request.headers.has("range") || isVideo) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.status === 200) {
            const copy = response.clone();
            void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(new URL("./today/", self.location.href))),
    );
    return;
  }

  const safeDestination = ["script", "style", "font", "image", "track", "audio"].includes(request.destination);
  if (!safeDestination) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.status === 200 && !response.headers.has("Content-Range")) {
        const copy = response.clone();
        void caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
