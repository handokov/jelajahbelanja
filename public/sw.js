/// <reference lib="webworker" />

/**
 * Service Worker JelajahBelanja — ringan untuk HP kentang!
 *
 * Strategi:
 * - Next.js internal requests (_next/, RSC): JANGAN intercept — biarin Next.js handle sendiri
 * - Gambar produk (cross-origin CDN): Stale While Revalidate
 * - API data (/api/): Network First — selalu fresh, fallback ke cache kalau offline
 * - Font Google: Cache First
 * - Static assets (js/css/fonts): Cache First
 * - Full page reload (navigation): Network First
 *
 * PENTING: Jangan pernah intercept request yang buatan Next.js router!
 * Next.js App Router pakai RSC (React Server Components) payload
 * yang gak boleh di-cache oleh SW karena URL-nya dynamic.
 */

const CACHE_NAME = "jb-v2";
const STATIC_CACHE = "jb-static-v2";
const IMG_CACHE = "jb-img-v2";
const API_CACHE = "jb-api-v2";

// App shell files yang di-cache saat install
const APP_SHELL = [
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

  // ⚠️ PENTING: Skip Next.js internal requests!
  // - /_next/ — bundled JS/CSS, chunk loading
  // - RSC payload requests (biasanya punya header RSC)
  // - Next.js prefetch requests
  // Kalau ini di-intercept, navigasi antar halaman bisa crash!
  if (url.pathname.startsWith("/_next/")) {
    return; // Biarin browser handle sendiri
  }

  // Skip Next.js router requests (RSC, prefetch)
  const rscHeader = event.request.headers.get("RSC");
  const nextRouter = event.request.headers.get("Next-Router");
  const nextUrl = event.request.headers.get("Next-Url");
  if (rscHeader || nextRouter || nextUrl) {
    return; // Next.js internal, jangan sentuh!
  }

  // Cross-origin requests
  if (url.origin !== self.location.origin) {
    // Google Fonts — Cache First
    if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
      event.respondWith(cacheFirst(event.request, STATIC_CACHE));
      return;
    }
    // Product images from CDN — Stale While Revalidate
    if (url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
      event.respondWith(staleWhileRevalidate(event.request, IMG_CACHE));
      return;
    }
    return; // Skip other cross-origin (analytics, etc)
  }

  // API requests — Network First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request, API_CACHE, 300));
    return;
  }

  // Static assets (JS, CSS, fonts) — Cache First
  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot|ico|svg)$/i)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Same-origin images — Stale While Revalidate
  if (url.pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
    event.respondWith(staleWhileRevalidate(event.request, IMG_CACHE));
    return;
  }

  // Full page navigation (hard reload / first load) — Network First
  // Hanya intercept kalau ini navigation request (bukan fetch dari JS)
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, CACHE_NAME, 600));
    return;
  }

  // Semua request lain — JANGAN intercept, biarin browser
  // Ini termasuk RSC payload, prefetch, dll
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

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
