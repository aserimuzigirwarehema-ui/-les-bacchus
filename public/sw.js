const CACHE_NAME = "les-bacchus-shell-v4";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/logo_App.jpg",
  "/icon-192.svg",
  "/icon-512.svg",
  "/les-baccus-logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        APP_SHELL.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch {
            // A single optional asset must not prevent the service worker installing.
          }
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/auth"))));
});