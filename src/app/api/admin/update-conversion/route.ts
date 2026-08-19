import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/admin/update-conversion
 *
 * Update conversionCount + conversionValue manual per produk.
 * User cek AT dashboard → input angka konversi di tab Klik JB.
 *
 * Body: { productId, conversionCount, conversionValue? }
 * - conversionCount: jumlah konversi (integer >= 0)
 * - conversionValue: estimasi komisi Rupiah (integer >= 0, optional)
 *
 * Protected by admin cookie auth.
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { productId, conversionCount, conversionValue } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId wajib diisi" }, { status: 400 });
    }

    const count = Math.max(0, parseInt(conversionCount, 10) || 0);
    const value = Math.max(0, parseInt(conversionValue, 10) || 0);

    const updated = await db.shopeeProduct.update({
      where: { id: productId },
      data: {
        conversionCount: count,
        conversionValue: value,
      },
      select: {
        id: true,
        title: true,
        conversionCount: true,
        conversionValue: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Konversi diupdate",
      product: updated,
    });
  } catch (err: any) {
    console.error("[api/admin/update-conversion] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
