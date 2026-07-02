/// <reference lib="webworker" />

/**
 * Service Worker JelajahBelanja — ringan untuk HP kentang!
 *
 * Strategi:
 * - App shell (HTML, CSS, JS): Cache First — load instan dari cache
 * - Gambar produk: Stale While Revalidate — tampilkan yang di cache, update di background
 * - API data: Network First — selalu fresh, fallback ke cache kalau offline
 * - Font & static assets: Cache First — gak berubah-ubah
 */

const CACHE_NAME = "jb-v1";
const STATIC_CACHE = "jb-static-v1";
const IMG_CACHE = "jb-img-v1";
const API_CACHE = "jb-api-v1";

// App shell files yang di-cache saat install
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/site.webmanifest",
  "/logo.svg",
  "/favicon.ico",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
];

// Install — cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate — hapus cache lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE && key !== IMG_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — routing berdasarkan tipe request
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests (kecuali fonts & CDN)
  if (url.origin !== self.location.origin) {
    // Allow Google Fonts & CDN
    if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
      event.respondWith(cacheFirst(event.request, STATIC_CACHE));
      return;
    }
    // Allow product images from CDN
    if (url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
      event.respondWith(staleWhileRevalidate(event.request, IMG_CACHE));
      return;
    }
    return; // Skip other cross-origin
  }

  // API requests — Network First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request, API_CACHE, 300)); // 5 min stale
    return;
  }

  // Static assets — Cache First
  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot|ico|svg)$/i)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Images — Stale While Revalidate
  if (url.pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
    event.respondWith(staleWhileRevalidate(event.request, IMG_CACHE));
    return;
  }

  // HTML pages — Network First dengan cache fallback
  if (event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(event.request, CACHE_NAME, 600)); // 10 min stale
    return;
  }

  // Default — Network with cache fallback
  event.respondWith(networkFirst(event.request, CACHE_NAME, 300));
});

/**
 * Cache First — cocok untuk static assets yang jarang berubah
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

/**
 * Network First — cocok untuk API & HTML yang harus fresh
 * maxAge = max age dalam detik sebelum cache dianggap stale
 */
async function networkFirst(request, cacheName, maxAge = 300) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      // Cek apakah cache masih valid
      const date = new Date(cached.headers.get("date") || 0);
      const age = (Date.now() - date.getTime()) / 1000;
      if (age < maxAge || maxAge === 0) {
        return cached;
      }
    }
    return cached || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

/**
 * Stale While Revalidate — cocok untuk gambar produk
 * Langsung tampilkan dari cache, update di background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Update di background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached); // Fallback ke cached kalau gagal

  // Return cached dulu kalau ada, kalau belum tunggu fetch
  return cached || fetchPromise;
}
