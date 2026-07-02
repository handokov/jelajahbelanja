import { db } from "@/lib/db";
import type { Marketplace } from "@/lib/types";

/**
 * Mapping parameter affiliate per marketplace Indonesia:
 * - Shopee: ?utm_source=an_<id>&utm_medium=affiliates  (lihat https://affiliate.shopee.co.id)
 * - Tokopedia: ?aff_code=<tag>  (lihat https://affiliate.tokopedia.com)
 * - Lazada: ?aff_id=<id>&aff_sub=<sub>  (lihat https://www.lazada.co.id/wow)
 * - AliExpress: ?aff_fcid=<tag>  (lihat portals.aliexpress.com)
 * - Bukalapak: ?aff_id=<tag>
 * - Blibli: ?affiliateCode=<tag>
 */
const AFFILIATE_PARAM: Record<Marketplace, string> = {
  shopee: "utm_source",
  tokopedia: "aff_code",
  lazada: "aff_id",
  aliexpress: "aff_fcid",
  amazon: "tag",
  mock: "",
};

/**
 * Parameter tambahan per marketplace (selain parameter utama).
 * Shopee butuh utm_medium, utm_campaign, dll.
 */
const AFFILIATE_EXTRA_PARAMS: Record<Marketplace, Record<string, string>> = {
  shopee: {
    utm_medium: "affiliates",
    utm_campaign: "id_jelajahbelanja",
    utm_content: "jelajahbelanja",
  },
  tokopedia: {},
  lazada: {},
  aliexpress: {},
  amazon: {},
  mock: {},
};

/**
 * Cache in-memory untuk affiliate tags supaya tidak query DB setiap request.
 */
let cachedTags: Record<string, string> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 menit

/**
 * Ambil semua affiliate tag dari DB (dengan cache 1 menit).
 * Return: { shopee: "tagAnda", tokopedia: "...", ... }
 */
export async function getAffiliateTags(): Promise<Record<string, string>> {
  if (cachedTags && Date.now() < cacheExpiry) {
    return cachedTags;
  }
  try {
    const rows = await db.affiliateTag.findMany({
      where: { enabled: true },
    });
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (row.tag && row.tag.trim()) {
        map[row.marketplace] = row.tag.trim();
      }
    }
    cachedTags = map;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return map;
  } catch (err) {
    console.error("[affiliate] Failed to load tags:", err);
    return cachedTags ?? {};
  }
}

/**
 * Invalidate cache (dipanggil setelah update affiliate tag).
 */
export function invalidateAffiliateCache(): void {
  cachedTags = null;
  cacheExpiry = 0;
}

/**
 * Build URL affiliate dengan menambahkan parameter sesuai marketplace.
 *
 * Contoh:
 *   buildAffiliateUrl("https://shopee.co.id/product/123", "shopee", "an_123456")
 *   -> "https://shopee.co.id/product/123?utm_source=an_123456&utm_medium=affiliates&utm_campaign=id_jelajahbelanja"
 *
 *   buildAffiliateUrl("https://tokopedia.com/...?src=shop", "tokopedia", "xyz")
 *   -> "https://tokopedia.com/...?src=shop&aff_code=xyz"
 */
export function buildAffiliateUrl(
  url: string,
  marketplace: Marketplace,
  tags: Record<string, string>
): string {
  if (!url) return url;
  const tag = tags[marketplace];
  if (!tag) return url;

  const param = AFFILIATE_PARAM[marketplace];
  if (!param) return url;

  try {
    const u = new URL(url);
    // Jangan append kalau sudah ada (idempotent)
    if (u.searchParams.has(param)) return url;
    u.searchParams.set(param, tag);
    // Tambahkan parameter tambahan (utm_medium, utm_campaign, dll)
    const extras = AFFILIATE_EXTRA_PARAMS[marketplace];
    for (const [key, value] of Object.entries(extras)) {
      if (!u.searchParams.has(key)) {
        u.searchParams.set(key, value);
      }
    }
    return u.toString();
  } catch {
    // URL tidak valid, fallback ke string concat
    const sep = url.includes("?") ? "&" : "?";
    let result = `${url}${sep}${param}=${encodeURIComponent(tag)}`;
    const extras = AFFILIATE_EXTRA_PARAMS[marketplace];
    for (const [key, value] of Object.entries(extras)) {
      result += `&${key}=${encodeURIComponent(value)}`;
    }
    return result;
  }
}

/**
 * Inject affiliate URL ke array produk.
 * Sebelumnya: pola ini duplikat di 3 API route (products, shopee-products, recommendations).
 * Sekarang: panggil injectAffiliateUrls(products) di tiap route.
 */
export async function injectAffiliateUrls<T extends { url: string; marketplace: Marketplace; affiliateUrl?: string }>(
  products: T[]
): Promise<T[]> {
  const tags = await getAffiliateTags();
  return products.map((p) => ({
    ...p,
    affiliateUrl: p.affiliateUrl || buildAffiliateUrl(p.url, p.marketplace, tags) || p.url,
  }));
}

/**
 * Daftar marketplace yang didukung JelajahBelanja.
 */
export const SUPPORTED_MARKETPLACES: Array<{
  id: Marketplace;
  label: string;
  website: string;
  signupUrl: string;
  color: string;
}> = [
  {
    id: "shopee",
    label: "Shopee",
    website: "https://shopee.co.id",
    signupUrl: "https://affiliate.shopee.co.id",
    color: "orange",
  },
  {
    id: "tokopedia",
    label: "Tokopedia",
    website: "https://www.tokopedia.com",
    signupUrl: "https://affiliate.tokopedia.com",
    color: "green",
  },
  {
    id: "lazada",
    label: "Lazada",
    website: "https://www.lazada.co.id",
    signupUrl: "https://www.lazada.co.id/wow/camp/pdhl/id/lazadaaffiliate/index",
    color: "blue",
  },
  {
    id: "aliexpress",
    label: "AliExpress",
    website: "https://www.aliexpress.com",
    signupUrl: "https://portals.aliexpress.com",
    color: "red",
  },
];
