import type { MetadataRoute } from "next";
<<<<<<< HEAD
import { SITE_URL } from "@/lib/config";
import { db } from "@/lib/db";
import { detectMarketplaceFromUrl } from "@/lib/utils";
=======
import { blogArticles } from "@/lib/blog-data";

const SITE_URL = "https://jelajahbelanja.com";
>>>>>>> 708b746e9744a8c43d24b54b1818a255a7a7fd9e

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
    {
      url: `${SITE_URL}/artikel`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/tentang`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/kontak`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privasi`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/syarat`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/disclaimer`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
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

<<<<<<< HEAD
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
=======
  // Blog article routes
  const blogRoutes: MetadataRoute.Sitemap = blogArticles.map((article) => ({
    url: `${SITE_URL}/artikel/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...blogRoutes];
>>>>>>> 708b746e9744a8c43d24b54b1818a255a7a7fd9e
}
