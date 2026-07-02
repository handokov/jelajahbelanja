"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PWARefresh — custom pull-to-refresh untuk PWA standalone mode.
 *
 * Di mode standalone, browser gak ada pull-to-refresh bawaan.
 * Komponen ini cuma aktif kalau app jalan sebagai PWA standalone.
 *
 * PENTING: Menggunakan refs untuk touch handling agar gak ada
 * stale closure bug yang bisa crash app.
 */
export function PWARefresh() {
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const touchStartY = React.useRef(0);
  const isPulling = React.useRef(false);
  const currentPullDistance = React.useRef(0);
  const PULL_THRESHOLD = 60;

  React.useEffect(() => {
    // Detek apakah jalan sebagai PWA standalone
    try {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    } catch {
      // Gak support matchMedia — skip
    }
  }, []);

  // Pull-to-refresh gesture handler — pakai refs, bukan state, di event handlers
  // untuk menghindari stale closure dan re-register listeners yang bikin lag
  React.useEffect(() => {
    if (!isStandalone) return;

    function handleTouchStart(e: TouchEvent) {
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
        currentPullDistance.current = 0;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isPulling.current) return;
      const diff = e.touches[0].clientY - touchStartY.current;
      if (diff > 0 && window.scrollY <= 0) {
        const distance = Math.min(diff * 0.5, 80);
        currentPullDistance.current = distance;
        setPullDistance(distance); // Ini buat UI update aja
      } else {
        isPulling.current = false;
        currentPullDistance.current = 0;
        setPullDistance(0);
      }
    }

    function handleTouchEnd() {
      // Pakai ref (currentPullDistance) bukan state (pullDistance)
      // karena state bisa stale di event handler
      if (currentPullDistance.current >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        window.location.reload();
      }
      isPulling.current = false;
      currentPullDistance.current = 0;
      setPullDistance(0);
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isStandalone]); // Hanya depends on isStandalone, bukan pullDistance!

  if (!isStandalone) return null;

  return (
    <>
      {pullDistance > 10 && !isRefreshing && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none"
          style={{ transform: `translateY(${pullDistance - 30}px)` }}
        >
          <div className="bg-white dark:bg-zinc-800 rounded-full p-2 shadow-lg border border-zinc-200 dark:border-zinc-700">
            <RefreshCw
              className="w-5 h-5 text-violet-600 dark:text-violet-400"
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            />
          </div>
        </div>
      )}

      {isRefreshing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="bg-white dark:bg-zinc-800 rounded-full p-2 shadow-lg border border-zinc-200 dark:border-zinc-700">
            <RefreshCw className="w-5 h-5 text-violet-600 dark:text-violet-400 animate-spin" />
          </div>
        </div>
      )}
    </>
  );
}
