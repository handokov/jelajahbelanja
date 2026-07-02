"use client";

import { useEffect } from "react";

/**
 * SplashDismissal — hapus PWA splash screen setelah React hydrate.
 *
 * Splash screen (div#jb-splash) ditampilkan via inline CSS di layout.tsx
 * sebelum React sempat hydrate. Komponen ini menghapusnya dengan:
 * 1. Memanggil __jbSplashComplete() yang menganimasi progress bar ke 100%
 * 2. Lalu fade out dan hapus dari DOM
 *
 * Ini memberikan pengalaman loading yang smooth, terutama di HP kentang
 * di mana React hydrate bisa lambat.
 */
export default function SplashDismissal() {
  useEffect(() => {
    // Cek apakah fungsi __jbSplashComplete tersedia (dari inline script)
    if (typeof window.__jbSplashComplete === "function") {
      window.__jbSplashComplete();
    } else {
      // Fallback: langsung fade out tanpa progress bar
      const splash = document.getElementById("jb-splash");
      if (splash) {
        splash.style.opacity = "0";
        setTimeout(() => splash.remove(), 400);
      }
    }
  }, []);

  return null;
}

// Type declaration untuk __jbSplashComplete
declare global {
  interface Window {
    __jbSplashComplete?: () => void;
  }
}
