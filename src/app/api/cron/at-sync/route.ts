import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAffiliatedCampaigns,
  getProductFeedUrl,
  fetchProductFeed,
  detectMarketplaceFromCampaign,
  isAtConfigured,
  generateShopeeAffiliateUrl,
  type ATProduct,
} from "@/lib/accesstrade";
import { detectMarketplaceFromUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit

/**
 * GET /api/cron/at-sync
 *
 * Cron job yang dijalankan Vercel tiap malam (2 AM WIB = 19:00 UTC).
 * Lakukan:
 * 1. Sync produk dari AT product feed (kalau ada)
 * 2. Auto-affiliate produk Shopee yang belum punya AT URL
 *
 * Protected by CRON_SECRET header (di-set di Vercel env vars).
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel mengirim header Authorization: Bearer xxx)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const result = {
    success: true,
    timestamp: new Date().toISOString(),
    steps: [] as string[],
    productsSynced: 0,
    productsAffiliated: 0,
    errors: [] as string[],
    duration: 0,
  };

  try {
    // === Step 1: Sync produk dari AT (kalau product feed ada) ===
    if (!(await isAtConfigured())) {
      result.steps.push("AT not configured — skip sync");
    } else {
      try {
        const campaigns = await getAffiliatedCampaigns();
        result.steps.push(`Found ${campaigns.length} affiliated campaigns`);

        for (const campaign of campaigns) {
          try {
            const marketplace = detectMarketplaceFromCampaign(campaign);
            const feedUrl = await getProductFeedUrl(campaign.id);
            if (!feedUrl) continue;

            const products = await fetchProductFeed(feedUrl);
            const limited = products.slice(0, 50); // max 50 per campaign per cron run

            for (const at of limited) {
              try {
                const title = at.product_name || at.title || at.name || "";
                const url = at.product_url || at.link || at.url || "";
                const image = at.image_link || at.image || at.image_url || "";
                const price = Number(at.sale_price || at.price || 0);
                if (!title || !url || !image || price <= 0) continue;

                // Check existing
                const existing = await db.shopeeProduct.findFirst({
                  where: { OR: [{ title: String(title).slice(0, 500), url: String(url) }] },
                  select: { id: true },
                });

                if (!existing) {
                  await db.shopeeProduct.create({
                    data: {
                      title: String(title).slice(0, 500),
                      url: String(url),
                      image: String(image),
                      price,
                      originalPrice: Number(at.original_price || at.price || 0) || null,
                      discountPercent: Number(at.discount) || null,
                      rating: Number(at.rating) || 4.5,
                      reviewCount: Number(at.review_count) || 0,
                      soldCount: Number(at.sold_count) || 0,
                      location: at.location ? String(at.location) : null,
                      category: at.category_name || at.category || "Lainnya",
                      marketplace,
                      affiliateUrl: at.aff_link || at.affiliate_link || null,
                      enabled: true,
                    },
                  });
                  result.productsSynced++;
                }
              } catch {
                // skip individual errors
              }
            }
          } catch (err: any) {
            result.errors.push(`Campaign ${campaign.name}: ${err.message}`);
          }
        }
        result.steps.push(`Synced ${result.productsSynced} new products`);
      } catch (err: any) {
        result.errors.push(`Sync error: ${err.message}`);
      }
    }

    // === Step 2: Auto-affiliate produk Shopee yang belum punya AT URL ===
    try {
      const shopeeProducts = await db.shopeeProduct.findMany({
        where: {
          marketplace: "shopee",
          enabled: true,
          OR: [
            { affiliateUrl: null },
            { affiliateUrl: "" },
            { affiliateUrl: { not: { contains: "atid.me" } } },
          ],
        },
        select: { id: true, url: true },
      });

      result.steps.push(`Found ${shopeeProducts.length} Shopee products needing affiliate URL`);

      for (const product of shopeeProducts) {
        try {
          const affiliateUrl = await generateShopeeAffiliateUrl(product.url);
          if (affiliateUrl) {
            await db.shopeeProduct.update({
              where: { id: product.id },
              data: { affiliateUrl, lastScrapedAt: new Date(), updatedAt: new Date() },
            });
            result.productsAffiliated++;
          }
        } catch {
          // skip individual errors
        }
      }
      result.steps.push(`Affiliated ${result.productsAffiliated} Shopee products`);
    } catch (err: any) {
      result.errors.push(`Affiliate error: ${err.message}`);
    }

    result.duration = Date.now() - startTime;
    result.success = result.errors.length === 0 || result.productsAffiliated > 0;

    console.log("[cron/at-sync] Result:", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message);
    result.duration = Date.now() - startTime;
    return NextResponse.json(result, { status: 500 });
  }
}
