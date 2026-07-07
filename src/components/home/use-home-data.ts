"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { CategoryDTO, Product, ProductFilter, ProductsResponse } from "@/lib/types";

/**
 * Custom hook — semua data query untuk homepage.
 * Dipisahkan dari UI biar gampang di-test dan di-reuse.
 */
export function useHomeData() {
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [filter, setFilter] = React.useState<ProductFilter>("latest");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Categories
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

  const categories = React.useMemo(() => categoriesData ?? [], [categoriesData]);

  // Banners
  const { data: bannersData } = useQuery({
    queryKey: ["active-banners"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/banners?active=true");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("[banners] API error:", res.status, errData);
          return { banners: [] };
        }
        const json = await res.json();
        return json;
      } catch (err) {
        console.error("[banners] fetch error:", err);
        return { banners: [] };
      }
    },
    staleTime: 30 * 1000,
  });

  const activeBanners = React.useMemo(
    () => (bannersData?.banners ?? []).filter((b: any) => b.image && b.image.length > 5),
    [bannersData]
  );

  // Products
  const productsQuery = useQuery({
    queryKey: ["products", activeCategory, filter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory && activeCategory !== "all") {
        params.set("category", activeCategory);
      }
      params.set("filter", filter);
      params.set("limit", "200"); // Load up to 200 produk per page
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat produk");
      const json = (await res.json()) as ProductsResponse;
      return json;
    },
    staleTime: 5 * 60 * 1000,
  });

  const products: Product[] = productsQuery.data?.products ?? [];
  const source = productsQuery.data?.source ?? "live";

  const totalSold = React.useMemo(
    () => products.reduce((sum, p) => sum + p.soldCount, 0),
    [products]
  );

  const trendingTop5 = React.useMemo(
    () => [...products].sort((a, b) => b.viralScore - a.viralScore).slice(0, 5),
    [products]
  );

  const featuredProduct = React.useMemo(() => {
    if (filter === "viral") return products[0];
    return [...products].sort((a, b) => b.viralScore - a.viralScore)[0];
  }, [products, filter]);

  // Product badges (active only, fetched once for all marketplaces)
  const badgesQuery = useQuery({
    queryKey: ["active-product-badges"],
    queryFn: async () => {
      const res = await fetch("/api/product-badges?active=true");
      if (!res.ok) return [];
      const json = await res.json();
      return json.badges as any[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const productBadges = badgesQuery.data ?? [];

  return {
    // State
    activeCategory,
    setActiveCategory,
    filter,
    setFilter,
    search,
    setSearch,
    debouncedSearch,
    // Data
    categories,
    categoriesLoading,
    activeBanners,
    products,
    productsQuery,
    source,
    totalSold,
    trendingTop5,
    featuredProduct,
    productBadges,
  };
}
