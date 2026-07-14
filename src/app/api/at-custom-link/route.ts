import { NextRequest, NextResponse } from "next/server";
import { batchCreateCustomCreative, createCustomCreative, getLastCreateCustomError, type BatchCustomLinkItem } from "@/lib/accesstrade";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ADMIN_SECRET = process.env.ADMIN_SECRET || "jelajahbelanja2024";

// Auth: accept Bearer token (scraper) OR cookie (admin panel)
function checkAuth(req: NextRequest): NextResponse | null {
  // Check Bearer token first (scraper extension)
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${ADMIN_SECRET}`) return null;
  // Check cookie (admin panel)
  const cookie = req.cookies.get("jb-admin-session")?.value;
  if (cookie) return null; // middleware already verified cookie
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * POST /api/at-custom-link
 *
 * Generate AT Custom Creative (short link atid.me/go/xxx) untuk produk Shopee.
 *
 * Mode 1 — Single:
 *   Body: { mode: "single", url: "https://shopee.co.id/...", name: "Dress Anak", imageUrl? }
 *   Response: { success, affiliateUrl?, error? }
 *
 * Mode 2 — Batch (untuk bulk upload):
 *   Body: { mode: "batch", items: [{ url, name, imageUrl? }, ...] }
 *   Response: { success, total, successCount, failedCount, results: [{ index, url, name, success, affiliateUrl?, error? }] }
 *
 * Rate limit AT API: 0.5s per request.
 * 30 produk ≈ 15 detik, 120 produk ≈ 60 detik.
 *
 * Auth: admin (protected by middleware — jb-admin-session cookie).
 */
export async function POST(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const mode = body.mode as "single" | "batch";

    // ─── Mode 1: Single generate ───
    if (mode === "single") {
      const { url, name, imageUrl } = body as {
        url: string;
        name?: string;
        imageUrl?: string;
      };

      if (!url || typeof url !== "string") {
        return NextResponse.json(
          { success: false, error: "url wajib diisi (string)" },
          { status: 400 }
        );
      }

      const safeName = (name || "").trim().slice(0, 50) || "JB Product";
      const creative = await createCustomCreative(url, safeName, imageUrl);

      if (!creative) {
        const detail = getLastCreateCustomError();
        return NextResponse.json(
          {
            success: false,
            error: "Gagal generate custom link",
            detail: detail || "URL tidak valid, AT credentials bermasalah, atau campaign tidak support custom creative",
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        affiliateUrl: creative.affiliateLink,
        name: creative.name,
        landingUrl: creative.landingUrl,
      });
    }

    // ─── Mode 2: Batch generate ───
    if (mode === "batch") {
      const { items } = body as { items: BatchCustomLinkItem[] };

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: "items wajib array berisi { url, name }" },
          { status: 400 }
        );
      }

      // Limit max 200 per batch (cukup untuk 120 produk CSV + margin)
      const limited = items.slice(0, 200);

      const results = await batchCreateCustomCreative(limited);

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.length - successCount;

      return NextResponse.json({
        success: true,
        total: results.length,
        successCount,
        failedCount,
        results,
      });
    }

    return NextResponse.json(
      { success: false, error: "mode harus 'single' atau 'batch'" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[api/at-custom-link] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
