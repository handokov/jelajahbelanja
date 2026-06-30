import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /beli/[id] — Short link redirect
 *
 * Flow:
 * 1. User klik "Beli di Shopee" → arahkan ke /beli/shopee-xxx
 * 2. Route ini cari produk di DB
 * 3. Kalau ada affiliateUrl (shope.ee/xxx) → redirect ke situ
 * 4. Kalau gak ada → redirect ke URL asli produk
 * 5. Kalau produk gak ketemu → redirect ke homepage
 *
 * Keuntungan:
 * - Saat demo/pendaftaran: isi URL asli Shopee
 * - Saat affiliate approved: tinggal ganti affiliateUrl di admin → semua link otomatis update!
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Strip "shopee-" prefix kalau ada (frontend format: shopee-cuid123)
  const dbId = id.startsWith("shopee-") ? id.slice(7) : id;

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
