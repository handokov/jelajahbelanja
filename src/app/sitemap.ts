import { db } from "@/lib/db";
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jelajahbelanja.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages — semua halaman non-produk
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/artikel`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/tentang`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/kontak`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privasi`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/syarat`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/disclaimer`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Category pages — /kategori/{id}
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const cats = await db.category.findMany({
      where: { enabled: true },
      select: { id: true, name: true, updatedAt: true, order: true },
      orderBy: { order: "asc" },
    });
    categoryPages = cats.map(c => ({
      url: `${SITE_URL}/kategori/${c.id}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch (err) {
    console.error("[sitemap] Failed to fetch categories:", err);
  }

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
      url: `${SITE_URL}/produk/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: p.isPinned || p.isViral ? 0.8 : 0.6,
    }));
  } catch (err) {
    console.error("[sitemap] Failed to fetch products:", err);
  }

  // Blog articles
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    // Cek apakah ada artikel di filesystem
    const blogSlugs = ["cara-aman-belanja-online-shopee", "produk-viral-tiktok-worth-it", "rahasia-diskon-shopee"];
    blogPages = blogSlugs.map((slug) => ({
      url: `${SITE_URL}/artikel/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  } catch (err) {
    console.error("[sitemap] Failed to fetch blog:", err);
  }

  return [...staticPages, ...categoryPages, ...productPages, ...blogPages];
}
