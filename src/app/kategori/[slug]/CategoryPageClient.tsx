"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { LogoBar, HeroSection, SortFilterBar, FlashSaleSection, ProductsGrid, SiteFooter, useHomeData } from "@/components/home";
import { CategoryChips } from "@/components/home/category-chips";
import { BackToTop } from "@/components/back-to-top";
import { RecentlyViewed } from "@/components/recently-viewed";

interface Props {
  category: {
    id: string;
    name: string;
    emoji: string | null;
    keywords: string | null;
  };
  allCategories: Array<{ id: string; name: string; emoji: string | null }>;
}

export default function CategoryPageClient({ category, allCategories }: Props) {
  const {
    setActiveCategory,
    filter,
    setFilter,
    search,
    setSearch,
    products,
    productsQuery,
    totalSold,
    trendingTop5,
    featuredProduct,
    productBadges,
    sort,
    setSort,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    selectedMarketplaces,
    setSelectedMarketplaces,
  } = useHomeData();

  // Set active category ke kategori halaman ini (saat mount)
  React.useEffect(() => {
    setActiveCategory(category.id);
  }, [category.id, setActiveCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* JSON-LD Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://jelajahbelanja.com" },
              { "@type": "ListItem", position: 2, name: "Kategori", item: "https://jelajahbelanja.com/#categories" },
              { "@type": "ListItem", position: 3, name: category.name },
            ],
          }),
        }}
      />

      {/* Sticky Logo Bar dengan search */}
      <LogoBar search={search} onSearchChange={setSearch} />

      {/* Hero Section (compact untuk category page) */}
      <HeroSection
        productsCount={products.length}
        totalSold={totalSold}
        categoriesCount={allCategories.length}
      />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 max-w-[1400px] py-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500">
          <Link href="/" className="hover:text-violet-600 flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/" className="hover:text-violet-600">Kategori</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{category.name}</span>
        </nav>

        {/* Category Title */}
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {category.emoji && <span className="mr-2">{category.emoji}</span>}
          {category.name}
        </h1>
        <p className="text-sm text-zinc-500 mb-6">
          Produk {category.name} viral & best seller dari Shopee, Tokopedia, Lazada, Blibli.
          Update terbaru, harga termurah, diskon terbesar.
        </p>

        {/* Category Chips */}
        <CategoryChips
          categories={allCategories}
          activeCategory={category.id}
          onCategoryChange={(id) => {
            window.location.href = `/kategori/${id}`;
          }}
          isLoading={false}
        />

        {/* Recently Viewed — tampil kalau user pernah lihat produk */}
        <RecentlyViewed limit={5} />

        {/* Flash Sale — tampil kalau ada produk dengan diskon >= 30% */}
        <FlashSaleSection products={products} productBadges={productBadges} />

        {/* Filter Tabs */}
        <div className="mb-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {(["latest", "viral", "weekly"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition whitespace-nowrap ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-primary/40"
                }`}
              >
                {f === "latest" ? "Terbaru" : f === "viral" ? "Viral 24 Jam" : "Top Mingguan"}
              </button>
            ))}
          </div>
        </div>

        {/* Sort & Advanced Filter Bar */}
        <SortFilterBar
          sort={sort}
          onSortChange={setSort}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onPriceChange={(min, max) => { setMinPrice(min); setMaxPrice(max); }}
          selectedMarketplaces={selectedMarketplaces}
          onMarketplacesChange={setSelectedMarketplaces}
          totalResults={products.length}
        />

        {/* Products Grid + Trending Sidebar */}
        <section aria-label={`Daftar produk ${category.name}`} className="mb-12">
          <ProductsGrid
            products={products}
            featuredProduct={featuredProduct}
            trendingTop5={trendingTop5}
            filter={filter}
            isLoading={productsQuery.isLoading}
            isError={productsQuery.isError}
            onRetry={() => productsQuery.refetch()}
            heroVisible={true}
            productBadges={productBadges}
          />
        </section>
      </main>

      {/* Footer */}
      <SiteFooter />

      {/* Back to top button */}
      <BackToTop />
    </div>
  );
}
