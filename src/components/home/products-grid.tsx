"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product-card";
import { Flame } from "lucide-react";
import { AffiliateBanner } from "@/components/affiliate-banner";
import type { Product, ProductFilter } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductsGridProps {
  products: Product[];
  featuredProduct: Product | undefined;
  trendingTop5: Product[];
  filter: ProductFilter;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  heroVisible: boolean;
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
}: ProductsGridProps) {
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
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {products
            .filter((p) => p.id !== featuredProduct?.id || filter === "latest")
            .map((p) => (
              <ProductCard
                key={`default-${p.id}`}
                product={p}
                variant="default"
              />
            ))}
        </div>
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
          <div className="px-3 pb-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <AffiliateBanner position="sidebar" showLabel={true} />
          </div>
        </div>
      </aside>
    </div>
  );
}

export function ProductsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
        >
          <Skeleton className="w-full aspect-square" />
          <div className="p-3 flex flex-col gap-2">
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
