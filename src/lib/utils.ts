import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Slugify — convert nama kategori ke URL-friendly slug.
 * "Fashion Wanita" → "fashion-wanita"
 * "Home & Living" → "home-living"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // hapus karakter khusus
    .replace(/[\s_-]+/g, "-") // spasi/underscore → dash
    .replace(/^-+|-+$/g, ""); // hapus dash di awal/akhir
}

/**
 * Product Slug — buat URL produk pendek + SEO friendly.
 * Ambil 4 kata pertama dari nama + 8 karakter pertama dari ID.
 *
 * "Havana Sepatu Sneakers Tali Simpel Kulit Wanita Korea" + "cmra2vybf0006l404k9asi7ms"
 * → "havana-sepatu-sneakers-tali-cmra2vyb"
 *
 * Backwards compatible: URL lama (full ID) tetap jalan.
 */
export function productSlug(name: string, id: string): string {
  const words = slugify(name).split("-").slice(0, 4).join("-");
  const shortId = id.slice(0, 8);
  return `${words}-${shortId}`;
}

/**
 * Extract full product ID dari URL slug.
 * "havana-sepatu-sneakers-tali-cmra2vyb" → cari produk yang ID-nya start dengan "cmra2vyb"
 * Kalau slug = full ID (URL lama), return langsung.
 */
export function extractProductId(slug: string): string {
  // Kalau slug = full ID (25+ karakter, format cuid), return langsung
  if (slug.length >= 20 && /^[a-z0-9]+$/i.test(slug)) {
    return slug;
  }
  // Ambil 8 karakter terakhir setelah dash terakhir
  const parts = slug.split("-");
  const shortId = parts[parts.length - 1];
  return shortId;
}

/**
 * Detect marketplace dari URL produk.
 * Mendukung: shopee, tokopedia, lazada, blibli, bukalapak, zalora, sociolla,
 * aliexpress, amazon, tiktok.
 *
 * Juga handle shortlink affiliate (invl.me, atid.me, shope.ee, dll)
 * yang include URL marketplace asli di query param `url=`.
 */
export function detectMarketplaceFromUrl(rawUrl: string): string {
  if (!rawUrl) return "shopee";

  let url = rawUrl;
  try {
    // Decode kalau ada URL encoding
    url = decodeURIComponent(rawUrl);
  } catch { /* ignore */ }

  const lower = url.toLowerCase();

  // Cek query param `url=` dulu (untuk shortlink affiliate invl.me, atid.me)
  const urlParamMatch = url.match(/[?&]url=([^&]+)/i);
  if (urlParamMatch) {
    try {
      const decoded = decodeURIComponent(urlParamMatch[1]).toLowerCase();
      // Recursive check dengan URL asli yang sudah di-decode
      if (decoded.includes("blibli.com")) return "blibli";
      if (decoded.includes("tokopedia.com")) return "tokopedia";
      if (decoded.includes("shopee.co.id") || decoded.includes("shopee.com")) return "shopee";
      if (decoded.includes("lazada.co.id")) return "lazada";
      if (decoded.includes("bukalapak.com")) return "bukalapak";
      if (decoded.includes("zalora.co.id")) return "zalora";
      if (decoded.includes("sociolla.com")) return "sociolla";
      if (decoded.includes("aliexpress.com")) return "aliexpress";
      if (decoded.includes("amazon.")) return "amazon";
      if (decoded.includes("tiktok.com/shop") || decoded.includes("shop.tiktok")) return "tiktok";
    } catch { /* ignore */ }
  }

  // Cek URL langsung
  if (lower.includes("blibli.com")) return "blibli";
  if (lower.includes("tokopedia.com")) return "tokopedia";
  if (lower.includes("shopee.co.id") || lower.includes("shopee.com") || lower.includes("shope.ee")) return "shopee";
  if (lower.includes("lazada.co.id")) return "lazada";
  if (lower.includes("bukalapak.com")) return "bukalapak";
  if (lower.includes("zalora.co.id")) return "zalora";
  if (lower.includes("sociolla.com")) return "sociolla";
  if (lower.includes("aliexpress.com")) return "aliexpress";
  if (lower.includes("amazon.")) return "amazon";
  if (lower.includes("tiktok.com/shop") || lower.includes("shop.tiktok")) return "tiktok";

  // Default
  return "shopee";
}
