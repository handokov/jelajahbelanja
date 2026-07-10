"use client";

import * as React from "react";
import Link from "next/link";
import { Zap, Timer } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";
import type { ProductBadge } from "@/components/home/products-grid";
import { cn } from "@/lib/utils";

interface FlashSaleSectionProps {
  products: Product[];
  productBadges?: ProductBadge[];
}

/**
 * FlashSaleSection — horizontal scroll produk dengan diskon besar + timer countdown.
 *
 * - Ambil produk dengan discountPercent >= 30%
 * - Sort by discountPercent desc (diskon terbesar di depan)
 * - Max 12 produk
 * - Timer countdown 24 jam (reset tiap hari)
 * - Pakai ProductCard variant="default" supaya konsisten
 */
export function FlashSaleSection({ products, productBadges = [] }: FlashSaleSectionProps) {
  // Filter produk dengan diskon >= 30%, sort by diskon terbesar
  const flashSaleProducts = React.useMemo(() => {
    return products
      .filter(p => p.discountPercent && p.discountPercent >= 30)
      .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
      .slice(0, 12);
  }, [products]);

  // Timer countdown — reset tiap hari (sampe tengah malam)
  const [timeLeft, setTimeLeft] = React.useState({ hours: 0, minutes: 0, seconds: 0 });

  React.useEffect(() => {
    const calcTimeLeft = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0); // tengah malam
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { hours, minutes, seconds };
    };

    setTimeLeft(calcTimeLeft());
    const interval = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (flashSaleProducts.length === 0) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section aria-label="Flash Sale" className="mb-6">
      {/* Header */}
      <div className="rounded-t-2xl bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-white" />
          <h2 className="text-base md:text-lg font-extrabold text-white tracking-tight">
            FLASH SALE
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-white/90" />
          <span className="text-[10px] text-white/90 hidden sm:inline">Berakhir dalam</span>
          <div className="flex items-center gap-1 font-mono">
            <span className="bg-black/30 text-white text-xs font-bold px-1.5 py-0.5 rounded">{pad(timeLeft.hours)}</span>
            <span className="text-white text-xs">:</span>
            <span className="bg-black/30 text-white text-xs font-bold px-1.5 py-0.5 rounded">{pad(timeLeft.minutes)}</span>
            <span className="text-white text-xs">:</span>
            <span className="bg-black/30 text-white text-xs font-bold px-1.5 py-0.5 rounded">{pad(timeLeft.seconds)}</span>
          </div>
        </div>
      </div>

      {/* Products horizontal scroll */}
      <div className="rounded-b-2xl bg-zinc-50 dark:bg-zinc-900 border border-t-0 border-zinc-200 dark:border-zinc-800 p-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {flashSaleProducts.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[150px] sm:w-[180px]">
              <ProductCard
                product={product}
                variant="default"
                badges={productBadges.filter((b) => {
                  const mps = b.marketplaces.split(",").map((m) => m.trim().toLowerCase());
                  return mps.includes(product.marketplace.toLowerCase());
                })}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
