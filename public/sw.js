/// <reference lib="webworker" />

/**
 * Service Worker JelajahBelanja — SELF-DESTRUCT VERSION
 *
 * Versi ini sengaja dibuat untuk membunuh SW lama yang masih aktif
 * di browser user. SW lama intercept navigation requests dan serve
 * stale HTML yang reference JS chunk yang udah gak ada → crash!
 *
 * Apa yang dilakukan SW ini:
 * 1. Install → langsung clear SEMUA cache
 * 2. Activate → langsung unregister dirinya sendiri
 * 3. Fetch → JANGAN intercept apapun, biarin browser handle
 *
 * Setelah SW ini unregister, browser gak punya SW lagi.
 * Sw-register.tsx di app juga bakal unregister sisa SW kalau ada.
 */

// Install — bersihin semua cache lama
self.addEventListener("install", () => {
  // Clear semua cache yang pernah dibuat oleh SW manapun
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  });
  // Langsung aktivasi tanpa nunggu SW lama mati
  self.skipWaiting();
});

// Activate — unregister diri sendiri + claim clients
self.addEventListener("activate", () => {
  // Unregister SW ini sendiri
  self.registration.unregister().then(() => {
    console.log("[SW] Self-unregistered. All old caches cleared.");
  });
  // Claim semua client biar SW baru langsung aktif
  self.clients.claim();
});

// Fetch — JANGAN intercept apapun!
// Biarin browser handle request secara normal tanpa SW ganggu
self.addEventListener("fetch", () => {
  // No event.respondWith() = browser handles natively
});
