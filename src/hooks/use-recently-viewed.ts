"use client";

import * as React from "react";

const STORAGE_KEY = "jb-recently-viewed";
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  id: string;
  title: string;
  image: string;
  price: number;
  marketplace: string;
  viewedAt: number;
}

/**
 * useRecentlyViewed — hook untuk track produk yang user pernah lihat.
 * Pakai localStorage (client-side only, tidak perlu DB).
 *
 * - getMaxItems: 10 produk terakhir
 * - Auto-dedup by id (pindah ke depan kalau sudah ada)
 * - Sort by viewedAt desc (terbaru di depan)
 * - SSR-safe (cek typeof window)
 */
export function useRecentlyViewed() {
  const [items, setItems] = React.useState<RecentlyViewedItem[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Load from localStorage saat mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentlyViewedItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore parse error
    }
    setHydrated(true);
  }, []);

  // Save to localStorage saat items berubah
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota error
    }
  }, [items, hydrated]);

  const addRecentlyViewed = React.useCallback((item: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems(prev => {
      // Remove existing dengan id yang sama
      const filtered = prev.filter(i => i.id !== item.id);
      // Add baru di depan
      const newItem: RecentlyViewedItem = { ...item, viewedAt: Date.now() };
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
      return updated;
    });
  }, []);

  const getRecentlyViewed = React.useCallback((excludeId?: string, limit = 5) => {
    return items
      .filter(i => i.id !== excludeId)
      .slice(0, limit);
  }, [items]);

  const clearRecentlyViewed = React.useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    items,
    hydrated,
    addRecentlyViewed,
    getRecentlyViewed,
    clearRecentlyViewed,
  };
}
