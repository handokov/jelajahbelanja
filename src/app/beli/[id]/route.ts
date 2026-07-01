import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clickGuard } from "@/lib/click-guard";

export const dynamic = "force-dynamic";

/**
 * GET /beli/[id] — Short link redirect dengan click fraud protection
 *
 * Flow:
 * 1. User klik "Beli di Shopee" → arahkan ke /beli/shopee-xxx
 * 2. Click guard: cek bot, rate limit, per-product throttle
 * 3. Kalau blocked → tampilkan halaman peringatan
 * 4. Kalau aman → redirect ke affiliate URL
 *
 * Proteksi:
 * - Bot/autoclick detection (user-agent analysis)
 * - Rate limit: max 15 klik/IP/menit
 * - Per-product throttle: max 3 klik/IP/produk/jam
 * - Auto-block IP yang melanggar selama 30 menit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Strip "shopee-" prefix kalau ada (frontend format: shopee-cuid123)
  const dbId = id.startsWith("shopee-") ? id.slice(7) : id;

  // ─── Click fraud protection ───
  const guard = clickGuard(request, dbId);

  if (!guard.allowed) {
    console.warn(
      `[beli] Click blocked: IP=${guard.ip} product=${dbId} reason=${guard.reason}`
    );

    // Return halaman peringatan (bukan redirect ke Shopee)
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Akses Dibatasi — JelajahBelanja</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #f8f9fa; color: #1a1a2e;
    }
    .container {
      text-align: center; padding: 2rem; max-width: 480px;
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.75rem; color: #c0392b; }
    p { font-size: 0.95rem; color: #555; line-height: 1.6; margin-bottom: 1rem; }
    .reason {
      background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;
      padding: 0.75rem 1rem; font-size: 0.85rem; color: #856404;
      margin-bottom: 1.5rem;
    }
    a {
      display: inline-block; background: #7c3aed; color: white;
      padding: 0.75rem 2rem; border-radius: 8px; text-decoration: none;
      font-weight: 600; font-size: 0.95rem;
    }
    a:hover { background: #6d28d9; }
    .footer { margin-top: 2rem; font-size: 0.75rem; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#128274;</div>
    <h1>Akses Dibatasi</h1>
    <p>Klik Anda diblokir oleh sistem proteksi JelajahBelanja.</p>
    <div class="reason">${guard.reason || "Aktivitas mencurigakan terdeteksi"}</div>
    <p>Jika Anda bukan bot dan merasa ini salah, silakan coba lagi dalam beberapa menit.</p>
    <a href="/">Kembali ke Beranda</a>
    <p class="footer">Proteksi ini melindungi pengguna dan merchant dari click fraud.</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 429,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ─── Normal flow: redirect ke marketplace ───
  try {
    const product = await db.shopeeProduct.findUnique({
      where: { id: dbId },
      select: { url: true, affiliateUrl: true, title: true },
    });

    if (!product) {
      // Product not found → redirect to homepage
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Priority: affiliateUrl (shope.ee/xxx) > original URL
    const targetUrl = product.affiliateUrl || product.url;

    return NextResponse.redirect(targetUrl);
  } catch (err) {
    console.error("[beli] Error looking up product:", err);
    // DB error → redirect to homepage
    return NextResponse.redirect(new URL("/", request.url));
  }
}
