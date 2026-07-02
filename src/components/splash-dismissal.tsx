"use client";

import { useEffect } from "react";

/**
 * SplashDismissal — hapus PWA splash screen setelah React hydrate.
 *
 * Splash screen (div#jb-splash) ditampilkan via inline CSS di layout.tsx
 * sebelum React sempat hydrate. Komponen ini menghapusnya dengan fade-out
 * setelah mount, menandakan app sudah siap.
 */
export default function SplashDismissal() {
  useEffect(() => {
    const splash = document.getElementById("jb-splash");
    if (!splash) return;

    // Fade out
    splash.style.opacity = "0";

    // Hapus dari DOM setelah animasi selesai
    const timer = setTimeout(() => {
      splash.remove();
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
