import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { VALID_MARKETPLACES } from "@/lib/config"
import type { Marketplace } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip marketplace prefix dari product ID.
 * Contoh: "shopee-abc123" → "abc123", "tokopedia-xyz" → "xyz"
 * "amazon-clx1abc" → "clx1abc"
 *
 * Strategi:
 * 1. Cek known marketplace prefixes dari VALID_MARKETPLACES
 * 2. Fallback: kalau ada hyphen dan bagian sebelum hyphen adalah lowercase word
 *    (bukan CUID yang selalu dimulai 'c' + digit), strip juga.
 *    Ini mencegah 404 kalau ada marketplace baru yang belum di-list.
 *
 * CUID (Prisma default) format: 'c' + timestamp + counter + fingerprint + random
 * CUID TIDAK mengandung hyphen, jadi "word-xxx" aman di-strip.
 */
export function stripMarketplacePrefix(id: string): string {
  // 1. Cek known marketplace prefixes
  for (const mp of VALID_MARKETPLACES) {
    const prefix = `${mp}-`;
    if (id.startsWith(prefix)) return id.slice(prefix.length);
  }

  // 2. Fallback: kalau ada format "lowercaseWord-restOfId", strip prefix-nya.
  //    Marketplace selalu lowercase; CUID dimulai dengan 'c' lalu digit/letter tanpa hyphen.
  const hyphenIdx = id.indexOf("-");
  if (hyphenIdx > 0) {
    const prefix = id.slice(0, hyphenIdx);
    // Prefix harus pure lowercase (marketplace name), bukan bagian dari CUID
    if (/^[a-z]+$/.test(prefix) && prefix.length >= 3 && prefix.length <= 15) {
      return id.slice(hyphenIdx + 1);
    }
  }

  return id;
}

/**
 * @deprecated Alias for stripMarketplacePrefix(). Will be removed in next cleanup.
 */
export const stripShopeePrefix = stripMarketplacePrefix;

/**
 * Auto-detect marketplace dari URL produk.
 * Dipakai sebagai fallback kalau field marketplace di DB kosong/salah.
 *
 * Contoh:
 *   detectMarketplaceFromUrl("https://tokopedia.com/xxx") → "tokopedia"
 *   detectMarketplaceFromUrl("https://shopee.co.id/xxx") → "shopee"
 *   detectMarketplaceFromUrl("https://lazada.co.id/xxx") → "lazada"
 *   detectMarketplaceFromUrl("https://aliexpress.com/xxx") → "aliexpress"
 *   detectMarketplaceFromUrl("unknown") → "shopee" (default)
 */
export function detectMarketplaceFromUrl(url: string): Marketplace {
  if (!url) return "shopee";
  const lower = url.toLowerCase();
  if (lower.includes("tokopedia")) return "tokopedia";
  if (lower.includes("shopee")) return "shopee";
  if (lower.includes("lazada")) return "lazada";
  if (lower.includes("aliexpress")) return "aliexpress";
  if (lower.includes("amazon")) return "amazon";
  return "shopee"; // default fallback
}
