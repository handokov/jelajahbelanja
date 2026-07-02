"use client";

import { useEffect } from "react";

/**
 * SWRegister — cleanup service worker lama yang mungkin bikin error.
 *
 * SEMENTARA DIMATIKAN: SW registration di-comment dulu sampai
 * dipastikan gak ada error. SW lama yang masih aktif di-unregister.
 */
export default function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // UNREGISTER semua SW lama yang mungkin masih aktif dan bikin masalah
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        console.log("[SW] Unregistering old SW:", registration.scope);
        registration.unregister();
      }
    }).catch((err) => {
      console.warn("[SW] Cleanup failed:", err);
    });

    // TODO: Aktifkan kembali setelah error fix, uncomment di bawah:
    // if (process.env.NODE_ENV !== "production") return;
    // navigator.serviceWorker
    //   .register("/sw.js", { scope: "/" })
    //   .then((reg) => console.log("[SW] Registered:", reg.scope))
    //   .catch((err) => console.warn("[SW] Registration failed:", err));
  }, []);

  return null;
}
