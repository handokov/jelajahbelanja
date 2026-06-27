import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureCategoriesSeeded, ensureAffiliateTagsSeeded } from "@/lib/seed";
import { fetchAmazonBestSellers } from "@/lib/sources/amazon-rss";
import { fetchAliExpressHotProducts, isAliExpressAvailable } from "@/lib/sources/aliexpress";
import { generateMockProducts } from "@/lib/sources/mock";
import { buildAffiliateUrl, getAffiliateTags } from "@/lib/affiliate";
import { topViralQuarter } from "@/lib/viral-score";
import type { Product, ProductsResponse, ProductFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/products?category=<id>&filter=latest|viral|weekly&search=<q>
 *
 * - category: id kategori (cuid). Jika kosong -> ambil dari semua kategori enabled.
 * - filter: latest (sort by timestamp desc), viral (top 25% by score),
 *           weekly (best seller 7 hari terakhir).
 * - search: kata kunci pencarian (filter judul produk).
 *
 * Setiap produk yang dikembalikan sudah disisipkan `affiliateUrl` berdasarkan
 * tag affiliate yang tersimpan di DB (per marketplace).
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

    const categories = await db.category.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
    });

    if (categories.length === 0) {
      return NextResponse.json<ProductsResponse>({
        products: [],
        total: 0,
        source: "mock",
      });
    }

    const targetCategories =
      categoryId && categoryId !== "all"
        ? categories.filter((c) => c.id === categoryId)
        : categories;

    const aliExpressEnabled = isAliExpressAvailable();

    const fetchPromises = targetCategories.map(async (cat) => {
      const slug = cat.name.toLowerCase();
      const mockProducts = generateMockProducts(slug, cat.name, 10);

      const amazonPromise = cat.amazonNode
        ? fetchAmazonBestSellers(cat.amazonNode, cat.name)
        : Promise.resolve([]);

      const aliexpressPromise =
        cat.aliexpressCat && aliExpressEnabled
          ? fetchAliExpressHotProducts(cat.aliexpressCat, cat.name)
          : Promise.resolve([]);

      const [amazonProducts, aliexpressProducts] = await Promise.all([
        amazonPromise,
        aliexpressPromise,
      ]);

      const liveProducts = [...amazonProducts, ...aliexpressProducts];
      const productsForCategory =
        liveProducts.length > 0 ? liveProducts : mockProducts;

      return {
        products: productsForCategory,
        source: liveProducts.length > 0 ? ("live" as const) : ("mock" as const),
      };
    });

    const results = await Promise.all(fetchPromises);
    const allProducts: Product[] = results.flatMap((r) => r.products);
    const anyLive = results.some((r) => r.source === "live");
    const overallSource: "live" | "mock" = anyLive ? "live" : "mock";

    // Inject affiliate URL ke setiap produk
    const tags = await getAffiliateTags();
    const withAffiliate: Product[] = allProducts.map((p) => ({
      ...p,
      affiliateUrl: buildAffiliateUrl(p.url, p.marketplace, tags) || p.url,
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

    return NextResponse.json<ProductsResponse>({
      products: finalProducts,
      total: finalProducts.length,
      source: overallSource,
    });
  } catch (err) {
    console.error("[api/products] Error:", err);
    const fallback = generateMockProducts("elektronik", "Elektronik", 12);
    // Tetap inject affiliate URL untuk fallback
    const tags = await getAffiliateTags();
    const withAffiliate = fallback.map((p) => ({
      ...p,
      affiliateUrl: buildAffiliateUrl(p.url, p.marketplace, tags) || p.url,
    }));
    return NextResponse.json<ProductsResponse>({
      products: withAffiliate,
      total: withAffiliate.length,
      source: "mock",
    });
  }
}
