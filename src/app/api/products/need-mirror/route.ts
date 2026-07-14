import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/need-mirror
 * Return list produk Tokopedia yang image-nya expired (perlu mirror ke Cloudinary).
 * Dipakai oleh scraper extension untuk "Refresh Image" mode.
 * Public endpoint (no auth).
 */
export async function GET() {
  try {
    const products = await db.shopeeProduct.findMany({
      where: {
        enabled: true,
        isHidden: false,
        marketplace: "tokopedia",
        image: { contains: "tokopedia-static" },
        NOT: { image: { contains: "cloudinary.com" } },
      },
      select: { id: true, url: true, title: true, image: true },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      total: products.length,
      products: products.map(p => ({
        id: p.id,
        url: p.url,
        title: p.title.slice(0, 60),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
