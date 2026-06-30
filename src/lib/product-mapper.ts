/**
 * Product Mapper — konversi DB ShopeeProduct row → Product DTO.
 *
 * Sebelumnya ada 3 copy fungsi ini (dbRowToProduct / toProduct) di:
 *   - api/products/route.ts
 *   - api/shopee-products/route.ts
 *   - api/recommendations/route.ts  (versi buggy — hardcoded viralScore)
 *
 * Sekali di sini, semua pakai computeViralScore yang konsisten.
 */

import {
  computeSoldPerDay,
  computeViralScore,
  VIRAL_SCORE_THRESHOLD,
} from "@/lib/viral-score";
import { detectMarketplaceFromUrl } from "@/lib/utils";
import type { Product, Marketplace } from "@/lib/types";

/** Tipe parameter — cocok dengan Prisma ShopeeProduct row */
export interface ShopeeProductRow {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  location: string | null;
  category: string;
  url: string;
  affiliateUrl: string | null;
  marketplace: string;
  enabled: boolean;
  isViral: boolean;
  isPinned: boolean;
  isHidden: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Convert DB ShopeeProduct row to Product DTO */

/**
 * Resolve marketplace: jika DB field salah/default ("shopee") tapi URL menunjukkan
 * marketplace lain, percaya URL-nya. Ini fix kasus produk Tokopedia yang marketplace-nya
 * tertulis "shopee" di DB karena default value atau scraper yang tidak detect.
 */
function resolveMarketplace(dbMarketplace: string, url: string): Marketplace {
  const fromDb = (dbMarketplace || "shopee") as Marketplace;
  const fromUrl = detectMarketplaceFromUrl(url);

  // Kalau DB bilang "shopee" tapi URL-nya tokopedia/lazada/aliexpress/amazon,
  // percaya URL (karena DB default = "shopee", sering salah).
  if (fromDb === "shopee" && fromUrl !== "shopee") {
    return fromUrl;
  }

  // Kalau DB dan URL konsisten, atau DB bukan "shopee", pakai DB value.
  return fromDb;
}

export function dbRowToProduct(row: ShopeeProductRow): Product {
  const ts = row.createdAt.toISOString();
  const soldPerDay = computeSoldPerDay(row.soldCount, ts);
  const viralScore = computeViralScore({
    soldPerDay,
    rating: row.rating,
    reviewCount: row.reviewCount,
    timestamp: ts,
    price: row.price,
    originalPrice: row.originalPrice ?? undefined,
    title: row.title,
  });
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    image: row.image,
    price: row.price,
    originalPrice: row.originalPrice ?? undefined,
    discountPercent: row.discountPercent ?? undefined,
    rating: row.rating,
    reviewCount: row.reviewCount,
    soldCount: row.soldCount,
    soldPerDay,
    timestamp: ts,
    marketplace: resolveMarketplace(row.marketplace, row.url),
    category: row.category,
    viralScore,
    isViral: row.isViral || viralScore >= VIRAL_SCORE_THRESHOLD,
    location: row.location ?? undefined,
  };
}
