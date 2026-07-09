"use client";

import { Flame, ShoppingBag, ShieldCheck } from "lucide-react";

interface HeroSectionProps {
  productsCount: number;
  totalSold: number;
  categoriesCount: number;
}

/**
 * HeroSection — tagline + stats chips (tanpa search bar).
 * Search bar sudah dipindah ke LogoBar (header sticky).
 */
export function HeroSection({
  productsCount,
  totalSold,
  categoriesCount,
}: HeroSectionProps) {
  return (
    <div className="bg-header-gradient text-white">
      <div className="container mx-auto px-4 py-4 md:py-6 max-w-7xl">
        {/* Hero tagline + stats */}
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
    </div>
  );
}
