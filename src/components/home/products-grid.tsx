"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product-card";
import { Flame, Loader2, ChevronDown } from "lucide-react";
import { AffiliateBanner } from "@/components/affiliate-banner";
import type { Product, ProductFilter } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMemo, useState, useRef, useEffect } from "react";

export interface ProductBadge {
  id: string;
  label: string;
  emoji?: string | null;
  bgColor: string;
  textColor: string;
  marketplaces: string;
  order: number;
  isActive: boolean;
}

interface ProductsGridProps {
  products: Product[];
  featuredProduct: Product | undefined;
  trendingTop5: Product[];
  filter: ProductFilter;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  heroVisible: boolean;
  productBadges?: ProductBadge[];
}

/**
 * Insert iklan in-content setiap N produk secara random.
 * Hasil array berisi elemen: { type: 'product', product } | { type: 'ad' }
 */
type GridItem =
  | { type: "product"; product: Product; badges: ProductBadge[] }
  | { type: "ad"; adId: string };

function buildGridWithAds(
  products: Product[],
  badges: ProductBadge[]
): GridItem[] {
  if (products.length === 0) return [];

  const items: GridItem[] = [];
  // Sisipkan iklan setiap 6-8 produk (random interval, biar natural)
  // Mulai dari posisi ke-6 (index 5) supaya tidak ganggu featured/first
  let nextAdAt = 6 + Math.floor(Math.random() * 3); // 6-8
  let adCounter = 0;

  products.forEach((p, idx) => {
    const productBadges = badges.filter((b) => {
      const mps = b.marketplaces.split(",").map((m) => m.trim().toLowerCase());
      return mps.includes(p.marketplace.toLowerCase());
    });
    items.push({ type: "product", product: p, badges: productBadges });

    // Cek apakah saatnya sisip iklan
    if (idx + 1 === nextAdAt && idx + 1 < products.length) {
      items.push({ type: "ad", adId: `ad-${adCounter++}` });
      nextAdAt = idx + 1 + 6 + Math.floor(Math.random() * 3); // 6-8 produk berikutnya
    }
  });

  return items;
}

/**
 * ProductsGrid — grid produk utama + sidebar trending.
 */
export function ProductsGrid({
  products,
  featuredProduct,
  trendingTop5,
  filter,
  isLoading,
  isError,
  onRetry,
  heroVisible,
  productBadges = [],
}: ProductsGridProps) {
  // Infinite scroll state
  const PAGE_SIZE = 24;
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset displayCount saat products berubah (filter/sort/search baru)
  useEffect(() => {
    // Pattern valid: reset pagination state when source data changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayCount(PAGE_SIZE);
  }, [products]);

  // Build grid items dengan iklan tersisip random — compute SEBELUM early return
  // (hooks must be called in same order every render)
  const gridProducts = products.filter(
    (p) => p.id !== featuredProduct?.id || filter === "latest"
  );
  const gridItems = useMemo(
    () => buildGridWithAds(gridProducts, productBadges),
    [gridProducts, productBadges]
  );

  // Slice untuk infinite scroll
  const visibleItems = gridItems.slice(0, displayCount);
  const hasMore = displayCount < gridItems.length;

  // IntersectionObserver untuk auto-load
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          setLoadingMore(true);
          // Simulate small delay for UX feedback
          setTimeout(() => {
            setDisplayCount((c) => Math.min(c + PAGE_SIZE, gridItems.length));
            setLoadingMore(false);
          }, 200);
        }
      },
      { rootMargin: "200px" } // trigger 200px before sentinel visible
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, gridItems.length]);

  if (isLoading) return <ProductsGridSkeleton />;
  if (isError) {
    return (
      <div className="text-center py-16 text-sm text-zinc-500 dark:text-zinc-400">
        <p>Gagal memuat produk. Coba refresh halaman.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Coba lagi
        </Button>
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-zinc-500 dark:text-zinc-400">
        <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>Tidak ada produk yang cocok.</p>
        <p className="text-xs mt-1">
          Coba kata kunci lain atau pilih kategori berbeda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main grid */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        {featuredProduct && filter !== "latest" && (
          <ProductCard
            key={`featured-${featuredProduct.id}`}
            product={featuredProduct}
            variant="featured"
            badges={productBadges.filter((b) => {
              const mps = b.marketplaces.split(",").map((m) => m.trim().toLowerCase());
              return mps.includes(featuredProduct.marketplace.toLowerCase());
            })}
          />
        )}
        {/* Mobile 2 cols, Desktop 3 cols. Iklan in-content span full width. */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4">
          {visibleItems.map((item, idx) => {
            if (item.type === "ad") {
              return (
                <div
                  key={item.adId}
                  className="col-span-2 xl:col-span-3 my-2"
                >
                  <AffiliateBanner
                    position="in-content"
                    showLabel={true}
                    className="w-full"
                  />
                </div>
              );
            }
            return (
              <ProductCard
                key={`default-${item.product.id}`}
                product={item.product}
                variant="default"
                badges={item.badges}
              />
            );
          })}
        </div>

        {/* Infinite scroll sentinel + Load More button */}
        {hasMore && (
          <>
            <div ref={sentinelRef} className="h-4" aria-hidden />
            <div className="flex flex-col items-center gap-2 py-4">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuat produk lainnya...
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoadingMore(true);
                    setTimeout(() => {
                      setDisplayCount((c) => Math.min(c + PAGE_SIZE, gridItems.length));
                      setLoadingMore(false);
                    }, 200);
                  }}
                  className="gap-1"
                >
                  Muat lagi ({gridItems.length - displayCount} produk)
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </>
        )}

        {/* End of results indicator */}
        {!hasMore && gridItems.length > PAGE_SIZE && (
          <div className="text-center py-4 text-xs text-zinc-400">
            ✓ Semua {gridItems.length} produk sudah ditampilkan
          </div>
        )}
      </div>

      {/* Sidebar trending - desktop only */}
      <aside className="hidden lg:block lg:col-span-1">
        <div
          className={cn(
            "sticky rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
            heroVisible ? "top-20" : "top-[104px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 rounded-t-2xl bg-white dark:bg-zinc-900">
            <Flame className="w-4 h-4 text-fuchsia-500" />
            <h2 className="text-sm font-semibold">Trending Sekarang</h2>
          </div>
          {/* Produk */}
          <div className="p-4 pt-3">
            {trendingTop5.length === 0 ? (
              <p className="text-xs text-zinc-500">Belum ada data.</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
                {trendingTop5.map((p, i) => (
                  <ProductCard
                    key={`compact-${p.id}`}
                    product={p}
                    variant="compact"
                    rank={i + 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Banner Affiliate - di bawah trending */}
          <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <AffiliateBanner maxWidth={250} showLabel={true} />
          </div>
        </div>
      </aside>
    </div>
  );
}

export function ProductsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
        >
          <Skeleton className="w-full aspect-square" />
          <div className="p-2 sm:p-3 flex flex-col gap-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
