"use client";

import { useEffect } from "react";

/**
 * PWA Loader Remover — menghilangkan loading screen inline
 * setelah React selesai hydrate. Penting untuk low-end Android
 * biar WebView punya konten visual segera (bukan blank/white screen).
 */
export function PwaLoaderRemover() {
  useEffect(() => {
    const loader = document.getElementById("pwa-loader");
    if (loader) {
      // Fade out, lalu hapus dari DOM
      loader.classList.add("pwa-loader-hidden");
      setTimeout(() => loader.remove(), 400);
    }
  }, []);

  return null;
}
