import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureCategoriesSeeded, ensureAffiliateTagsSeeded } from "@/lib/seed";
import { injectAffiliateUrls } from "@/lib/affiliate";
import { topViralQuarter } from "@/lib/viral-score";
import { dbRowToProduct } from "@/lib/product-mapper";
import type { Product, ProductsResponse, ProductFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/products?category=<id>&filter=latest|viral|weekly&search=<q>
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

    // === 1. Ambil produk manual dari DB (prioritas utama) ===
    const categories = await db.category.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
    });

    // Tentukan kategori target
    const targetCategories =
      categoryId && categoryId !== "all"
        ? categories.filter((c) => c.id === categoryId)
        : categories;

    const targetCategoryNames = targetCategories.map((c) => c.name);

    // Ambil produk yang enabled=true DAN isHidden bukan true (null juga ditampilkan)
    const manualRows = await db.shopeeProduct.findMany({
      where: {
        enabled: true,
        isHidden: { not: true },
        ...(targetCategoryNames.length > 0
          ? { category: { in: targetCategoryNames } }
          : {}),
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    const manualProducts: Product[] = manualRows.map(dbRowToProduct);

    // Inject affiliate URL ke setiap produk
    const withAffiliate = await injectAffiliateUrls(manualProducts);

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

    return NextResponse.json<ProductsResponse>({
      products: finalProducts,
      total: finalProducts.length,
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
