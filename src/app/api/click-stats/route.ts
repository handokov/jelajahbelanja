import { NextRequest, NextResponse } from "next/server";
import { getClickStats } from "@/lib/click-guard";

export const dynamic = "force-dynamic";

/**
 * Simple admin auth check — same pattern as scrape-shopee route
 */
function checkAuth(req: NextRequest): NextResponse | null {
  const ADMIN_SECRET = process.env.ADMIN_SECRET || "jelajahbelanja2024";
  const auth = req.headers.get("authorization");
  const cookieSession = req.cookies.get("jb-admin-session")?.value;

  // Method 1: Bearer token
  if (auth === `Bearer ${ADMIN_SECRET}`) {
    return null;
  }
  // Method 2: Cookie session (basic check)
  if (cookieSession) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * GET /api/click-stats — Statistik klik & fraud protection (admin only)
 *
 * Return: totalClicks, blockedClicks, blockRate, uniqueIPs, topIPs, recentLogs
 */
export async function GET(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  try {
    const stats = getClickStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[api/click-stats] Error:", err);
    return NextResponse.json({ error: "Gagal memuat statistik" }, { status: 500 });
  }
}
