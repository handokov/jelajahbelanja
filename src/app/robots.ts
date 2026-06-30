import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/**
 * Generate robots.txt untuk SEO.
 * Route: /robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      // Bot boleh crawl API products karena return-nya HTML-friendly JSON
      // tapi kita block admin endpoint lain
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/categories", "/api/affiliate"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
