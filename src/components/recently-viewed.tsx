"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface RecentlyViewedProps {
  /** ID produk saat ini (akan di-exclude dari list) */
  excludeId?: string;
  /** Jumlah item yang ditampilkan (default 5) */
  limit?: number;
  /** Tampilkan tombol clear */
  showClear?: boolean;
}

const MARKETPLACE_LABELS: Record<string, string> = {
  shopee: "Shopee",
  tokopedia: "Tokopedia",
  lazada: "Lazada",
  blibli: "Blibli",
  tiktok: "TikTok Shop",
  aliexpress: "AliExpress",
  amazon: "Amazon",
};

/**
 * RecentlyViewed — horizontal scroll bar produk yang user pernah lihat.
 * Pakai localStorage (client-side only).
 */
export function RecentlyViewed({ excludeId, limit = 5, showClear = true }: RecentlyViewedProps) {
  const { getRecentlyViewed, clearRecentlyViewed, hydrated } = useRecentlyViewed();
  const [items, setItems] = React.useState<ReturnType<typeof getRecentlyViewed>>([]);

  // Update items saat hydrated atau excludeId berubah
  React.useEffect(() => {
    if (hydrated) {
      setItems(getRecentlyViewed(excludeId, limit));
    }
  }, [hydrated, excludeId, limit, getRecentlyViewed]);

  if (!hydrated || items.length === 0) return null;

  return (
    <section aria-label="Produk yang baru dilihat" className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm md:text-base font-semibold flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-zinc-400" />
          Baru Dilihat
        </h2>
        {showClear && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-zinc-500 hover:text-red-500"
            onClick={() => {
              clearRecentlyViewed();
              setItems([]);
            }}
          >
            <X className="w-3 h-3 mr-0.5" />
            Hapus
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/produk/${item.id}`}
            className="flex-shrink-0 w-[140px] group"
          >
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2">
                <p className="text-[10px] font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight min-h-[1.75rem]">
                  {item.title}
                </p>
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mt-1">
                  {formatRupiah(item.price)}
                </p>
                <p className="text-[9px] text-zinc-500 mt-0.5">
                  {MARKETPLACE_LABELS[item.marketplace] || item.marketplace}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
