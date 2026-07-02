"use client";

import * as React from "react";
import { Search, Flame, ShoppingBag, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  search: string;
  onSearchChange: (value: string) => void;
  productsCount: number;
  totalSold: number;
  categoriesCount: number;
  heroSearchRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * HeroSection — tagline, stats chips, dan search bar.
 */
export function HeroSection({
  search,
  onSearchChange,
  productsCount,
  totalSold,
  categoriesCount,
  heroSearchRef,
}: HeroSectionProps) {
  return (
    <div className="bg-header-gradient text-white">
      <div className="container mx-auto px-4 py-4 md:py-6 max-w-7xl">
        {/* Hero tagline + stats */}
        <div className="mb-4">
          <h2 className="text-lg md:text-2xl font-bold mb-1 leading-tight">
            Produk Viral & Best Seller Indonesia Hari Ini
          </h2>
          <p className="text-xs md:text-sm text-white/80 mb-3 max-w-2xl">
            Lacak produk viral dari Shopee, Tokopedia, dan Lazada. Update berkala,
            filter berdasarkan viralitas, dan temukan diskon terbaik.
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2 text-[11px] md:text-xs">
            <div className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-0.5">
              <Flame className="w-3 h-3" />
              <span>{productsCount} produk viral</span>
            </div>
            <div className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-0.5">
              <ShoppingBag className="w-3 h-3" />
              <span>{totalSold > 1000 ? `${Math.round(totalSold / 1000)}k+` : totalSold} terjual</span>
            </div>
            <div className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-0.5">
              <ShieldCheck className="w-3 h-3" />
              <span>{categoriesCount} kategori</span>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div ref={heroSearchRef} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari produk viral: earbuds, serum vitamin c, kaos oversize..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari produk viral"
            className={cn(
              "h-10 md:h-11 pl-10 pr-4 text-sm",
              "bg-white/15 backdrop-blur-md border border-white/20",
              "text-white placeholder-white/70",
              "focus:bg-white/25 focus:border-white/40",
              "rounded-xl"
            )}
          />
        </div>
      </div>
    </div>
  );
}
