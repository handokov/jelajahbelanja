import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  computeSoldPerDay,
  computeViralScore,
  VIRAL_SCORE_THRESHOLD,
} from "@/lib/viral-score";
import { buildAffiliateUrl, getAffiliateTags } from "@/lib/affiliate";
import type { Product, Marketplace } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Convert DB row to Product DTO */
function toProduct(row: {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  location: string | null;
  category: string;
  url: string;
  affiliateUrl: string | null;
  marketplace: string;
  enabled: boolean;
  isViral: boolean;
  isPinned: boolean;
  isHidden: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  const ts = row.createdAt.toISOString();
  const soldPerDay = computeSoldPerDay(row.soldCount, ts);
  const viralScore = computeViralScore({
    soldPerDay,
    rating: row.rating,
    reviewCount: row.reviewCount,
    timestamp: ts,
    price: row.price,
    originalPrice: row.originalPrice ?? undefined,
    title: row.title,
  });
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    image: row.image,
    price: row.price,
    originalPrice: row.originalPrice ?? undefined,
    discountPercent: row.discountPercent ?? undefined,
    rating: row.rating,
    reviewCount: row.reviewCount,
    soldCount: row.soldCount,
    soldPerDay,
    timestamp: ts,
    marketplace: (row.marketplace || "shopee") as Marketplace,
    category: row.category,
    viralScore,
    isViral: row.isViral || viralScore >= VIRAL_SCORE_THRESHOLD,
    location: row.location ?? undefined,
  };
}

/** GET /api/shopee-products — list semua produk manual */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "";
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    const where: any = {};
    if (category) where.category = category;

    const rows = await db.shopeeProduct.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    let products = rows.map(toProduct);

    if (search) {
      products = products.filter((p) => p.title.toLowerCase().includes(search));
    }

    // Inject affiliate URL
    const tags = await getAffiliateTags();
    const withAffiliate = products.map((p) => ({
      ...p,
      affiliateUrl: p.affiliateUrl || buildAffiliateUrl(p.url, p.marketplace, tags) || p.url,
    }));

    return NextResponse.json({ products: withAffiliate, total: withAffiliate.length });
  } catch (err) {
    console.error("[api/shopee-products GET] Error:", err);
    return NextResponse.json({ error: "Gagal memuat produk" }, { status: 500 });
  }
}

/** POST /api/shopee-products — tambah produk baru */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.image || !body.price || !body.category || !body.url) {
      return NextResponse.json(
        { error: "Title, image, price, category, dan url wajib diisi" },
        { status: 400 }
      );
    }

    const created = await db.shopeeProduct.create({
      data: {
        title: body.title.trim(),
        image: body.image.trim(),
        price: Number(body.price),
        originalPrice: body.originalPrice ? Number(body.originalPrice) : null,
        discountPercent: body.discountPercent ? Number(body.discountPercent) : null,
        rating: Number(body.rating) || 4.5,
        reviewCount: Number(body.reviewCount) || 0,
        soldCount: Number(body.soldCount) || 0,
        location: body.location?.trim() || null,
        category: body.category.trim(),
        url: body.url.trim(),
        affiliateUrl: body.affiliateUrl?.trim() || null,
        marketplace: body.marketplace?.trim() || "shopee",
        isViral: body.isViral ?? false,
        isPinned: body.isPinned ?? false,
        isHidden: body.isHidden ?? false,
        notes: body.notes?.trim() || null,
        enabled: body.enabled ?? true,
      },
    });

    return NextResponse.json({ product: toProduct(created) });
  } catch (err) {
    console.error("[api/shopee-products POST] Error:", err);
    return NextResponse.json({ error: "Gagal membuat produk" }, { status: 500 });
  }
}

/** PATCH /api/shopee-products — update produk */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const updated = await db.shopeeProduct.update({
      where: { id: body.id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.image !== undefined ? { image: body.image.trim() } : {}),
        ...(body.price !== undefined ? { price: Number(body.price) } : {}),
        ...(body.originalPrice !== undefined ? { originalPrice: Number(body.originalPrice) || null } : {}),
        ...(body.discountPercent !== undefined ? { discountPercent: Number(body.discountPercent) || null } : {}),
        ...(body.rating !== undefined ? { rating: Number(body.rating) } : {}),
        ...(body.reviewCount !== undefined ? { reviewCount: Number(body.reviewCount) } : {}),
        ...(body.soldCount !== undefined ? { soldCount: Number(body.soldCount) } : {}),
        ...(body.location !== undefined ? { location: body.location?.trim() || null } : {}),
        ...(body.category !== undefined ? { category: body.category.trim() } : {}),
        ...(body.url !== undefined ? { url: body.url.trim() } : {}),
        ...(body.affiliateUrl !== undefined ? { affiliateUrl: body.affiliateUrl?.trim() || null } : {}),
        ...(body.marketplace !== undefined ? { marketplace: body.marketplace.trim() } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.isViral !== undefined ? { isViral: body.isViral } : {}),
        ...(body.isPinned !== undefined ? { isPinned: body.isPinned } : {}),
        ...(body.isHidden !== undefined ? { isHidden: body.isHidden } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      },
    });

    return NextResponse.json({ product: toProduct(updated) });
  } catch (err) {
    console.error("[api/shopee-products PATCH] Error:", err);
    return NextResponse.json({ error: "Gagal memperbarui produk" }, { status: 500 });
  }
}

/** DELETE /api/shopee-products?id=xxx */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.shopeeProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/shopee-products DELETE] Error:", err);
    return NextResponse.json({ error: "Gagal menghapus produk" }, { status: 500 });
  }
}
