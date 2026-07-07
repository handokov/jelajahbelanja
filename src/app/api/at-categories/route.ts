import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/admin-auth";
import { getAffiliatedCampaigns } from "@/lib/accesstrade";
import { isAtConfigured } from "@/lib/accesstrade";

export const dynamic = "force-dynamic";

/**
 * GET /api/at-categories
 * Fetch live kategori dari AccessTrade campaigns (affiliated + unaffiliated).
 * Return list kategori dengan count campaign + contoh campaign names.
 *
 * Public endpoint (no auth) — return affiliated categories saja.
 * Admin endpoint (with auth) — return affiliated + unaffiliated.
 */
export async function GET(req: NextRequest) {
  try {
    if (!isAtConfigured()) {
      return NextResponse.json({
        success: false,
        error: "AccessTrade credentials not configured",
        categories: [],
      }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const includeUnaffiliated = searchParams.get("all") === "true";

    // Cek admin auth untuk akses unaffiliated campaigns
    let isAdmin = false;
    if (includeUnaffiliated) {
      const authErr = await checkAuth(req);
      isAdmin = !authErr;
    }

    try {
      // Fetch affiliated campaigns (selalu)
      const affiliated = await getAffiliatedCampaigns();

      // Kumpulkan kategori dari affiliated
      const categoryMap = new Map<string, { value: number; count: number; examples: string[]; status: "affiliated" }>();

      affiliated.forEach((c) => {
        (c.categories || []).forEach((cat) => {
          const key = cat.name;
          if (!categoryMap.has(key)) {
            categoryMap.set(key, { value: cat.value, count: 0, examples: [], status: "affiliated" });
          }
          const entry = categoryMap.get(key)!;
          entry.count++;
          if (entry.examples.length < 5) entry.examples.push(c.name);
        });
      });

      return NextResponse.json({
        success: true,
        configured: true,
        siteId: process.env.ACCESSTRADE_SITE_ID || "127377",
        totalCampaignsAffiliated: affiliated.length,
        categories: [...categoryMap.entries()].map(([name, info]) => ({
          name,
          value: info.value,
          campaignCount: info.count,
          examples: info.examples,
          status: info.status,
        })),
      });
    } catch (err: any) {
      console.error("[api/at-categories] AT fetch error:", err);
      return NextResponse.json({
        success: false,
        error: err.message || "Gagal fetch dari AccessTrade",
        categories: [],
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error("[api/at-categories] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
