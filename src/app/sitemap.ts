import { db } from "@/lib/db";
import type { MetadataRoute } from "next";
import { slugify, productSlug } from "@/lib/utils";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.jelajahbelanja.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/artikel`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/tentang`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/kontak`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privasi`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/syarat`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/disclaimer`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Category pages — pakai slug dari nama kategori (bukan ID)
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const cats = await db.category.findMany({
      where: { enabled: true },
      select: { id: true, name: true, updatedAt: true, order: true },
      orderBy: { order: "asc" },
    });
    categoryPages = cats.map(c => ({
      url: `${SITE_URL}/kategori/${slugify(c.name)}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch (err) {
    console.error("[sitemap] Failed to fetch categories:", err);
  }

  // Product pages — hanya yang enabled + not hidden
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await db.shopeeProduct.findMany({
      where: { enabled: true, isHidden: { not: true } },
      select: { id: true, title: true, updatedAt: true, isPinned: true, isViral: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    productPages = products.map((p) => ({
      url: `${SITE_URL}/produk/${productSlug(p.title, p.id)}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: p.isPinned || p.isViral ? 0.8 : 0.6,
    }));
  } catch (err) {
    console.error("[sitemap] Failed to fetch products:", err);
  }

  // Blog articles — dari DB (AI generated), bukan hardcode
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const articles = await db.blogArticle.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });
    blogPages = articles.map(a => ({
      url: `${SITE_URL}/artikel/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.error("[sitemap] Failed to fetch blog articles:", err);
  }

  return [...staticPages, ...categoryPages, ...productPages, ...blogPages];
}
