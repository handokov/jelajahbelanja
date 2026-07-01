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
        disallow: [
          "/api/",
          "/jb-mgr-admin",
          "/jb-mgr-login",
          "/beli/", // redirect-only, tidak perlu di-index
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/categories",
          "/api/affiliate",
          "/jb-mgr-admin",
          "/jb-mgr-login",
          "/beli/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
