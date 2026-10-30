// Cache-first for the app shell so the installed app opens offline.
// Bump VERSION whenever files change so clients pick up the new build.
const VERSION = "bidv-staff-v15";
const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "data.js",
  "vendor/qrcode.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "icons/hoamai.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(event.request).then((res) => {
          // Cache same-origin files fetched later (e.g. employee photos)
          if (res.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
    )
  );
});
