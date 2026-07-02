import { db } from "@/lib/db";
import type { MetadataRoute } from "next";

const SITE_URL = "https://jelajahbelanja.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
  ];

  // Dynamic product pages
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await db.shopeeProduct.findMany({
      where: { enabled: true, isHidden: { not: true } },
      select: {
        id: true,
        updatedAt: true,
        isPinned: true,
        isViral: true,
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    productPages = products.map((p) => ({
      url: `${SITE_URL}/produk/shopee-${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: p.isPinned || p.isViral ? 0.8 : 0.6,
    }));
  } catch (err) {
    console.error("[sitemap] Failed to fetch products:", err);
  }

  return [...staticPages, ...productPages];
}
