import type { MetadataRoute } from "next";
import { blogArticles } from "@/lib/blog-data";

const SITE_URL = "https://jelajahbelanja.com";

/**
 * Generate sitemap.xml dinamis untuk SEO.
 * Route: /sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static routes
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
  ];

  // Dynamic routes per kategori (virtual, karena pakai query param ?category=)
  // Google bisa index ini sebagai variasi URL
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
    { filter: "latest", priority: 0.9, change: "hourly" },
    { filter: "viral", priority: 0.95, change: "hourly" },
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

  // Blog article routes
  const blogRoutes: MetadataRoute.Sitemap = blogArticles.map((article) => ({
    url: `${SITE_URL}/artikel/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...blogRoutes];
}
