import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/bulk-products
 *
 * Bulk operations untuk hide/delete produk berdasarkan filter.
 *
 * Body:
 *   { "action": "hide-by-filter", "filter": { ... } }
 *   { "action": "unhide-by-filter", "filter": { ... } }
 *   { "action": "delete-by-filter", "filter": { ... } }
 *   { "action": "delete-hidden" }
 *   { "action": "delete-by-ids", "ids": [...] }
 *
 * Filter fields (optional, di-AND kan):
 *   - categories: string[] — array nama kategori (cth: ["Fashion", "Elektronik"])
 *   - excludeAnakProducts: boolean — skip produk yang title-nya mengandung keyword anak
 *   - excludeKeywords: string[] — skip produk yang title-nya mengandung keyword ini
 *     (cth: ["anak", "sekolah", "bayi", "balita"] — supaya tas anak tidak ke-hide)
 *   - ratingBelow: number — hanya produk dengan rating < ini
 *   - marketplace: string — filter by marketplace
 *
 * Protected by admin auth.
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action, filter, ids } = body as {
      action: string;
      filter?: {
        categories?: string[];
        excludeAnakProducts?: boolean;
        excludeKeywords?: string[];
        ratingBelow?: number;
        marketplace?: string;
      };
      ids?: string[];
    };

    // ─── Build where clause dari filter ───
    function buildWhereClause(f: typeof filter) {
      if (!f) return {};

      const where: any = { AND: [] };

      // Filter by categories (produk yang category-nya ada di array)
      if (f.categories && f.categories.length > 0) {
        where.AND.push({ category: { in: f.categories } });
      }

      // Filter by marketplace
      if (f.marketplace) {
        where.AND.push({ marketplace: f.marketplace });
      }

      // Filter by rating below threshold
      if (f.ratingBelow !== undefined) {
        where.AND.push({ rating: { lt: f.ratingBelow } });
      }

      // Exclude produk yang title-nya mengandung keyword tertentu
      // (cth: "anak", "sekolah", "bayi" — supaya tas anak tidak ke-hide)
      if (f.excludeKeywords && f.excludeKeywords.length > 0) {
        // Prisma: title NOT CONTAINS each keyword (case-insensitive)
        // Pakai mode: insensitive supaya case tidak masalah
        for (const kw of f.excludeKeywords) {
          where.AND.push({
            title: { not: { contains: kw, mode: "insensitive" } },
          });
        }
      }

      // Shortcut: excludeAnakProducts = true → exclude semua keyword anak
      if (f.excludeAnakProducts) {
        const anakKeywords = [
          "anak", "bayi", "balita", "sekolah", "sd ", "smp", "sma ",
          "perempuan", "cewe", "cewek", "cowok", "laki-laki",
          "jepit rambut", "kaos kaki", "dress anak", "daster anak",
          "mukena anak", "romper", "tumbler anak", "botol anak",
          "mainan", "edukatif", "buku anak", "crayon", "pensil anak",
          "kacamata anak", "sepatu anak", "tas anak", "ransel anak",
          "hijab anak", "jilbab anak", "kerudung anak",
        ];
        for (const kw of anakKeywords) {
          where.AND.push({
            title: { not: { contains: kw, mode: "insensitive" } },
          });
        }
      }

      if (where.AND.length === 0) delete where.AND;
      return where;
    }

    // ─── Action: HIDE BY FILTER ───
    if (action === "hide-by-filter") {
      const where = buildWhereClause(filter);
      const result = await db.shopeeProduct.updateMany({
        where,
        data: { isHidden: true },
      });
      return NextResponse.json({
        success: true,
        action: "hide-by-filter",
        affected: result.count,
        message: `${result.count} produk berhasil di-hide`,
      });
    }

    // ─── Action: UNHIDE BY FILTER ───
    if (action === "unhide-by-filter") {
      const where = buildWhereClause(filter);
      const result = await db.shopeeProduct.updateMany({
        where: { ...where, isHidden: true },
        data: { isHidden: false },
      });
      return NextResponse.json({
        success: true,
        action: "unhide-by-filter",
        affected: result.count,
        message: `${result.count} produk berhasil di-unhide`,
      });
    }

    // ─── Action: DELETE BY FILTER ───
    if (action === "delete-by-filter") {
      const where = buildWhereClause(filter);
      const result = await db.shopeeProduct.deleteMany({ where });
      return NextResponse.json({
        success: true,
        action: "delete-by-filter",
        affected: result.count,
        message: `${result.count} produk berhasil di-DELETE permanen`,
      });
    }

    // ─── Action: DELETE ALL HIDDEN ───
    if (action === "delete-hidden") {
      const result = await db.shopeeProduct.deleteMany({
        where: { isHidden: true },
      });
      return NextResponse.json({
        success: true,
        action: "delete-hidden",
        affected: result.count,
        message: `${result.count} produk hidden berhasil di-DELETE permanen`,
      });
    }

    // ─── Action: DELETE BY IDS ───
    if (action === "delete-by-ids") {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: "ids wajib array berisi product IDs" },
          { status: 400 }
        );
      }
      const result = await db.shopeeProduct.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({
        success: true,
        action: "delete-by-ids",
        affected: result.count,
        message: `${result.count} produk berhasil di-DELETE permanen`,
      });
    }

    // ─── Action: PREVIEW (dry-run — count saja, tidak execute) ───
    if (action === "preview") {
      const where = buildWhereClause(filter);
      const count = await db.shopeeProduct.count({ where });
      // Sample 10 produk untuk preview
      const samples = await db.shopeeProduct.findMany({
        where,
        select: { id: true, title: true, category: true, marketplace: true, rating: true, isHidden: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        success: true,
        action: "preview",
        count,
        samples,
      });
    }

    return NextResponse.json(
      { success: false, error: "action tidak valid. Pilih: hide-by-filter, unhide-by-filter, delete-by-filter, delete-hidden, delete-by-ids, preview" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[admin/bulk-products] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
