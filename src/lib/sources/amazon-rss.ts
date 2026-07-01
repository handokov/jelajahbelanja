import { XMLParser } from "fast-xml-parser";
import type { Product } from "@/lib/types";
import { USD_TO_IDR } from "@/lib/config";
import {
  computeSoldPerDay,
  computeViralScore,
  VIRAL_SCORE_THRESHOLD,
} from "@/lib/viral-score";

interface AmazonRSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
}

interface AmazonRSSResponse {
  rss?: {
    channel?: {
      item?: AmazonRSSItem | AmazonRSSItem[];
    };
  };
}

// USD_TO_IDR imported from config.ts

/**
 * Extract harga dari HTML description Amazon RSS.
 * Format umum: <b>Price:</b> $12.99<br />
 */
function extractPrice(html: string): { price: number; originalPrice?: number } {
  // Match "Price: $X.XX" atau "<b>Price:</b> $X.XX"
  const priceMatch = html.match(/Price:\s*\$?([\d,]+\.?\d*)/i);
  if (!priceMatch) return { price: 0 };
  const usd = parseFloat(priceMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(usd)) return { price: 0 };
  return { price: Math.round(usd * USD_TO_IDR) };
}

/**
 * Extract URL gambar dari tag <img src="..."> di description.
 */
function extractImage(html: string): string {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? "";
}

/**
 * Extract rating dari description Amazon RSS.
 * Format umum: <b>Rating:</b> 4.5 atau "4.5 out of 5 stars"
 */
function extractRating(html: string): number {
  const ratingMatch = html.match(/(\d\.?\d?)\s*out of\s*5\s*stars/i);
  if (ratingMatch) return Math.min(5, Math.max(0, parseFloat(ratingMatch[1])));
  const altMatch = html.match(/Rating:\s*(\d\.?\d?)/i);
  if (altMatch) return Math.min(5, Math.max(0, parseFloat(altMatch[1])));
  return 4.5; // default kalau tidak ditemukan
}

/**
 * Generate random review count & sold count karena Amazon RSS tidak menyediakan ini.
 * Pakai hash deterministik dari title supaya stabil antar request.
 */
function deriveReviewAndSold(title: string, daysAgo: number): { reviewCount: number; soldCount: number } {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const reviewCount = 50 + (positiveHash % 5000);
  const soldMultiplier = 5 + ((positiveHash >> 8) % 50);
  const soldCount = Math.max(10, Math.floor(reviewCount * soldMultiplier * 0.6));
  // Koreksi: kalau listing baru (<3 hari), sold lebih kecil
  const dayScale = Math.min(1, Math.max(0.2, daysAgo / 30));
  return {
    reviewCount,
    soldCount: Math.floor(soldCount * dayScale),
  };
}

/**
 * Fetch dan parse Amazon Best Sellers RSS feed.
 * @param node Amazon bestsellers node ID (mis. "172282" untuk electronics)
 * @param categoryName nama kategori untuk display
 */
export async function fetchAmazonBestSellers(
  node: string,
  categoryName: string
): Promise<Product[]> {
  const url = `https://www.amazon.com/gp/bestsellers/${node}/rss`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      // Cache 5 menit di runtime server
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.warn(`[amazon-rss] HTTP ${res.status} for node ${node}`);
      return [];
    }

    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(xml) as AmazonRSSResponse;

    const itemsRaw = parsed?.rss?.channel?.item;
    if (!itemsRaw) return [];
    const items: AmazonRSSItem[] = Array.isArray(itemsRaw) ? itemsRaw : [itemsRaw];

    const products: Product[] = items.map((item, idx) => {
      const title = item.title?.trim() || `Amazon Best Seller #${idx + 1}`;
      const link = item.link?.trim() || "https://www.amazon.com";
      const descriptionHtml = item.description ?? "";
      const pubDateStr = item.pubDate;
      const pubDate = pubDateStr ? new Date(pubDateStr) : new Date();
      if (isNaN(pubDate.getTime())) pubDate.setTime(Date.now());

      const daysAgo = Math.max(
        0.1,
        (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const { price, originalPrice } = extractPrice(descriptionHtml);
      const image = extractImage(descriptionHtml);
      const rating = extractRating(descriptionHtml);
      const { reviewCount, soldCount } = deriveReviewAndSold(title, daysAgo);
      const soldPerDay = computeSoldPerDay(soldCount, pubDate.toISOString());

      // Discount asumsi: kalau tidak ada originalPrice di RSS, buat diskon random kecil berdasarkan hash
      let computedOriginal = originalPrice;
      let discountPercent: number | undefined;
      if (computedOriginal && price && computedOriginal > price) {
        discountPercent = Math.round(((computedOriginal - price) / computedOriginal) * 100);
      } else if (price > 0) {
        // Pseudo diskon berdasarkan hash title
        const hash = Math.abs(title.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
        const disc = 10 + (hash % 40); // 10..49%
        computedOriginal = Math.round(price / (1 - disc / 100));
        discountPercent = disc;
      }

      const viralScore = computeViralScore({
        soldPerDay,
        rating,
        reviewCount,
        timestamp: pubDate.toISOString(),
        price: price || 100000,
        originalPrice: computedOriginal,
        title,
      });

      return {
        id: `amazon-${node}-${idx}`,
        title,
        url: link,
        image: image || "",
        price: price || 100000,
        originalPrice: computedOriginal,
        discountPercent,
        rating,
        reviewCount,
        soldCount,
        soldPerDay: Math.round(soldPerDay * 10) / 10,
        timestamp: pubDate.toISOString(),
        marketplace: "amazon",
        category: categoryName,
        viralScore: Math.round(viralScore * 100) / 100,
        isViral: viralScore >= VIRAL_SCORE_THRESHOLD,
      } satisfies Product;
    });

    return products;
  } catch (err) {
    console.warn(`[amazon-rss] Failed to fetch node ${node}:`, err);
    return [];
  }
}
