"use client";

import * as React from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SortOption = "newest" | "price-asc" | "price-desc" | "discount" | "rating" | "popular";

interface SortFilterBarProps {
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  minPrice: number | null;
  maxPrice: number | null;
  onPriceChange: (min: number | null, max: number | null) => void;
  selectedMarketplaces: string[];
  onMarketplacesChange: (mps: string[]) => void;
  totalResults: number;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "popular", label: "Terlaris" },
  { value: "price-asc", label: "Harga Termurah" },
  { value: "price-desc", label: "Harga Tertinggi" },
  { value: "discount", label: "Diskon Terbesar" },
  { value: "rating", label: "Rating Tertinggi" },
];

const MARKETPLACE_OPTIONS = [
  { value: "shopee", label: "Shopee", emoji: "🛍️" },
  { value: "tokopedia", label: "Tokopedia", emoji: "🟢" },
  { value: "lazada", label: "Lazada", emoji: "💙" },
  { value: "blibli", label: "Blibli", emoji: "🔷" },
  { value: "bukalapak", label: "Bukalapak", emoji: "📕" },
  { value: "zalora", label: "Zalora", emoji: "👗" },
  { value: "sociolla", label: "Sociolla", emoji: "💄" },
  { value: "tiktok", label: "TikTok Shop", emoji: "🎵" },
  { value: "aliexpress", label: "AliExpress", emoji: "🔴" },
  { value: "amazon", label: "Amazon", emoji: "📦" },
];

const PRICE_PRESETS = [
  { label: "< Rp50rb", min: null, max: 50000 },
  { label: "Rp50rb - 200rb", min: 50000, max: 200000 },
  { label: "Rp200rb - 500rb", min: 200000, max: 500000 },
  { label: "Rp500rb - 1jt", min: 500000, max: 1000000 },
  { label: "> Rp1jt", min: 1000000, max: null },
];

export function SortFilterBar({
  sort,
  onSortChange,
  minPrice,
  maxPrice,
  onPriceChange,
  selectedMarketplaces,
  onMarketplacesChange,
  totalResults,
}: SortFilterBarProps) {
  const [showFilter, setShowFilter] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);

  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || "Terbaru";
  const hasActiveFilter = selectedMarketplaces.length > 0 || minPrice !== null || maxPrice !== null;

  const toggleMarketplace = (mp: string) => {
    if (selectedMarketplaces.includes(mp)) {
      onMarketplacesChange(selectedMarketplaces.filter(m => m !== mp));
    } else {
      onMarketplacesChange([...selectedMarketplaces, mp]);
    }
  };

  const clearAllFilters = () => {
    onMarketplacesChange([]);
    onPriceChange(null, null);
  };

  return (
    <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 -mx-4 px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        {/* Result count */}
        <span className="text-xs text-zinc-500 hidden sm:inline">
          {totalResults} produk
        </span>

        <div className="flex items-center gap-2 ml-auto">
          {/* Sort dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setSortOpen(!sortOpen)}
            >
              <span className="text-zinc-500">Urut:</span>
              <span className="font-semibold">{sortLabel}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onSortChange(opt.value);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition",
                        sort === opt.value && "font-semibold text-violet-600"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Filter button */}
          <Button
            variant={hasActiveFilter ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowFilter(!showFilter)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            {hasActiveFilter && (
              <span className="ml-1 px-1.5 rounded-full bg-white/30 text-[10px]">
                {selectedMarketplaces.length + (minPrice !== null || maxPrice !== null ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilter && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedMarketplaces.map(mp => {
            const opt = MARKETPLACE_OPTIONS.find(o => o.value === mp);
            return (
              <Badge
                key={mp}
                className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] gap-1 cursor-pointer"
                onClick={() => toggleMarketplace(mp)}
              >
                {opt?.emoji} {opt?.label || mp} <X className="w-2.5 h-2.5" />
              </Badge>
            );
          })}
          {(minPrice !== null || maxPrice !== null) && (
            <Badge
              className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] gap-1 cursor-pointer"
              onClick={() => onPriceChange(null, null)}
            >
              Harga {minPrice ? `${formatRupiahShort(minPrice)}` : "0"}
              {maxPrice ? ` - ${formatRupiahShort(maxPrice)}` : "+"}
              <X className="w-2.5 h-2.5" />
            </Badge>
          )}
          <button
            onClick={clearAllFilters}
            className="text-[10px] text-red-500 hover:underline ml-1"
          >
            Reset semua
          </button>
        </div>
      )}

      {/* Filter panel */}
      {showFilter && (
        <div className="mt-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          {/* Marketplace filter */}
          <div>
            <p className="text-xs font-semibold mb-2">Marketplace</p>
            <div className="flex flex-wrap gap-1.5">
              {MARKETPLACE_OPTIONS.map(mp => {
                const checked = selectedMarketplaces.includes(mp.value);
                return (
                  <button
                    key={mp.value}
                    onClick={() => toggleMarketplace(mp.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-medium border transition",
                      checked
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-violet-400"
                    )}
                  >
                    {mp.emoji} {mp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price filter presets */}
          <div>
            <p className="text-xs font-semibold mb-2">Rentang Harga</p>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map(preset => {
                const active = minPrice === preset.min && maxPrice === preset.max;
                return (
                  <button
                    key={preset.label}
                    onClick={() => onPriceChange(preset.min, preset.max)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-medium border transition",
                      active
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-violet-400"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom price input */}
            <div className="flex gap-2 items-center mt-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice ?? ""}
                onChange={e => onPriceChange(e.target.value ? Number(e.target.value) : null, maxPrice)}
                className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs"
              />
              <span className="text-zinc-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice ?? ""}
                onChange={e => onPriceChange(minPrice, e.target.value ? Number(e.target.value) : null)}
                className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRupiahShort(n: number): string {
  if (n >= 1000000) return `Rp${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000) return `Rp${(n / 1000).toFixed(0)}rb`;
  return `Rp${n}`;
}
