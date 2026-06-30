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

    // Verify product exists first
    const existing = await db.shopeeProduct.findUnique({ where: { id: body.id } });
    if (!existing) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.image !== undefined) data.image = body.image.trim();
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.originalPrice !== undefined) data.originalPrice = Number(body.originalPrice) || null;
    if (body.discountPercent !== undefined) data.discountPercent = Number(body.discountPercent) || null;
    if (body.rating !== undefined) data.rating = Number(body.rating);
    if (body.reviewCount !== undefined) data.reviewCount = Number(body.reviewCount);
    if (body.soldCount !== undefined) data.soldCount = Number(body.soldCount);
    if (body.location !== undefined) data.location = body.location?.trim() || null;
    if (body.category !== undefined) data.category = body.category.trim();
    if (body.url !== undefined) data.url = body.url.trim();
    if (body.affiliateUrl !== undefined) data.affiliateUrl = body.affiliateUrl?.trim() || null;
    if (body.marketplace !== undefined) data.marketplace = body.marketplace.trim();
    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.isViral !== undefined) data.isViral = body.isViral;
    if (body.isPinned !== undefined) data.isPinned = body.isPinned;
    if (body.isHidden !== undefined) data.isHidden = body.isHidden;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

    const updated = await db.shopeeProduct.update({
      where: { id: body.id },
      data,
    });

    return NextResponse.json({ product: toProduct(updated) });
  } catch (err: any) {
    console.error("[api/shopee-products PATCH] Error:", err?.message || err);
    console.error("[api/shopee-products PATCH] Stack:", err?.stack);
    // Return specific error for debugging
    const errorMsg = err?.code === "P2025"
      ? "Produk tidak ditemukan"
      : err?.code === "P2002"
        ? "Data duplikat, cek field unik"
        : `Gagal memperbarui produk: ${err?.message || "Unknown error"}`;
    return NextResponse.json({ error: errorMsg, code: err?.code }, { status: 500 });
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
