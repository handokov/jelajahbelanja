import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAffiliateTags, buildAffiliateUrl } from "@/lib/affiliate";

export const dynamic = "force-dynamic";

/**
 * GET /beli/[id] — Redirect shortlink
 * 
 * Looks up product by ID, applies affiliate tag from DB, and redirects.
 * 
 * Flow:
 * 1. User clicks "Beli di Shopee" button → goes to /beli/shopee-abc123
 * 2. This route looks up the product in DB
 * 3. If product has affiliateUrl set, use that (it's the official Shopee affiliate link)
 * 4. Otherwise, apply affiliate tag parameter from AffiliateTag table
 * 5. Redirect to final Shopee URL
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    
    // Product IDs from frontend are like "shopee-abc123", strip the prefix
    const productId = rawId.startsWith("shopee-") ? rawId.replace("shopee-", "") : rawId;

    // Look up product in database
    const product = await db.shopeeProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      // Product not found — redirect to homepage
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Determine final URL
    let finalUrl: string;

    if (product.affiliateUrl && product.affiliateUrl.trim()) {
      // Admin has set a specific affiliate URL (e.g., shope.ee/xxx shortlink)
      // This takes priority because it's the official Shopee affiliate link
      finalUrl = product.affiliateUrl.trim();
    } else {
      // No affiliate URL set yet — apply affiliate tag from settings
      const tags = await getAffiliateTags();
      finalUrl = buildAffiliateUrl(product.url, "shopee", tags);
    }

    // 307 Temporary Redirect — so browsers always re-check
    // This means if you update the affiliate tag later, all existing links update immediately
    return NextResponse.redirect(finalUrl, 307);
  } catch (err) {
    console.error("[beli/[id]] Redirect error:", err);
    // Fallback — redirect to homepage
    return NextResponse.redirect(new URL("/", req.url));
  }
}
