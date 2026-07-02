"use client";

import { useEffect } from "react";

/**
 * SWCleanup — satu-satunya tugas: unregister Service Worker lama
 * yang mungkin masih nyangkut di browser user dan bikin error.
 *
 * Gak ada SW baru yang di-register. File ini cuma cleanup.
 * Aman di-leave di sini buat jaga-jaga kalau ada SW lama
 * yang belum sempat ke-unregister.
 */
export default function SWCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        console.log("[SW-Cleanup] Unregistering old SW:", registration.scope);
        registration.unregister();
      }
    }).catch(() => {
      // Silent fail — gak penting
    });
  }, []);

  return null;
}
