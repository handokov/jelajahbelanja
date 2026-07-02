import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
<<<<<<< HEAD
import { stripMarketplacePrefix } from "@/lib/utils";
=======
import { clickGuard } from "@/lib/click-guard";
>>>>>>> 708b746e9744a8c43d24b54b1818a255a7a7fd9e

export const dynamic = "force-dynamic";

/**
<<<<<<< HEAD
 * Allowed redirect domains — hanya marketplace yang di-support.
 * Mencegah open redirect ke domain malicious.
 */
const ALLOWED_REDIRECT_DOMAINS = [
  "shopee.co.id", "shope.ee",
  "tokopedia.com", "m.tokopedia.com",
  "lazada.co.id", "lazada.com",
  "aliexpress.com", "aliexpress.us",
  "amazon.com", "amazon.co.id", "amazon.sg",
  "amazon.co.jp", "amazon.de", "amazon.co.uk",
];

function isAllowedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Hanya izinkan http/https
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    // Cek domain
    return ALLOWED_REDIRECT_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith("." + d)
    );
  } catch {
    return false;
  }
}

/**
 * GET /beli/[id] — Short link redirect
 *
 * Flow:
 * 1. User klik "Beli di Shopee/Tokopedia" → arahkan ke /beli/shopee-xxx
 * 2. Route ini cari produk di DB
 * 3. Validasi URL redirect — hanya domain marketplace yang diizinkan
 * 4. Kalau ada affiliateUrl → redirect ke situ
 * 5. Kalau gak ada → redirect ke URL asli produk
 * 6. Kalau URL gak valid atau produk gak ketemu → redirect ke homepage
=======
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
>>>>>>> 708b746e9744a8c43d24b54b1818a255a7a7fd9e
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Strip marketplace prefix (shopee-xxx, tokopedia-xxx, dll)
  const dbId = stripMarketplacePrefix(id);

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
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Priority: affiliateUrl > original URL, tapi harus valid domain
    const targetUrl = product.affiliateUrl || product.url;

    if (!isAllowedRedirect(targetUrl)) {
      console.warn("[beli] Blocked redirect to disallowed domain:", targetUrl);
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.redirect(targetUrl);
  } catch (err) {
    console.error("[beli] Error looking up product:", err);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
