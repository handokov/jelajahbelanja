import type { Product } from "@/lib/types";

const VIRAL_KEYWORDS = [
  "viral",
  "trending",
  "best seller",
  "hot",
  "terlaris",
  "lagi viral",
  "viral tiktok",
  "bestseller",
];

/**
 * Hitung freshness factor berdasarkan umur listing (jam).
 * - <24 jam -> 1.0
 * - <7 hari -> 0.5
 * - lainnya -> 0.1
 */
export function freshnessFactor(isoDate: string): number {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 0.1;
  const hours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  if (hours < 24) return 1.0;
  if (hours < 24 * 7) return 0.5;
  return 0.1;
}

/**
 * Hitung discount depth (0..1). 0 berarti tidak ada diskon.
 */
export function discountDepth(price: number, originalPrice?: number): number {
  if (!originalPrice || originalPrice <= 0 || originalPrice <= price) return 0;
  return Math.min(1, Math.max(0, (originalPrice - price) / originalPrice));
}

/**
 * Bonus skor jika judul mengandung keyword viral.
 */
export function viralKeywordBonus(title: string): number {
  const lower = title.toLowerCase();
  return VIRAL_KEYWORDS.some((k) => lower.includes(k)) ? 5 : 0;
}

/**
 * Hitung viral score sesuai spesifikasi:
 *
 * score = (soldPerDay * 0.35)
 *       + (rating * Math.log10(reviewCount + 1) * 2)
 *       + (freshnessHoursFactor * 0.2)
 *       + (discountDepth * 0.15)
 *       + (viralKeywordBonus * 0.1)
 */
export function computeViralScore(input: {
  soldPerDay: number;
  rating: number;
  reviewCount: number;
  timestamp: string;
  price: number;
  originalPrice?: number;
  title: string;
}): number {
  const soldTerm = input.soldPerDay * 0.35;
  const ratingTerm =
    Math.max(0, input.rating) * Math.log10(input.reviewCount + 1) * 2;
  const freshTerm = freshnessFactor(input.timestamp) * 0.2;
  const discountTerm = discountDepth(input.price, input.originalPrice) * 0.15;
  const keywordTerm = viralKeywordBonus(input.title) * 0.1;

  return soldTerm + ratingTerm + freshTerm + discountTerm + keywordTerm;
}

/**
 * Threshold viral: produk dianggap viral kalau score > 2500.
 * Untuk mock data dengan soldCount ribuan dan daysAgo kecil, soldPerDay
 * menjadi komponen dominan. Threshold ini dipilih supaya ~25-30% produk
 * teratas (sold per day > ~7000) ter-flag viral.
 */
export const VIRAL_SCORE_THRESHOLD = 2500;

/**
 * Hitung soldPerDay berdasarkan soldCount dan tanggal listing.
 */
export function computeSoldPerDay(soldCount: number, isoDate: string): number {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return soldCount / 30; // fallback asumsi 30 hari
  const days = Math.max(1, (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return soldCount / days;
}

/**
 * Tandai produk sebagai viral berdasarkan threshold absolut.
 */
export function markViral(products: Product[]): Product[] {
  return products.map((p) => ({ ...p, isViral: p.viralScore >= VIRAL_SCORE_THRESHOLD }));
}

/**
 * Untuk filter "Viral 24 Jam": ambil top 25% berdasarkan viral score.
 */
export function topViralQuarter(products: Product[]): Product[] {
  if (products.length === 0) return [];
  const sorted = [...products].sort((a, b) => b.viralScore - a.viralScore);
  const cutoff = Math.max(1, Math.ceil(sorted.length * 0.25));
  return sorted.slice(0, cutoff);
}

/**
 * Hitung "popularitas score" untuk filter Populer.
 *
 * Berbeda dari viralScore yang sangat condong ke produk baru (freshness factor tinggi),
 * popularitas score memakai time decay yang lebih halus supaya produk lama yang masih
 * laku keras tetap bisa muncul di atas.
 *
 * Formula:
 *   popScore = (soldPerDay * 0.30)
 *            + (rating * log10(reviewCount + 1) * 2)
 *            + (timeDecayFactor * 0.20)
 *            + (discountDepth * 0.10)
 *            + (viralKeywordBonus * 0.05)
 *            + (soldCountBonus * 0.15)
 *            + (ratingBonus * 0.10)
 *            + (isViralBonus)
 *
 * Dimana:
 *   timeDecayFactor = 1 / (1 + ageInDays / 30)   — decay halus, 50% setelah 30 hari
 *   soldCountBonus  = log10(soldCount + 1)         — skala logaritmik
 *   ratingBonus     = rating >= 4.8 ? 5 : 0        — produk rating tinggi
 *   isViralBonus    = isViral ? 10 : 0             — produk viral dapat boost
 */
export function computePopularityScore(product: Product): number {
  const ageInDays = Math.max(
    1,
    (Date.now() - new Date(product.timestamp).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Time decay halus: 1/(1 + age/30) → produk 30 hari masih punya ~50% freshness
  const timeDecayFactor = 1 / (1 + ageInDays / 30);

  const soldPerDayTerm = product.soldPerDay * 0.30;
  const ratingTerm =
    Math.max(0, product.rating) * Math.log10(product.reviewCount + 1) * 2;
  const freshTerm = timeDecayFactor * 0.20;
  const discountTerm = discountDepth(product.price, product.originalPrice) * 0.10;
  const keywordTerm = viralKeywordBonus(product.title) * 0.05;

  // Sold count bonus (skala log — 10k sold = ~4, 100k sold = ~5, 1M sold = ~6)
  const soldCountBonus = Math.log10(product.soldCount + 1) * 0.15;

  // Rating bonus — produk dengan rating >= 4.8 dapat boost
  const ratingBonus = product.rating >= 4.8 ? 0.10 : 0;

  // Viral bonus
  const isViralBonus = product.isViral ? 10 : 0;

  return (
    soldPerDayTerm +
    ratingTerm +
    freshTerm +
    discountTerm +
    keywordTerm +
    soldCountBonus +
    ratingBonus +
    isViralBonus
  );
}

/**
 * Untuk filter "Populer": sort semua produk berdasarkan popularitas score.
 * Produk lama yang masih laku keras bisa muncul di atas.
 */
export function sortByPopularity(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) => computePopularityScore(b) - computePopularityScore(a)
  );
}
