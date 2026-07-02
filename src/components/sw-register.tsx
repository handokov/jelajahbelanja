"use client";

import { useEffect } from "react";

/**
 * SWRegister — daftarkan service worker di browser.
 * Dipasang di layout.tsx, cuma jalan di production (bukan dev).
 */
export default function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[SW] Registered:", reg.scope);

        // Cek update berkala (setiap 30 menit)
        setInterval(
          () => {
            reg.update();
          },
          30 * 60 * 1000
        );
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  }, []);

  return null;
}
