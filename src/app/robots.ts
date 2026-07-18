import type { MetadataRoute } from "next";

const SITE_URL = "https://www.jelajahbelanja.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/jb-mgr-admin/",
          "/jb-mgr-login/",
          "/api/",
          "/beli/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
