import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { injectAffiliateUrls } from "@/lib/affiliate";
import { dbRowToProduct } from "@/lib/product-mapper";
import type { Product, ProductsResponse, ProductFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

// === In-memory cache untuk menghindari seed check setiap request ===
let seedChecked = false;

/**
 * Jalankan seed check hanya sekali per cold start.
 * Setelah itu skip — data tidak akan hilang sendiri di DB.
 */
async function ensureSeededOnce(): Promise<void> {
  if (seedChecked) return;
  try {
    const { ensureCategoriesSeeded, ensureAffiliateTagsSeeded } = await import("@/lib/seed");
    await ensureCategoriesSeeded();
    await ensureAffiliateTagsSeeded();
    seedChecked = true;
  } catch {
    // Jangan block request kalau seed gagal
  }
}

// === Cache kategori (TTL 5 menit) ===
let cachedCategories: { id: string; name: string }[] | null = null;
let categoriesExpiry = 0;
const CATEGORIES_TTL = 5 * 60 * 1000;

async function getCategories() {
  if (cachedCategories && Date.now() < categoriesExpiry) {
    return cachedCategories;
  }
  const cats = await db.category.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });
  cachedCategories = cats;
  categoriesExpiry = Date.now() + CATEGORIES_TTL;
  return cats;
}

/**
 * GET /api/products?category=<id>&filter=latest|viral|weekly|populer&search=<q>&page=1&limit=24
 *
 * Optimized:
 * - Seed check hanya sekali per cold start
 * - Kategori di-cache 5 menit
 * - Sorting & pagination dilakukan di DB (bukan di JS)
 * - Hanya load 1 halaman data, bukan semua produk
 */
export async function GET(req: NextRequest) {
  try {
    await ensureSeededOnce();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category") || "";
    const filterParam = (searchParams.get("filter") as ProductFilter) || "populer";
    const filter: ProductFilter = ["latest", "viral", "weekly", "populer"].includes(filterParam)
      ? filterParam
      : "populer";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10)));

    // === 1. Ambil kategori (cached) ===
    const categories = await getCategories();
    const targetCategories =
      categoryId && categoryId !== "all"
        ? categories.filter((c) => c.id === categoryId)
        : categories;
    const targetCategoryNames = targetCategories.map((c) => c.name);

    // === 2. Build WHERE clause ===
    const whereClause: any = {
      enabled: true,
      isHidden: { not: true },
      ...(targetCategoryNames.length > 0
        ? { category: { in: targetCategoryNames } }
        : {}),
    };

    // Search filter di DB level (case-insensitive via contains)
    if (search) {
      whereClause.title = { contains: search, mode: "insensitive" };
    }

    // === 3. Pilih ORDER BY berdasarkan filter (DB-level sort) ===
    let orderBy: any[];

    switch (filter) {
      case "latest":
        orderBy = [{ isPinned: "desc" }, { createdAt: "desc" }];
        break;
      case "viral":
        orderBy = [{ isPinned: "desc" }, { isViral: "desc" }, { soldCount: "desc" }, { rating: "desc" }];
        break;
      case "weekly":
        // DB-level: sort by soldCount (approximation — exact 7-day filter done below if needed)
        orderBy = [{ isPinned: "desc" }, { soldCount: "desc" }, { rating: "desc" }];
        break;
      case "populer":
        // Smart sort: prioritize viral, then sold count (strong signal), then rating, then recency
        orderBy = [{ isPinned: "desc" }, { isViral: "desc" }, { soldCount: "desc" }, { rating: "desc" }, { reviewCount: "desc" }, { createdAt: "desc" }];
        break;
      default:
        orderBy = [{ isPinned: "desc" }, { createdAt: "desc" }];
    }

    // === 4. Count total (for pagination) ===
    const total = await db.shopeeProduct.count({ where: whereClause });

    // === 5. Fetch only 1 page from DB ===
    const skip = (page - 1) * limit;
    const manualRows = await db.shopeeProduct.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
    });

    let manualProducts: Product[] = manualRows.map(dbRowToProduct);

    // === 6. Inject affiliate URLs ===
    const withAffiliate = await injectAffiliateUrls(manualProducts);

    // === 7. Weekly filter: if we need exact 7-day filtering, do post-filter ===
    let finalProducts: Product[] = withAffiliate;
    let finalTotal = total;

    if (filter === "weekly") {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      // We already fetched sorted by soldCount from DB
      // Check if there are products from last 7 days
      const recentCount = await db.shopeeProduct.count({
        where: {
          ...whereClause,
          createdAt: { gte: new Date(now - sevenDaysMs) },
        },
      });

      if (recentCount > 0) {
        // Re-fetch with 7-day filter
        const recentRows = await db.shopeeProduct.findMany({
          where: {
            ...whereClause,
            createdAt: { gte: new Date(now - sevenDaysMs) },
          },
          orderBy,
          skip,
          take: limit,
        });
        finalProducts = await injectAffiliateUrls(recentRows.map(dbRowToProduct));
        finalTotal = recentCount;
      }
      // If no recent products, fall back to all-time (already fetched above)
    }

    // Viral: only show top 25% (approximation via DB — only show viral-flagged)
    if (filter === "viral") {
      // Already sorted by isViral desc, soldCount desc — just count viral ones
      const viralCount = await db.shopeeProduct.count({
        where: { ...whereClause, isViral: true },
      });
      finalTotal = viralCount;
    }

    const hasMore = skip + limit < finalTotal;

    return NextResponse.json<ProductsResponse>({
      products: finalProducts,
      total: finalTotal,
      source: "live",
      page,
      limit,
      hasMore,
    });
  } catch (err) {
    console.error("[api/products] Error:", err);
    return NextResponse.json<ProductsResponse>({
      products: [],
      total: 0,
      source: "live",
      page: 1,
      limit: PAGE_SIZE,
      hasMore: false,
    });
  }
}
