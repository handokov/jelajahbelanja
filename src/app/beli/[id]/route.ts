import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripMarketplacePrefix } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
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
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Strip marketplace prefix (shopee-xxx, tokopedia-xxx, dll)
  const dbId = stripMarketplacePrefix(id);

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
