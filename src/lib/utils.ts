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
 * Ambil 4 kata pertama dari nama + 14 karakter pertama dari ID.
 *
 * Kenapa 14 karakter? Produk yang di-insert dalam batch yang sama (cth: 7 produk
 * Books & Stationery sekaligus) punya cuid prefix yang panjang sama. 8 karakter
 * (timestamp saja) HANYA unik per detik → bisa tabrakan untuk produk batch yang sama.
 * 14 karakter mencakup timestamp + counter + sebagian random → 0 tabrakan di DB production.
 *
 * "Havana Sepatu Sneakers Tali Simpel Kulit Wanita Korea" + "cmra2vybf0006l404k9asi7ms"
 * → "havana-sepatu-sneakers-tali-cmra2vybf0006l4"
 *
 * Backwards compatible: URL lama (8-char shortId atau full ID) tetap jalan karena
 * lookup di page.tsx pakai title-disambiguation kalau ada multiple matches.
 */
export function productSlug(name: string, id: string): string {
  const words = slugify(name).split("-").slice(0, 4).join("-");
  const shortId = id.slice(0, 14);
  return `${words}-${shortId}`;
}

/**
 * Extract short ID dari URL slug.
 * "havana-sepatu-sneakers-tali-cmra2vybf0006l4" → "cmra2vybf0006l4" (14 char, URL baru)
 * "havana-sepatu-sneakers-tali-cmra2vyb"       → "cmra2vyb"          (8 char, URL lama)
 * "cmra2vybf0006l404k9asi7ms"                   → full ID            (URL lama, no title)
 *
 * Kalau slug = full ID (20+ karakter, format cuid), return langsung.
 * Kalau slug = title-shortId, ambil segmen terakhir setelah dash terakhir.
 */
export function extractProductId(slug: string): string {
  // Kalau slug = full ID (20+ karakter, format cuid), return langsung
  if (slug.length >= 20 && /^[a-z0-9]+$/i.test(slug)) {
    return slug;
  }
  // Ambil segmen terakhir setelah dash terakhir (bisa 8 atau 14 char tergantung umur URL)
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
