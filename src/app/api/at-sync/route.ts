import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";
import {
  getAffiliatedCampaigns,
  getProductFeedUrl,
  fetchProductFeed,
  detectMarketplaceFromCampaign,
  isAtConfigured,
  generateShopeeAffiliateUrl,
  type ATProduct,
} from "@/lib/accesstrade";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit (Vercel Pro) / 60s (free)

interface SyncResult {
  success: boolean;
  campaignsChecked: number;
  productsFetched: number;
  productsInserted: number;
  productsUpdated: number;
  errors: string[];
  byMarketplace: Record<string, number>;
  duration: number;
}

/** Normalisasi AT product ke format ShopeeProduct */
function normalizeAtProduct(
  at: ATProduct,
  marketplace: string,
  campaignId: number
): {
  title: string;
  url: string;
  image: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  location: string | null;
  category: string;
  marketplace: string;
  affiliateUrl: string | null;
  notes: string | null;
  enabled: boolean;
} | null {
  const title = at.product_name || at.title || at.name || "";
  if (!title) return null;

  const url = at.product_url || at.link || at.url || "";
  const image = at.image_link || at.image || at.image_url || "";
  if (!url || !image) return null;

  const price = Number(at.sale_price || at.price || 0);
  if (!price || price <= 0) return null;

  const originalPrice = Number(at.original_price || at.price || 0) || null;
  let discountPercent: number | null = null;
  if (originalPrice && originalPrice > price) {
    discountPercent = Math.round((1 - price / originalPrice) * 100);
  } else if (at.discount) {
    discountPercent = Number(at.discount) || null;
  }

  const affiliateUrl = at.aff_link || at.affiliate_link || at.affiliate_url || at.product_url || at.link || null;

  return {
    title: String(title).slice(0, 500),
    url: String(url),
    image: String(image),
    price,
    originalPrice,
    discountPercent,
    rating: Number(at.rating) || 4.5,
    reviewCount: Number(at.review_count) || 0,
    soldCount: Number(at.sold_count) || 0,
    location: at.location ? String(at.location) : null,
    category: at.category_name || at.category || "Lainnya",
    marketplace,
    affiliateUrl: affiliateUrl ? String(affiliateUrl) : null,
    notes: `AT campaign ${campaignId} - synced ${new Date().toISOString().slice(0, 10)}`,
    enabled: true,
  };
}

// GET: status + dry-run preview
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    if (!(await isAtConfigured())) {
      return NextResponse.json({
        success: false,
        error: "AccessTrade credentials not configured. Set ACCESSTRADE_USER_UID + ACCESSTRADE_SECRET_KEY in .env",
      }, { status: 500 });
    }

    const campaigns = await getAffiliatedCampaigns();

    return NextResponse.json({
      success: true,
      configured: true,
      siteId: process.env.ACCESSTRADE_SITE_ID || "127377",
      campaignsTotal: campaigns.length,
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        marketplace: detectMarketplaceFromCampaign(c),
        reward: c.highestRewardSummaries?.[0]?.reward || 0,
        currency: c.currency,
      })),
    });
  } catch (err: any) {
    console.error("[api/at-sync] GET error:", err);
    return NextResponse.json({ error: err.message || "Gagal cek status AT" }, { status: 500 });
  }
}

// POST: trigger sync
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  const startTime = Date.now();
  const result: SyncResult = {
    success: false,
    campaignsChecked: 0,
    productsFetched: 0,
    productsInserted: 0,
    productsUpdated: 0,
    errors: [],
    byMarketplace: {},
    duration: 0,
  };

  try {
    if (!(await isAtConfigured())) {
      result.errors.push("AT credentials not configured");
      result.duration = Date.now() - startTime;
      return NextResponse.json(result, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync"; // "sync" | "affiliate-shopee"
    const maxProductsPerCampaign = Number(body.maxPerCampaign) || 50;
    const dryRun = !!body.dryRun;

    // ─── Action: affiliate-shopee ───
    // Scan semua produk Shopee yang belum punya affiliate URL AT → update dengan quicklink
    if (action === "affiliate-shopee") {
      const startTimeAff = Date.now();
      const affResult = {
        success: false,
        action: "affiliate-shopee",
        scanned: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
        duration: 0,
      };

      try {
        // Ambil semua produk Shopee yang belum punya affiliate URL AT (atid.me)
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
          select: { id: true, url: true, title: true, affiliateUrl: true },
        });
        affResult.scanned = shopeeProducts.length;

        if (dryRun) {
          affResult.success = true;
          affResult.duration = Date.now() - startTimeAff;
          return NextResponse.json(affResult);
        }

        for (const product of shopeeProducts) {
          try {
            const affiliateUrl = await generateShopeeAffiliateUrl(product.url);
            if (affiliateUrl) {
              await db.shopeeProduct.update({
                where: { id: product.id },
                data: {
                  affiliateUrl,
                  lastScrapedAt: new Date(),
                  updatedAt: new Date(),
                },
              });
              affResult.updated++;
            } else {
              affResult.skipped++;
            }
          } catch (err: any) {
            affResult.errors.push(`Product ${product.id}: ${err.message}`);
            affResult.skipped++;
          }
        }

        affResult.success = true;
        affResult.duration = Date.now() - startTimeAff;
        return NextResponse.json(affResult);
      } catch (err: any) {
        affResult.errors.push(err.message);
        affResult.duration = Date.now() - startTimeAff;
        return NextResponse.json(affResult, { status: 500 });
      }
    }

    // ─── Action: sync (default) ───

    const campaigns = await getAffiliatedCampaigns();
    result.campaignsChecked = campaigns.length;

    for (const campaign of campaigns) {
      try {
        const marketplace = detectMarketplaceFromCampaign(campaign);
        const feedUrl = await getProductFeedUrl(campaign.id);

        if (!feedUrl) {
          result.errors.push(`Campaign ${campaign.name} (${campaign.id}): no product feed URL`);
          continue;
        }

        const products = await fetchProductFeed(feedUrl);
        const limitedProducts = products.slice(0, maxProductsPerCampaign);
        result.productsFetched += limitedProducts.length;

        if (dryRun) {
          result.byMarketplace[marketplace] = (result.byMarketplace[marketplace] || 0) + limitedProducts.length;
          continue;
        }

        for (const at of limitedProducts) {
          try {
            const normalized = normalizeAtProduct(at, marketplace, campaign.id);
            if (!normalized) continue;

            const existing = await db.shopeeProduct.findFirst({
              where: {
                OR: [
                  { title: normalized.title, url: normalized.url },
                  { affiliateUrl: normalized.affiliateUrl || "___NO_MATCH___" },
                ],
              },
              select: { id: true },
            });

            if (existing) {
              await db.shopeeProduct.update({
                where: { id: existing.id },
                data: {
                  price: normalized.price,
                  originalPrice: normalized.originalPrice,
                  discountPercent: normalized.discountPercent,
                  image: normalized.image,
                  affiliateUrl: normalized.affiliateUrl,
                  lastScrapedAt: new Date(),
                  updatedAt: new Date(),
                },
              });
              result.productsUpdated++;
            } else {
              await db.shopeeProduct.create({ data: normalized });
              result.productsInserted++;
            }

            result.byMarketplace[marketplace] = (result.byMarketplace[marketplace] || 0) + 1;
          } catch {
            // Skip individual product errors
          }
        }
      } catch (err: any) {
        result.errors.push(`Campaign ${campaign.name}: ${err.message}`);
      }
    }

    result.success = true;
    result.duration = Date.now() - startTime;
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/at-sync] POST error:", err);
    result.errors.push(err.message);
    result.duration = Date.now() - startTime;
    return NextResponse.json(result, { status: 500 });
  }
}
