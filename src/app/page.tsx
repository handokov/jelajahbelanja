"use client";

import * as React from "react";
import {
  LogoBar,
  HeroSection,
  BannerSlider,
  CategoryChips,
  FilterTabs,
  SortFilterBar,
  FlashSaleSection,
  ProductsGrid,
  SEOSection,
  BlogSection,
  SiteFooter,
  useHomeData,
} from "@/components/home";
import { BackToTop } from "@/components/back-to-top";
import { RecentlyViewed } from "@/components/recently-viewed";

export default function Home() {
  const {
    activeCategory,
    setActiveCategory,
    filter,
    setFilter,
    search,
    setSearch,
    categories,
    categoriesLoading,
    activeBanners,
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
    totalProducts,
  } = useHomeData();

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

      {/* Sticky Logo Bar dengan search */}
      <LogoBar search={search} onSearchChange={setSearch} />

      {/* Hero Section (tagline + stats, tanpa search) */}
      <HeroSection
        productsCount={totalProducts}
        totalSold={totalSold}
        categoriesCount={categories.length}
      />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 max-w-[1400px] py-6">
        {/* Banner Slider */}
        <BannerSlider banners={activeBanners} />

        {/* Category Chips */}
        <CategoryChips
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          isLoading={categoriesLoading}
        />

        {/* Recently Viewed — tampil kalau user pernah lihat produk */}
        <RecentlyViewed limit={5} />

        {/* Flash Sale — tampil kalau ada produk dengan diskon >= 30% */}
        <FlashSaleSection products={products} productBadges={productBadges} />

        {/* Filter Tabs */}
        <FilterTabs filter={filter} onFilterChange={setFilter} />

        {/* Sort & Advanced Filter Bar */}
        <SortFilterBar
          sort={sort}
          onSortChange={setSort}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onPriceChange={(min, max) => { setMinPrice(min); setMaxPrice(max); }}
          selectedMarketplaces={selectedMarketplaces}
          onMarketplacesChange={setSelectedMarketplaces}
          totalResults={totalProducts}
        />

        {/* Products Grid + Trending Sidebar */}
        <section aria-label="Daftar produk viral Indonesia" className="mb-12">
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

        {/* SEO Content */}
        <SEOSection />

        {/* Blog Section */}
        <BlogSection />
      </main>

      {/* Footer */}
      <SiteFooter />

      {/* Back to top button */}
      <BackToTop />
    </div>
  );
}
