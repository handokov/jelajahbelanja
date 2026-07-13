import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET: list all unique product categories + count + mapping suggestions
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const groups = await db.shopeeProduct.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Get all main categories
    const mainCats = await db.category.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    });

    // Auto-suggest mapping based on keywords
    const suggestions: Record<string, string> = {};
    for (const g of groups) {
      const cat = g.category.toLowerCase();
      if (cat.includes("fashion") || cat.includes("pakaian") || cat.includes("baju") || cat.includes("sepatu") || cat.includes("celana") || cat.includes("dress") || cat.includes("kaos")) {
        suggestions[g.category] = "Fashion";
      } else if (cat.includes("anak") || cat.includes("bayi") || cat.includes("kids") || cat.includes("baby")) {
        suggestions[g.category] = "Fashion Anak";
      } else if (cat.includes("beauty") || cat.includes("kosmetik") || cat.includes("skincare") || cat.includes("makeup") || cat.includes("parfum") || cat.includes("lipstik")) {
        suggestions[g.category] = "Beauty";
      } else if (cat.includes("home") || cat.includes("rumah") || cat.includes("dapur") || cat.includes("dekor") || cat.includes("botol") || cat.includes("mug") || cat.includes("cangkir") || cat.includes("termos") || cat.includes("kitchen")) {
        suggestions[g.category] = "Home";
      } else if (cat.includes("elektronik") || cat.includes("gadget") || cat.includes("smartphone") || cat.includes("headphone") || cat.includes("earbuds") || cat.includes("powerbank") || cat.includes("charger") || cat.includes("tongsis") || cat.includes("kabel") || cat.includes("holder") || cat.includes("case") || cat.includes("mobile")) {
        suggestions[g.category] = "Elektronik";
      } else if (cat.includes("gaming") || cat.includes("game") || cat.includes("console")) {
        suggestions[g.category] = "Gaming";
      } else if (cat.includes("olahraga") || cat.includes("sport") || cat.includes("fitness")) {
        suggestions[g.category] = "Olahraga";
      } else if (cat.includes("otomotif") || cat.includes("mobil") || cat.includes("motor")) {
        suggestions[g.category] = "Otomotif";
      } else if (cat.includes("mainan") || cat.includes("toys") || cat.includes("toy")) {
        suggestions[g.category] = "Mainan";
      } else if (cat.includes("kesehatan") || cat.includes("health")) {
        suggestions[g.category] = "kesehatan";
      } else if (cat.includes("kelistrikan") || cat.includes("listrik")) {
        suggestions[g.category] = "kelistrikan";
      } else {
        suggestions[g.category] = ""; // no suggestion
      }
    }

    return NextResponse.json({
      categories: groups.map(g => ({
        name: g.category,
        count: g._count.id,
        suggestion: suggestions[g.category] || "",
      })),
      mainCategories: mainCats.map(c => c.name),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: bulk remap products from one category to another
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { fromCategory, toCategory } = body;

    if (!fromCategory || !toCategory) {
      return NextResponse.json({ error: "fromCategory dan toCategory wajib diisi" }, { status: 400 });
    }

    const result = await db.shopeeProduct.updateMany({
      where: { category: fromCategory },
      data: { category: toCategory, updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
      from: fromCategory,
      to: toCategory,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
