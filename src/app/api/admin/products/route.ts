import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "jelajahbelanja2024";

function checkAuth(req: NextRequest): NextResponse | null {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/admin/products — List all products (including hidden)
 */
export async function GET(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  try {
    const products = await db.shopeeProduct.findMany({
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ products });
  } catch (err) {
    console.error("[admin/products] GET error:", err);
    return NextResponse.json({ products: [] });
  }
}

/**
 * POST /api/admin/products — Add a new product
 */
export async function POST(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { title, url, image, price, originalPrice, discountPercent, rating, reviewCount, soldCount, location, category, isViral, notes } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: "title dan url wajib diisi" },
        { status: 400 }
      );
    }

    // Ensure image has a value (empty string allowed but use placeholder)
    const finalImage = image || "https://down-id.img.susercontent.com/file/sg-11134201-7rbml-lm0y5r5m8x1f6d";
    // Ensure price is a valid number (default to 0 if not provided)
    const finalPrice = Number(price) || 0;

    const finalDiscount = discountPercent ?? (originalPrice && originalPrice > finalPrice
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : null);

    const product = await db.shopeeProduct.create({
      data: {
        title,
        url,
        image: finalImage,
        price: finalPrice,
        originalPrice: originalPrice ? Number(originalPrice) : null,
        discountPercent: finalDiscount,
        rating: rating ?? 4.5,
        reviewCount: reviewCount ?? 0,
        soldCount: soldCount ?? 0,
        location: location || null,
        category: category || "Fashion",
        isViral: isViral ?? false,
        notes: notes || null,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error("[admin/products] Create error:", err);
    return NextResponse.json({ error: "Gagal menambah produk" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products — Update a product (toggle pin/hide/viral, edit fields)
 */
export async function PATCH(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }

    const existing = await db.shopeeProduct.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const allowed = ["title", "url", "image", "price", "originalPrice", "discountPercent", "rating", "reviewCount", "soldCount", "location", "category", "isViral", "isPinned", "isHidden", "affiliateUrl", "notes"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) {
        data[key] = updates[key];
      }
    }

    // Recalculate discount if price or originalPrice changed
    if ("price" in data || "originalPrice" in data) {
      const p = Number(data.price ?? existing.price);
      const op = data.originalPrice != null ? Number(data.originalPrice) : existing.originalPrice;
      if (op && op > p) {
        data.discountPercent = Math.round(((op - p) / op) * 100);
      } else {
        data.discountPercent = null;
      }
    }

    const product = await db.shopeeProduct.update({
      where: { id },
      data,
    });

    return NextResponse.json({ product });
  } catch (err) {
    console.error("[admin/products] Update error:", err);
    return NextResponse.json({ error: "Gagal mengupdate produk" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products — Delete a product
 */
export async function DELETE(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }

    await db.shopeeProduct.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/products] Delete error:", err);
    return NextResponse.json({ error: "Gagal menghapus produk" }, { status: 500 });
  }
}
