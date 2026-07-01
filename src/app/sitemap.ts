import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { db } from "@/lib/db";
import { detectMarketplaceFromUrl } from "@/lib/utils";

/**
 * Generate sitemap.xml dinamis untuk SEO.
 * Route: /sitemap.xml
 *
 * Include:
 * - Homepage + filter variations
 * - Category filter URLs
 * - Semua produk aktif (ini yang paling penting untuk Google index!)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // === 1. Static routes ===
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
  ];

  // === 2. Category filter variations ===
  const categories = [
    "elektronik",
    "fashion",
    "beauty",
    "home",
    "gaming",
    "olahraga",
    "mainan",
    "otomotif",
  ];

  const filters: Array<{ filter: string; priority: number; change: "hourly" | "daily" }> = [
    { filter: "populer", priority: 0.95, change: "hourly" },
    { filter: "latest", priority: 0.9, change: "hourly" },
    { filter: "viral", priority: 0.9, change: "hourly" },
    { filter: "weekly", priority: 0.85, change: "daily" },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = [];
  for (const cat of categories) {
    for (const f of filters) {
      categoryRoutes.push({
        url: `${SITE_URL}/?category=${cat}&filter=${f.filter}`,
        lastModified: now,
        changeFrequency: f.change,
        priority: f.priority,
      });
    }
  }

  // === 3. Dynamic product pages (THE MOST IMPORTANT FOR GOOGLE INDEX) ===
  // Setiap produk punya URL: /produk/{marketplace}-{id}
  // Google butuh ini di sitemap supaya bisa discover semua produk
  let productRoutes: MetadataRoute.Sitemap = [];

  try {
    const products = await db.shopeeProduct.findMany({
      where: {
        enabled: true,
        isHidden: { not: true },
      },
      select: {
        id: true,
        title: true,
        url: true,
        marketplace: true,
        updatedAt: true,
        createdAt: true,
        soldCount: true,
        isViral: true,
      },
      orderBy: { soldCount: "desc" },
      // Batasi 1000 produk teratas — kalau sudah lebih, Google tetap bisa
      // discover sisanya via internal links (product recommendations)
      take: 1000,
    });

    productRoutes = products.map((p) => {
      // Resolve marketplace: kalau DB bilang "shopee" tapi URL-nya tokopedia, pakai URL
      const mp = p.marketplace || detectMarketplaceFromUrl(p.url);

      return {
        url: `${SITE_URL}/produk/${mp}-${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: "daily" as const,
        // Priority berdasarkan popularitas:
        // - Viral + best seller = 0.9
        // - Best seller = 0.8
        // - Regular = 0.7
        priority: p.isViral ? 0.9 : p.soldCount > 1000 ? 0.8 : 0.7,
      };
    });
  } catch (err) {
    // Kalau DB error, jangan block seluruh sitemap
    console.error("[sitemap] Failed to load products:", err);
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
