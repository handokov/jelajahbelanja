import type { Product } from "@/lib/types";
import { USD_TO_IDR } from "@/lib/config";
import {
  computeSoldPerDay,
  computeViralScore,
  VIRAL_SCORE_THRESHOLD,
} from "@/lib/viral-score";

const ALIEXPRESS_RAPIDAPI_HOST = "aliexpress-data-scraper.p.rapidapi.com";

function hasRapidApiKey(): boolean {
  return Boolean(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY.trim().length > 0);
}

// USD_TO_IDR imported from config.ts

interface AliExpressProduct {
  product_id?: string | number;
  product_title?: string;
  product_title_en?: string;
  title?: string;
  product_detail_url?: string;
  sales?: string | number;
  sold?: string | number;
  orders?: string | number;
  evaluate_rate?: string;
  star_rating?: string | number;
  rating?: string | number;
  product_price?: string;
  sale_price?: string;
  original_price?: string;
  max_price?: string;
  min_price?: string;
  product_image?: string;
  img_url?: string;
  images?: string[];
  lastest_volume?: number;
  first_input_time?: string | number;
}

interface AliExpressResponse {
  result?: {
    products?: AliExpressProduct[];
  } | AliExpressProduct[];
  products?: AliExpressProduct[];
  data?: {
    products?: AliExpressProduct[];
  };
}

/**
 * Parse angka dari berbagai format: "1.2k", "1234", "1,2rb", dll.
 */
function parseCount(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const str = String(value).toLowerCase().trim();
  if (!str) return 0;
  // Konversi k (k) dan rb (ribu)
  let multiplier = 1;
  let numStr = str;
  if (numStr.endsWith("k")) {
    multiplier = 1_000;
    numStr = numStr.slice(0, -1);
  } else if (numStr.endsWith("rb")) {
    multiplier = 1_000;
    numStr = numStr.slice(0, -2);
  } else if (numStr.endsWith("jt") || numStr.endsWith("m")) {
    multiplier = 1_000_000;
    numStr = numStr.slice(0, -2);
  }
  // Bersihkan koma/titik pemisah ribuan
  numStr = numStr.replace(/[,.]/g, (m, off, full) => {
    // kalau char terakhir adalah koma/titik -> dianggap desimal
    return off === full.length - 1 ? "." : "";
  });
  const num = parseFloat(numStr);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * multiplier);
}

/**
 * Parse harga dari string USD ke Rupiah.
 */
function parsePrice(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Math.round(value * USD_TO_IDR);
  const str = String(value).replace(/[^0-9.,]/g, "");
  if (!str) return 0;
  // Asumsi format US: $12.99
  const num = parseFloat(str.replace(/,/g, ""));
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * USD_TO_IDR);
}

function parseRating(value: unknown): number {
  if (value == null) return 4.5;
  if (typeof value === "number") return Math.min(5, Math.max(0, value));
  const str = String(value).replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  if (!Number.isFinite(num)) return 4.5;
  // Kadang evaluate_rate adalah persen (95.2% = 4.76)
  if (num > 5) return Math.min(5, Math.max(0, num / 100 * 5));
  return Math.min(5, Math.max(0, num));
}

/**
 * Fetch produk dari AliExpress Hot Products via RapidAPI.
 * @param category slug kategori AliExpress (mis. "consumer-electronics")
 * @param categoryName nama kategori untuk display
 * @param country kode negara, default "ID"
 */
export async function fetchAliExpressHotProducts(
  category: string,
  categoryName: string,
  country = "ID"
): Promise<Product[]> {
  if (!hasRapidApiKey()) {
    return [];
  }

  const url = `https://${ALIEXPRESS_RAPIDAPI_HOST}/hot_products?category=${encodeURIComponent(
    category
  )}&country=${encodeURIComponent(country)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY!,
        "X-RapidAPI-Host": ALIEXPRESS_RAPIDAPI_HOST,
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.warn(`[aliexpress] HTTP ${res.status} for category ${category}`);
      return [];
    }

    const data = (await res.json()) as AliExpressResponse;
    // Bentuk response bisa bervariasi tergantung API provider
    const productsRaw: AliExpressProduct[] =
      (Array.isArray(data.result) ? data.result : data.result?.products) ||
      data.products ||
      data.data?.products ||
      [];

    if (!Array.isArray(productsRaw) || productsRaw.length === 0) return [];

    return productsRaw.slice(0, 20).map((p, idx) => {
      const title =
        p.product_title?.trim() ||
        p.product_title_en?.trim() ||
        p.title?.trim() ||
        `AliExpress Hot Product #${idx + 1}`;
      const url = p.product_detail_url || "https://www.aliexpress.com";
      const image =
        p.product_image ||
        p.img_url ||
        (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "") ||
        "";

      const soldCount = parseCount(p.sales ?? p.sold ?? p.orders ?? p.lastest_volume);
      const price = parsePrice(p.sale_price ?? p.product_price ?? p.min_price);
      const originalPrice = parsePrice(p.original_price ?? p.max_price) || undefined;
      const rating = parseRating(p.star_rating ?? p.rating ?? p.evaluate_rate ?? 4.5);
      const reviewCount = Math.max(soldCount, Math.floor(soldCount * 0.3) + 10);

      // Parse first_input_time (bisa unix epoch dalam ms atau detik)
      let timestamp = new Date();
      if (p.first_input_time) {
        const t = typeof p.first_input_time === "string" ? parseInt(p.first_input_time) : p.first_input_time;
        if (Number.isFinite(t)) {
          // Jika detik, kalikan 1000
          timestamp = new Date(t < 1e12 ? t * 1000 : t);
        }
      }
      if (isNaN(timestamp.getTime())) timestamp = new Date();

      const soldPerDay = computeSoldPerDay(soldCount, timestamp.toISOString());
      const discountPercent =
        originalPrice && originalPrice > price
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : undefined;

      const viralScore = computeViralScore({
        soldPerDay,
        rating,
        reviewCount,
        timestamp: timestamp.toISOString(),
        price: price || 100000,
        originalPrice,
        title,
      });

      return {
        id: `aliexpress-${category}-${p.product_id ?? idx}`,
        title,
        url,
        image,
        price: price || 100000,
        originalPrice,
        discountPercent,
        rating,
        reviewCount,
        soldCount,
        soldPerDay: Math.round(soldPerDay * 10) / 10,
        timestamp: timestamp.toISOString(),
        marketplace: "aliexpress",
        category: categoryName,
        viralScore: Math.round(viralScore * 100) / 100,
        isViral: viralScore >= VIRAL_SCORE_THRESHOLD,
      } satisfies Product;
    });
  } catch (err) {
    console.warn(`[aliexpress] Failed to fetch category ${category}:`, err);
    return [];
  }
}

/**
 * Cek apakah sumber AliExpress aktif (ada API key).
 */
export function isAliExpressAvailable(): boolean {
  return hasRapidApiKey();
}
