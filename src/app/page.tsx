"use client";

import * as React from "react";
import {
  LogoBar,
  HeroSection,
  StickySearchBar,
  BannerSlider,
  CategoryChips,
  FilterTabs,
  ProductsGrid,
  SEOSection,
  BlogSection,
  SiteFooter,
  useHomeData,
} from "@/components/home";

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
  } = useHomeData();

  // Deteksi kapan hero section scroll keluar layar
  const heroSearchRef = React.useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = React.useState(true);

  React.useEffect(() => {
    const el = heroSearchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { rootMargin: "0px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

      {/* Sticky Logo Bar */}
      <LogoBar />

      {/* Hero Section */}
      <HeroSection
        search={search}
        onSearchChange={setSearch}
        productsCount={products.length}
        totalSold={totalSold}
        categoriesCount={categories.length}
        heroSearchRef={heroSearchRef}
      />

      {/* Sticky Search Bar (visible after hero scrolls away) */}
      {!heroVisible && (
        <StickySearchBar search={search} onSearchChange={setSearch} />
      )}

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 max-w-7xl py-6">
        {/* Banner Slider */}
        <BannerSlider banners={activeBanners} />

        {/* Category Chips */}
        <CategoryChips
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          isLoading={categoriesLoading}
        />

        {/* Filter Tabs */}
        <FilterTabs filter={filter} onFilterChange={setFilter} />

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
            heroVisible={heroVisible}
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
    </div>
  );
}
