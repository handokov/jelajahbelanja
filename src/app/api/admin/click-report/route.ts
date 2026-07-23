import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/admin/click-report
 *
 * Report klik produk untuk analytics:
 * - Top produk by total klik
 * - Klik per hari (7/30 hari terakhir)
 * - Klik per marketplace
 * - Unique IP count
 * - Blocked clicks stats
 *
 * Query params:
 *   - range: "7d" | "30d" | "all" (default: 7d)
 *   - marketplace: filter by marketplace (default: all)
 *
 * Protected by admin cookie auth.
 */
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d";
    const marketplaceFilter = url.searchParams.get("marketplace") || "";

    // Build date range
    const now = new Date();
    let startDate: Date | null = null;
    if (range === "7d") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (range === "30d") startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // "all" → no date filter

    const where: any = {};
    if (startDate) where.createdAt = { gte: startDate };
    if (marketplaceFilter) where.marketplace = marketplaceFilter;

    // ─── 1. Top products by clicks ───
    // Group by productId, count total clicks + unique IPs + blocked count
    const topProductsRaw = await db.productClick.groupBy({
      by: ["productId", "productTitle", "marketplace", "category"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    // Ambil unique IP per produk (perlu query terpisah karena groupBy gabisa count distinct di sqlite/pg dengan mudah)
    const productIds = topProductsRaw.map(p => p.productId);
    const uniqueIpPerProduct: Record<string, number> = {};
    if (productIds.length > 0) {
      // Query semua klik di range ini untuk productIds, lalu group di app level
      const allClicksForTop = await db.productClick.findMany({
        where: { ...where, productId: { in: productIds } },
        select: { productId: true, ipAddress: true },
      });
      const ipSetPerProduct: Record<string, Set<string>> = {};
      for (const c of allClicksForTop) {
        if (!ipSetPerProduct[c.productId]) ipSetPerProduct[c.productId] = new Set();
        ipSetPerProduct[c.productId].add(c.ipAddress);
      }
      for (const pid of productIds) {
        uniqueIpPerProduct[pid] = ipSetPerProduct[pid]?.size || 0;
      }
    }

    // ─── 2. Klik per hari (untuk grafik) ───
    const clicksByDateRaw = await db.productClick.groupBy({
      by: ["createdAt"],
      where,
      _count: { id: true },
    });

    // Aggregate per hari (YYYY-MM-DD)
    const clicksByDate: Record<string, { total: number; unique: Set<string> }> = {};
    // Untuk unique IP per hari, perlu query terpisah
    const allClicksForDates = await db.productClick.findMany({
      where,
      select: { createdAt: true, ipAddress: true, blocked: true },
    });

    for (const c of allClicksForDates) {
      const dateKey = c.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!clicksByDate[dateKey]) clicksByDate[dateKey] = { total: 0, unique: new Set() };
      clicksByDate[dateKey].total++;
      clicksByDate[dateKey].unique.add(c.ipAddress);
    }

    const dailyStats = Object.entries(clicksByDate)
      .map(([date, data]) => ({
        date,
        totalClicks: data.total,
        uniqueIPs: data.unique.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── 3. Klik per marketplace ───
    const byMarketplaceRaw = await db.productClick.groupBy({
      by: ["marketplace"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // ─── 3b. Klik per referer source (Pinterest/TikTok/Threads/Google/Direct/Other) ───
    const allClicksForReferer = await db.productClick.findMany({
      where,
      select: { referer: true },
    });
    const refererCategories: Record<string, number> = {
      pinterest: 0,
      tiktok: 0,
      threads: 0,
      instagram: 0,
      facebook: 0,
      google: 0,
      youtube: 0,
      twitter: 0,
      direct: 0,
      jb_internal: 0,
      other: 0,
    };
    for (const c of allClicksForReferer) {
      const ref = (c.referer || "").toLowerCase();
      if (!ref || ref === "direct") {
        refererCategories.direct++;
      } else if (ref.includes("jelajahbelanja.com")) {
        refererCategories.jb_internal++;
      } else if (ref.includes("pinterest")) {
        refererCategories.pinterest++;
      } else if (ref.includes("tiktok")) {
        refererCategories.tiktok++;
      } else if (ref.includes("threads")) {
        refererCategories.threads++;
      } else if (ref.includes("instagram")) {
        refererCategories.instagram++;
      } else if (ref.includes("facebook") || ref.includes("fb.com")) {
        refererCategories.facebook++;
      } else if (ref.includes("google")) {
        refererCategories.google++;
      } else if (ref.includes("youtube") || ref.includes("youtu.be")) {
        refererCategories.youtube++;
      } else if (ref.includes("twitter") || ref.includes("x.com")) {
        refererCategories.twitter++;
      } else {
        refererCategories.other++;
      }
    }
    const byReferer = Object.entries(refererCategories)
      .filter(([_, count]) => count > 0)
      .map(([source, clicks]) => ({ source, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    // ─── 4. Overall stats ───
    const totalCount = await db.productClick.count({ where });
    const blockedCount = await db.productClick.count({ where: { ...where, blocked: true } });
    const allIPs = await db.productClick.findMany({
      where,
      select: { ipAddress: true },
      distinct: ["ipAddress"],
    });
    const uniqueIPs = allIPs.length;

    // ─── 5. Recent clicks (last 20) ───
    const recentClicks = await db.productClick.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        productId: true,
        productTitle: true,
        marketplace: true,
        category: true,
        ipAddress: true,
        referer: true,
        blocked: true,
        blockReason: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      range,
      marketplace: marketplaceFilter || "all",
      stats: {
        totalClicks: totalCount,
        blockedClicks: blockedCount,
        blockRate: totalCount > 0 ? ((blockedCount / totalCount) * 100).toFixed(1) : "0",
        uniqueIPs,
        conversionRate: "0", // placeholder — AT belum push conversion data ke JB
      },
      topProducts: topProductsRaw.map(p => ({
        productId: p.productId,
        productTitle: p.productTitle,
        marketplace: p.marketplace,
        category: p.category,
        totalClicks: p._count.id,
        uniqueClicks: uniqueIpPerProduct[p.productId] || 0,
      })),
      dailyStats,
      byMarketplace: byMarketplaceRaw.map(m => ({
        marketplace: m.marketplace,
        clicks: m._count.id,
      })),
      byReferer,
      recentClicks,
    });
  } catch (err: any) {
    console.error("[api/admin/click-report] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
