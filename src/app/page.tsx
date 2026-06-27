"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Settings2,
  Moon,
  Sun,
  Flame,
  Clock,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { ProductCard } from "@/components/product-card";
import { SettingsDialog } from "@/components/settings-dialog";
import { DemoBanner } from "@/components/demo-banner";

import type { CategoryDTO, Product, ProductFilter, ProductsResponse, AffiliateTagDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [filter, setFilter] = React.useState<ProductFilter>("latest");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      const json = await res.json();
      return json.categories as CategoryDTO[];
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data: affiliateData } = useQuery({
    queryKey: ["affiliate-tags"],
    queryFn: async () => {
      const res = await fetch("/api/affiliate");
      if (!res.ok) throw new Error("Gagal memuat tag affiliate");
      const json = await res.json();
      return json.tags as AffiliateTagDTO[];
    },
    staleTime: 60 * 1000,
  });

  const categories = React.useMemo(() => categoriesData ?? [], [categoriesData]);
  const activeAffiliateCount = React.useMemo(
    () => (affiliateData ?? []).filter((t) => t.enabled && t.tag).length,
    [affiliateData]
  );

  const productsQuery = useQuery({
    queryKey: ["products", activeCategory, filter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory && activeCategory !== "all") {
        params.set("category", activeCategory);
      }
      params.set("filter", filter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat produk");
      const json = (await res.json()) as ProductsResponse;
      return json;
    },
    staleTime: 5 * 60 * 1000,
  });

  const products: Product[] = productsQuery.data?.products ?? [];
  const source = productsQuery.data?.source ?? "mock";
  const totalSold = React.useMemo(
    () => products.reduce((sum, p) => sum + p.soldCount, 0),
    [products]
  );

  const trendingTop5 = React.useMemo(() => {
    return [...products].sort((a, b) => b.viralScore - a.viralScore).slice(0, 5);
  }, [products]);

  const featuredProduct = React.useMemo(() => {
    if (filter === "viral") return products[0];
    return [...products].sort((a, b) => b.viralScore - a.viralScore)[0];
  }, [products, filter]);

  // JSON-LD structured data untuk SEO (ItemList)
  const itemListJsonLd = React.useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Produk Viral & Best Seller Indonesia",
      description: `Kurasi ${products.length} produk viral dan best seller dari Shopee, Tokopedia, dan Lazada. Update terbaru, harga termurah, dan diskon terbesar hari ini.`,
      numberOfItems: products.length,
      itemListElement: products.slice(0, 10).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.title,
          image: p.image,
          url: p.affiliateUrl || p.url,
          category: p.category,
          offers: {
            "@type": "Offer",
            priceCurrency: "IDR",
            price: p.price,
            availability: "https://schema.org/InStock",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating,
            reviewCount: p.reviewCount,
          },
        },
      })),
    };
  }, [products]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* JSON-LD structured data untuk SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* ===== Header ===== */}
      <header className="bg-header-gradient text-white">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {/* Logo + tagline */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-7 h-7 md:w-8 md:h-8" aria-hidden />
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                JelajahBelanja
              </h1>
              <Badge className="ml-2 bg-white/20 text-white border-white/30 hover:bg-white/20 text-[10px]">
                Beta
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-white hover:bg-white/15 hover:text-white"
                aria-label="Ganti tema"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Hero tagline + stats */}
          <div className="mb-5">
            <h2 className="text-xl md:text-2xl font-bold mb-1.5 leading-tight">
              Produk Viral & Best Seller Indonesia Hari Ini
            </h2>
            <p className="text-sm md:text-base text-white/80 mb-3 max-w-2xl">
              Lacak produk viral dari Shopee, Tokopedia, dan Lazada. Update real-time,
              filter berdasarkan viralitas, dan temukan diskon terbaik.
            </p>
            <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm">
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-3 py-1">
                <Flame className="w-3.5 h-3.5" />
                <span>{products.length} produk viral</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-3 py-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{totalSold > 1000 ? `${Math.round(totalSold / 1000)}k+` : totalSold} terjual</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-3 py-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{categories.length} kategori</span>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none" />
            <Input
              type="search"
              placeholder="Cari produk viral: earbuds, serum vitamin c, kaos oversize..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari produk viral"
              className={cn(
                "h-11 md:h-12 pl-10 pr-4 text-sm md:text-base",
                "bg-white/15 backdrop-blur-md border border-white/20",
                "text-white placeholder-white/70",
                "focus:bg-white/25 focus:border-white/40",
                "rounded-xl"
              )}
            />
          </div>
        </div>
      </header>

      {/* ===== Sub-nav (sticky, glass) ===== */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between gap-2 py-2.5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
            <span className="hidden sm:inline">
              {productsQuery.data
                ? `${productsQuery.data.total} produk ditemukan`
                : "Memuat..."}
            </span>
            {source === "mock" && (
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-100 text-[10px] ml-1">
                Mode Demo
              </Badge>
            )}
            {activeAffiliateCount > 0 && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100 text-[10px] ml-1">
                <Tag className="w-2.5 h-2.5 mr-0.5" />
                {activeAffiliateCount} affiliate aktif
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="h-8"
            >
              <Settings2 className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Pengaturan</span>
              <span className="sm:hidden">Atur</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ===== Main content ===== */}
      <main className="flex-1 container mx-auto px-4 max-w-7xl py-6">
        {/* Category chips */}
        <section aria-label="Kategori produk viral" className="mb-6">
          {categoriesLoading ? (
            <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-full" />
              ))}
            </div>
          ) : (
            <nav className="flex md:grid md:grid-cols-8 gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              <CategoryChip
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
                emoji="✨"
                label="Semua"
              />
              {categories.map((c) => (
                <CategoryChip
                  key={c.id}
                  active={activeCategory === c.id}
                  onClick={() => setActiveCategory(c.id)}
                  emoji={c.emoji}
                  label={c.name}
                />
              ))}
            </nav>
          )}
        </section>

        {/* Demo banner */}
        {source === "mock" && <DemoBanner className="mb-4" />}

        {/* Filter tabs */}
        <section aria-label="Filter produk viral" className="mb-6">
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as ProductFilter)}
          >
            <TabsList className="grid w-full max-w-md grid-cols-3 h-10">
              <TabsTrigger value="latest" className="text-xs md:text-sm">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Terbaru
              </TabsTrigger>
              <TabsTrigger value="viral" className="text-xs md:text-sm">
                <Flame className="w-3.5 h-3.5 mr-1" />
                Viral 24 Jam
              </TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs md:text-sm">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                Top Mingguan
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        {/* Products grid */}
        <section aria-label="Daftar produk viral Indonesia" className="mb-12">
          {productsQuery.isLoading ? (
            <ProductsGridSkeleton />
          ) : productsQuery.isError ? (
            <div className="text-center py-16 text-sm text-zinc-500 dark:text-zinc-400">
              <p>Gagal memuat produk. Coba refresh halaman.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => productsQuery.refetch()}
              >
                Coba lagi
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-sm text-zinc-500 dark:text-zinc-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Tidak ada produk yang cocok.</p>
              <p className="text-xs mt-1">
                Coba kata kunci lain atau pilih kategori berbeda.
              </p>
            </div>
          ) : (
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
                <div className="sticky top-20 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-4 h-4 text-fuchsia-500" />
                    <h2 className="text-sm font-semibold">Trending Sekarang</h2>
                  </div>
                  {trendingTop5.length === 0 ? (
                    <p className="text-xs text-zinc-500">Belum ada data.</p>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-[600px] overflow-y-auto custom-scrollbar">
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
              </aside>
            </div>
          )}
        </section>

        {/* SEO content section — bantu Google index */}
        <section className="mb-8 prose prose-sm dark:prose-invert max-w-none">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Produk Viral Shopee, Tokopedia & Lazada Terlengkap
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            JelajahBelanja adalah platform agregator produk viral Indonesia yang
            mengumpulkan ribuan best seller dari marketplace lokal seperti Shopee,
            Tokopedia, dan Lazada. Kami memantau produk yang sedang trending di
            TikTok dan media sosial, lalu menampilkannya dengan filter viralitas
            sehingga kamu bisa cepat menemukan{" "}
            <strong>produk viral 24 jam terakhir</strong>,{" "}
            <strong>best seller mingguan</strong>, atau produk{" "}
            <strong>terbaru</strong> dari berbagai kategori. Setiap produk dilengkapi
            info rating, jumlah terjual, lokasi seller, dan harga termurah dengan
            diskon terbesar. Update setiap hari, jadi kamu tidak ketinggalan tren
            belanja online terbaru.
          </p>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="bg-header-gradient text-white mt-auto">
        <div className="container mx-auto px-4 max-w-7xl py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" aria-hidden />
              <span className="font-semibold">JelajahBelanja</span>
              <span className="text-white/70">© 2024</span>
            </div>
            <p className="text-xs text-white/70 text-center md:text-right max-w-md">
              Data produk dikurasi dari Shopee, Tokopedia, Lazada, dan AliExpress.
            </p>
          </div>
          {/* Affiliate disclosure — wajib sesuai aturan FTC & marketplace */}
          <p className="text-[11px] text-white/60 leading-relaxed border-t border-white/20 pt-3">
            <strong className="text-white/80">Disclosure Affiliate:</strong> Beberapa
            link di JelajahBelanja adalah link afiliasi. Jika kamu membeli produk
            melalui link tersebut, kami mungkin menerima komisi kecil dari marketplace
            tanpa biaya tambahan untuk kamu. Ini membantu kami terus menyediakan layanan
            gratis. Terima kasih atas dukunganmu!
          </p>
        </div>
      </footer>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium border transition",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-primary/40 hover:text-primary"
      )}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}

function ProductsGridSkeleton() {
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
