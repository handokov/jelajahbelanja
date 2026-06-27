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
