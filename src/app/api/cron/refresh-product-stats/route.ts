import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit (Vercel max untuk hobby plan)

const CRON_SECRET = process.env.CRON_SECRET || process.env.ADMIN_SECRET || "jelajahbelanja2024";

/**
 * GET /api/cron/refresh-product-stats
 *
 * Cron job untuk refresh rating/soldCount/reviewCount produk dari marketplace.
 * Dipanggil oleh Vercel Cron tiap Minggu 02:00 WIB (Sabtu 19:00 UTC).
 *
 * Auth: Bearer CRON_SECRET (via Authorization header atau ?secret= query)
 *
 * Query params:
 *   - limit: default 20, max 50 (produk per run — hindari rate limit marketplace)
 *   - marketplace: filter by marketplace (default: all)
 *
 * Flow:
 * 1. Ambil N produk dengan lastScrapedAt oldest (atau null)
 * 2. Fetch URL asli produk via fetch()
 * 3. Parse HTML untuk extract rating/sold/review
 * 4. Update DB + set lastScrapedAt = now
 * 5. Return summary
 *
 * REALISTIC EXPECTATIONS:
 *   Banyak marketplace (terutama Shopee) punya anti-bot protection agresif.
 *   Success rate cron ini mungkin ~30-50%. Itu OK — partial refresh tetap
 *   lebih baik daripada semua rating = 4.5 default & soldCount = 0.
 *   Produk yang gagal tetap di-update lastScrapedAt supaya tidak di-pick terus.
 */
export async function GET(req: NextRequest) {
  // Auth check
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const secretParam = url.searchParams.get("secret");
  if (auth !== `Bearer ${CRON_SECRET}` && secretParam !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
    const marketplaceFilter = url.searchParams.get("marketplace");

    // Ambil produk oldest lastScrapedAt
    const where: { enabled: boolean; isHidden: boolean; marketplace?: string } = {
      enabled: true,
      isHidden: false,
    };
    if (marketplaceFilter) where.marketplace = marketplaceFilter;

    const products = await db.shopeeProduct.findMany({
      where,
      orderBy: [{ lastScrapedAt: "asc" }, { createdAt: "asc" }],
      take: limit,
      select: { id: true, url: true, marketplace: true, title: true },
    });

    const results = {
      total: products.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        id: string;
        title: string;
        status: string;
        rating?: number;
        soldCount?: number;
      }>,
    };

    for (const p of products) {
      try {
        // Fetch halaman produk
        const res = await fetch(p.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(10000), // 10s timeout per produk
        });

        if (!res.ok) {
          results.failed++;
          results.details.push({
            id: p.id,
            title: p.title,
            status: `HTTP ${res.status}`,
          });
          // Tetap update lastScrapedAt supaya tidak di-pick terus
          await db.shopeeProduct.update({
            where: { id: p.id },
            data: { lastScrapedAt: new Date() },
          });
          continue;
        }

        const html = await res.text();

        // Extract stats berdasarkan marketplace
        const stats = extractStatsFromHtml(html, p.marketplace);

        if (!stats.rating && !stats.soldCount) {
          results.skipped++;
          results.details.push({ id: p.id, title: p.title, status: "no stats found" });
          // Tetap update lastScrapedAt supaya tidak di-pick terus
          await db.shopeeProduct.update({
            where: { id: p.id },
            data: { lastScrapedAt: new Date() },
          });
          continue;
        }

        // Update DB
        await db.shopeeProduct.update({
          where: { id: p.id },
          data: {
            rating: stats.rating || undefined,
            soldCount: stats.soldCount || undefined,
            reviewCount: stats.reviewCount || undefined,
            location: stats.location || undefined,
            lastScrapedAt: new Date(),
          },
        });

        results.updated++;
        results.details.push({
          id: p.id,
          title: p.title,
          status: "updated",
          rating: stats.rating || undefined,
          soldCount: stats.soldCount || undefined,
        });

        // Rate limit: tunggu 500ms antar produk
        await new Promise((r) => setTimeout(r, 500));
      } catch (err: unknown) {
        results.failed++;
        const msg = err instanceof Error ? err.message : String(err);
        results.details.push({ id: p.id, title: p.title, status: `error: ${msg}` });
        // Tetap update lastScrapedAt supaya tidak di-pick terus
        try {
          await db.shopeeProduct.update({
            where: { id: p.id },
            data: { lastScrapedAt: new Date() },
          });
        } catch {
          // ignore update failure
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Refresh selesai: ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`,
      ...results,
    });
  } catch (err: unknown) {
    console.error("[cron/refresh-product-stats] Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Extract rating/sold/review dari HTML berdasarkan marketplace.
 * Pattern berbeda per marketplace (Shopee, Tokopedia, Blibli, TikTok, Zalora).
 *
 * Catatan: Banyak marketplace pakai SPA (client-side render) sehingga rating/sold
 * mungkin tidak ada di HTML awal — pattern ini bakal match kalau ada di JSON-LD,
 * inline JSON state, atau server-rendered text.
 */
function extractStatsFromHtml(html: string, _marketplace: string): {
  rating: number | null;
  soldCount: number | null;
  reviewCount: number | null;
  location: string | null;
} {
  let rating: number | null = null;
  let soldCount: number | null = null;
  let reviewCount: number | null = null;
  let location: string | null = null;

  // Strip script/style tags & HTML, normalize whitespace
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  // Rating patterns (cross-marketplace)
  const ratingPatterns: RegExp[] = [
    /(\d+[.,]\d)\s*(?:bintang|⭐|🌟)/i,
    /"rating"\s*:\s*(\d+[.,]\d)/i, // JSON-LD
    /"aggregateRating"\s*:\s*\{[^}]*"ratingValue"\s*:\s*(\d+[.,]\d)/i,
    /rating[":\s]+(\d+[.,]\d)/i,
  ];
  for (const pat of ratingPatterns) {
    const m = text.match(pat);
    if (m) {
      rating = parseFloat(m[1].replace(",", "."));
      break;
    }
  }

  // Sold count patterns
  const soldPatterns: RegExp[] = [
    /([\d.,]+)\s*(?:rb|ribu|RB)?\s*terjual/i,
    /terjual\s*([\d.,]+)\s*(?:rb|ribu|RB)?/i,
    /"sold"\s*:\s*(\d+)/i,
    /"soldCount"\s*:\s*(\d+)/i,
  ];
  for (const pat of soldPatterns) {
    const m = text.match(pat);
    if (m) {
      let num = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (/rb|ribu|RB/i.test(m[0])) num *= 1000;
      soldCount = Math.round(num);
      break;
    }
  }

  // Review count patterns
  const reviewPatterns: RegExp[] = [
    /\((\d[\d.,]*)\s*(?:rating|review|evaluasi)\)/i,
    /"reviewCount"\s*:\s*(\d+)/i,
    /"ratingCount"\s*:\s*(\d+)/i,
    /(\d[\d.,]*)\s*(?:ulasan|review)/i,
  ];
  for (const pat of reviewPatterns) {
    const m = text.match(pat);
    if (m) {
      reviewCount = parseInt(m[1].replace(/[.,]/g, ""), 10);
      break;
    }
  }

  // Location patterns (Shopee sering tampilkan "Jakarta · 1.2rb terjual")
  const locPatterns: RegExp[] = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:·|\|)\s*[\d.]+\s*(?:rb|ribu)?\s*terjual/i,
  ];
  for (const pat of locPatterns) {
    const m = text.match(pat);
    if (m) {
      location = m[1];
      break;
    }
  }

  return { rating, soldCount, reviewCount, location };
}
