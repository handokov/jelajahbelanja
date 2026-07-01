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
 * Kalau gak ada prefix yang dikenali, return apa adanya.
 */
export function stripMarketplacePrefix(id: string): string {
  for (const mp of VALID_MARKETPLACES) {
    const prefix = `${mp}-`;
    if (id.startsWith(prefix)) return id.slice(prefix.length);
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
