"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PWARefresh — custom pull-to-refresh untuk PWA standalone mode.
 *
 * Di mode standalone, browser gak ada pull-to-refresh bawaan.
 * Komponen ini detect:
 * 1. Kalau app jalan sebagai PWA standalone → tampilkan floating refresh button
 * 2. Pull-to-refresh gesture (tarik dari atas) → refresh halaman
 *
 * Ringan banget buat HP kentang — cuma pakai touch events, gak ada animation library.
 */
export function PWARefresh() {
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const touchStartY = React.useRef(0);
  const isPulling = React.useRef(false);

  React.useEffect(() => {
    // Detek apakah jalan sebagai PWA standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // Pull-to-refresh gesture handler
  React.useEffect(() => {
    if (!isStandalone) return;

    function handleTouchStart(e: TouchEvent) {
      // Cuma aktif kalau scroll di paling atas (scrollTop === 0)
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isPulling.current) return;
      const diff = e.touches[0].clientY - touchStartY.current;
      if (diff > 0 && window.scrollY <= 0) {
        // User narik ke bawah dari posisi paling atas
        const distance = Math.min(diff * 0.5, 80); // Max 80px, damping 0.5x
        setPullDistance(distance);
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    }

    function handleTouchEnd() {
      if (pullDistance >= 60) {
        // Threshold tercapai → refresh!
        doRefresh();
      }
      isPulling.current = false;
      setPullDistance(0);
    }

    function doRefresh() {
      setIsRefreshing(true);
      // Hard reload — bypass service worker cache
      window.location.reload();
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isStandalone, pullDistance]);

  if (!isStandalone) return null;

  return (
    <>
      {/* Pull indicator — muncul pas narik ke bawah */}
      {pullDistance > 10 && !isRefreshing && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none"
          style={{ transform: `translateY(${pullDistance - 30}px)` }}
        >
          <div className="bg-white dark:bg-zinc-800 rounded-full p-2 shadow-lg border border-zinc-200 dark:border-zinc-700">
            <RefreshCw
              className={cn("w-5 h-5 text-violet-600 dark:text-violet-400")}
              style={{
                transform: `rotate(${pullDistance * 3}deg)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Refreshing spinner */}
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
