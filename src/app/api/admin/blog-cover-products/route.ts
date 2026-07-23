import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/admin/blog-cover-products
 *
 * List produk JB untuk dipilih sebagai cover image blog.
 * Return field minimal (id, title, image, price, category) supaya ringan.
 *
 * Query params:
 *   - q: search title (case-insensitive)
 *   - category: filter by category exact
 *   - limit: default 60, max 200
 *
 * Protected by admin cookie auth.
 */
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const category = url.searchParams.get("category")?.trim() || "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "60", 10), 200);

    const where: any = {};
    if (category) where.category = category;

    // Fetch products (filter category di DB level, search di app level untuk cross-DB compat)
    const rows = await db.shopeeProduct.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        image: true,
        price: true,
        originalPrice: true,
        discountPercent: true,
        category: true,
        marketplace: true,
        isPinned: true,
        isHidden: true,
      },
    });

    // Filter search di application level (case-insensitive, works di sqlite & postgresql)
    let products = rows;
    if (q) {
      const qLower = q.toLowerCase();
      products = rows.filter(p =>
        p.title.toLowerCase().includes(qLower) ||
        p.category.toLowerCase().includes(qLower)
      );
    }

    // Distinct categories untuk filter dropdown
    const categories = await db.shopeeProduct.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });

    return NextResponse.json({
      success: true,
      products,
      categories: categories.map(c => c.category),
      total: products.length,
    });
  } catch (err: any) {
    console.error("[api/admin/blog-cover-products] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
