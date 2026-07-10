import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureCategoriesSeeded, ensureAffiliateTagsSeeded } from "@/lib/seed";
import { buildAffiliateUrl, getAffiliateTags } from "@/lib/affiliate";
import {
  computeSoldPerDay,
  computeViralScore,
  VIRAL_SCORE_THRESHOLD,
  topViralQuarter,
} from "@/lib/viral-score";
import type { Product, ProductsResponse, ProductFilter, Marketplace } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Normalize marketplace value — handle case variations and unknown values */
function normalizeMarketplace(raw: string): string {
  const lower = (raw || "").toLowerCase().trim();
  const VALID = [
    "shopee", "tokopedia", "lazada", "blibli", "bukalapak",
    "zalora", "sociolla", "aliexpress", "amazon", "tiktok",
  ];
  if (VALID.includes(lower)) {
    return lower;
  }
  // "mock", empty, atau unknown → default ke "shopee"
  return "shopee";
}

/** Convert DB ShopeeProduct row to Product DTO */
function dbRowToProduct(row: {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  location: string | null;
  category: string;
  url: string;
  affiliateUrl: string | null;
  marketplace: string;
  enabled: boolean;
  isViral: boolean;
  isPinned: boolean;
  isHidden: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  const ts = row.createdAt.toISOString();
  const soldPerDay = computeSoldPerDay(row.soldCount, ts);
  const viralScore = computeViralScore({
    soldPerDay,
    rating: row.rating,
    reviewCount: row.reviewCount,
    timestamp: ts,
    price: row.price,
    originalPrice: row.originalPrice ?? undefined,
    title: row.title,
  });
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    image: row.image,
    price: row.price,
    originalPrice: row.originalPrice ?? undefined,
    discountPercent: row.discountPercent ?? undefined,
    rating: row.rating,
    reviewCount: row.reviewCount,
    soldCount: row.soldCount,
    soldPerDay,
    timestamp: ts,
    marketplace: normalizeMarketplace(row.marketplace) as Marketplace,
    category: row.category,
    viralScore,
    isViral: row.isViral || viralScore >= VIRAL_SCORE_THRESHOLD,
    location: row.location ?? undefined,
    affiliateUrl: row.affiliateUrl ?? undefined,
  };
}

/**
 * GET /api/products?category=<id>&filter=latest|viral|weekly&search=<q>&limit=<n>&page=<n>
 * 
 * limit: default 100, max 500. page: default 1.
 * Untuk kompatibilitas, jika limit tidak dispesifikasikan, kirim semua (tapi max 500).
 */
export async function GET(req: NextRequest) {
  try {
    await ensureCategoriesSeeded();
    await ensureAffiliateTagsSeeded();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category") || "";
    const filterParam = (searchParams.get("filter") as ProductFilter) || "latest";
    const filter: ProductFilter = ["latest", "viral", "weekly"].includes(filterParam)
      ? filterParam
      : "latest";
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    // Sort: daily-mix | newest | price-asc | price-desc | discount | rating | popular
    // daily-mix = acak stabil per hari (seeded random pakai tanggal hari ini)
    const sort = (searchParams.get("sort") || "daily-mix").toLowerCase();

    // Price filter
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : null;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null;

    // Marketplace filter (comma-separated: shopee,tokopedia,...)
    const marketplacesParam = (searchParams.get("marketplaces") || "").trim().toLowerCase();
    const marketplaceFilter = marketplacesParam
      ? marketplacesParam.split(",").map(m => m.trim()).filter(Boolean)
      : [];
    
    // Pagination — default 100, max 500
    const rawLimit = parseInt(searchParams.get("limit") || "100", 10);
    const limit = Math.min(Math.max(rawLimit || 100, 1), 500);
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const page = Math.max(rawPage || 1, 1);

    // === 1. Ambil produk manual dari DB (prioritas utama) ===
    const categories = await db.category.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
    });

    // Tentukan kategori target (hanya filter jika user pilih kategori tertentu)
    // Jika "all" atau tidak dipilih, tampilkan SEMUA produk enabled tanpa filter kategori
    const targetCategoryNames =
      categoryId && categoryId !== "all"
        ? categories.filter((c) => c.id === categoryId).map((c) => c.name)
        : []; // kosong = tidak filter berdasarkan kategori

    // Build where clause dengan marketplace + price filter
    const whereClause: any = {
      enabled: true,
      isHidden: { not: true },
      ...(targetCategoryNames.length > 0
        ? { category: { in: targetCategoryNames } }
        : {}),
      ...(marketplaceFilter.length > 0
        ? { marketplace: { in: marketplaceFilter } }
        : {}),
    };
    if (minPrice !== null && !isNaN(minPrice)) {
      whereClause.price = { ...(whereClause.price || {}), gte: minPrice };
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      whereClause.price = { ...(whereClause.price || {}), lte: maxPrice };
    }

    // Count total untuk pagination info
    const totalCount = await db.shopeeProduct.count({ where: whereClause });

    // Ambil produk yang enabled=true DAN isHidden bukan true (null juga ditampilkan)
    // Dengan pagination: limit + skip
    const manualRows = await db.shopeeProduct.findMany({
      where: whereClause,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: (page - 1) * limit,
    });

    const manualProducts: Product[] = manualRows.map(dbRowToProduct);

    // Track ID produk pinned supaya sort "daily-mix" bisa pisahkan (pinned tetap di atas)
    const pinnedIds = new Set(manualRows.filter(r => r.isPinned).map(r => r.id));

    // Inject affiliate URL ke setiap produk
    const tags = await getAffiliateTags();
    const withAffiliate: Product[] = manualProducts.map((p) => ({
      ...p,
      affiliateUrl: p.affiliateUrl || buildAffiliateUrl(p.url, p.marketplace, tags) || p.url,
    }));

    let filtered = withAffiliate;
    if (search) {
      filtered = filtered.filter((p) => p.title.toLowerCase().includes(search));
    }

    let finalProducts: Product[] = filtered;
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    if (filter === "latest") {
      finalProducts = [...filtered].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } else if (filter === "viral") {
      finalProducts = topViralQuarter(filtered);
    } else if (filter === "weekly") {
      const recent = filtered.filter(
        (p) => now - new Date(p.timestamp).getTime() <= sevenDaysMs
      );
      finalProducts = (recent.length > 0 ? recent : filtered).sort(
        (a, b) => b.soldCount - a.soldCount
      );
    }

    // Apply sort (override filter ordering)
    if (sort === "daily-mix") {
      // ─── Daily Mix: acak stabil per hari ───
      // Pakai tanggal hari ini (YYYY-MM-DD) sebagai seed → semua user lihat urutan sama
      // sepanjang hari yang sama. Besok pagi → urutan berubah (acak ulang).
      // Produk pinned tetap di atas (admin kontrol), sisanya diacak stabil.
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const seed = dateStr
        .split("")
        .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
      // PRNG sederhana (mulberry32) — deterministic dari seed tanggal
      let prngState = seed >>> 0;
      const nextRand = () => {
        prngState = (prngState + 0x6D2B79F5) >>> 0;
        let t = prngState;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      // Pisahkan pinned (tetap di atas, urut createdAt desc) dari sisanya (diacak)
      const pinned = finalProducts
        .filter(p => pinnedIds.has(p.id))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const nonPinned = finalProducts.filter(p => !pinnedIds.has(p.id));
      // Assign random number ke tiap produk non-pinned, lalu sort by random number
      const withRandom = nonPinned.map(p => ({ p, r: nextRand() }));
      withRandom.sort((a, b) => a.r - b.r);
      finalProducts = [...pinned, ...withRandom.map(x => x.p)];
    } else if (sort === "price-asc") {
      finalProducts = [...finalProducts].sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      finalProducts = [...finalProducts].sort((a, b) => b.price - a.price);
    } else if (sort === "discount") {
      finalProducts = [...finalProducts].sort(
        (a, b) => (b.discountPercent || 0) - (a.discountPercent || 0)
      );
    } else if (sort === "rating") {
      finalProducts = [...finalProducts].sort(
        (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount
      );
    } else if (sort === "popular") {
      finalProducts = [...finalProducts].sort((a, b) => b.soldCount - a.soldCount);
    }
    // sort === "newest" → default ordering from DB (createdAt desc)

    return NextResponse.json<ProductsResponse>({
      products: finalProducts,
      total: totalCount,
      source: "live",
    });
  } catch (err) {
    console.error("[api/products] Error:", err);
    return NextResponse.json<ProductsResponse>({
      products: [],
      total: 0,
      source: "live",
    });
  }
}
