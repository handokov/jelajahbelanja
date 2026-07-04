import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/bulk-delete-products
 *
 * Admin-only endpoint untuk hapus banyak produk sekaligus.
 *
 * Body options (bisa kombinasi):
 * - ids: string[]        — hapus produk by ID spesifik
 * - category: string     — hapus semua produk dari kategori tertentu
 * - marketplace: string  — hapus semua produk dari marketplace tertentu
 * - deleteAll: boolean   — hapus SEMUA produk (danger zone!)
 * - olderThanDays: number — hapus produk yang lebih lama dari N hari
 *
 * Returns: { deleted: number }
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { ids, category, marketplace, deleteAll, olderThanDays } = body;

    // Build where clause
    const conditions: any[] = [];

    // Filter by IDs
    if (ids && Array.isArray(ids) && ids.length > 0) {
      conditions.push({ id: { in: ids } });
    }

    // Filter by category
    if (category && typeof category === "string" && category.trim()) {
      conditions.push({ category: category.trim() });
    }

    // Filter by marketplace
    if (marketplace && typeof marketplace === "string" && marketplace.trim()) {
      conditions.push({ marketplace: marketplace.trim() });
    }

    // Filter by age
    if (olderThanDays && typeof olderThanDays === "number" && olderThanDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      conditions.push({ createdAt: { lt: cutoff } });
    }

    // Must have at least one condition unless deleteAll
    if (!deleteAll && conditions.length === 0) {
      return NextResponse.json(
        { error: "Tentukan filter: ids, category, marketplace, olderThanDays, atau deleteAll" },
        { status: 400 }
      );
    }

    const where = deleteAll
      ? {} // Delete everything
      : conditions.length === 1
        ? conditions[0]
        : { AND: conditions }; // Combine all filters with AND

    // Count first for confirmation
    const count = await db.shopeeProduct.count({ where });

    if (count === 0) {
      return NextResponse.json({ deleted: 0, message: "Tidak ada produk yang cocok dengan filter" });
    }

    // Delete
    const result = await db.shopeeProduct.deleteMany({ where });

    // Invalidate cache
    try {
      revalidatePath("/", "layout");
    } catch (e) {
      console.warn("[bulk-delete-products] revalidatePath failed:", e);
    }

    return NextResponse.json({
      deleted: result.count,
      message: `${result.count} produk berhasil dihapus`,
    });
  } catch (err: any) {
    console.error("[api/bulk-delete-products] Error:", err);
    return NextResponse.json(
      { error: `Gagal menghapus produk: ${err?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
