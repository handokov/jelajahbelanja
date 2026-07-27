import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/admin/backfill-discount
 *
 * Backfill discountPercent untuk produk yang punya originalPrice > price
 * tapi discountPercent null. Auto-calc: round((1 - price/originalPrice) * 100)
 *
 * Fix: scraper v3.3.6 kirim originalPrice tapi API lama tidak auto-calc.
 * Setelah backfill, produk masuk flash sale section.
 *
 * Protected by admin cookie auth.
 */
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const products = await db.shopeeProduct.findMany({
      where: {
        originalPrice: { gt: 0 },
        discountPercent: null,
      },
      select: { id: true, title: true, price: true, originalPrice: true },
    });

    let updated = 0;
    let skipped = 0;
    const details: Array<{ id: string; title: string; price: number; originalPrice: number; discountPercent: number }> = [];

    for (const p of products) {
      if (p.originalPrice && p.originalPrice > p.price) {
        const discountPercent = Math.round((1 - p.price / p.originalPrice) * 100);
        await db.shopeeProduct.update({
          where: { id: p.id },
          data: { discountPercent },
        });
        updated++;
        if (details.length < 20) {
          details.push({
            id: p.id,
            title: p.title.slice(0, 50),
            price: p.price,
            originalPrice: p.originalPrice,
            discountPercent,
          });
        }
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfill selesai: ${updated} produk diupdate, ${skipped} skipped`,
      total: products.length,
      updated,
      skipped,
      details,
    });
  } catch (err: any) {
    console.error("[api/admin/backfill-discount] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
