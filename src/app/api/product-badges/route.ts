import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// ─── GET /api/product-badges ───
// Public: ?active=true&marketplace=shopee → only active badges for that marketplace
// Admin: (no query) → all badges
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";
    const marketplace = searchParams.get("marketplace");

    if (activeOnly) {
      // Public endpoint — return active badges, optionally filtered by marketplace
      const all = await db.productBadge.findMany({
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });

      // Filter by marketplace (comma-separated field match)
      const filtered = marketplace
        ? all.filter((b) => {
            const mps = b.marketplaces.split(",").map((m) => m.trim().toLowerCase());
            return mps.includes(marketplace.toLowerCase());
          })
        : all;

      return NextResponse.json({ badges: filtered });
    }

    // Admin endpoint — require auth, return all
    const authErr = await checkAuth(req);
    if (authErr) return authErr;

    const badges = await db.productBadge.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ badges });
  } catch (err) {
    console.error("[api/product-badges] GET error:", err);
    return NextResponse.json({ error: "Gagal memuat product badges", badges: [] }, { status: 500 });
  }
}

// ─── POST /api/product-badges — create new badge (admin) ───
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { label, emoji, bgColor, textColor, marketplaces, order, isActive } = body;

    if (!label || typeof label !== "string" || !label.trim()) {
      return NextResponse.json({ error: "Label wajib diisi" }, { status: 400 });
    }
    if (!marketplaces || typeof marketplaces !== "string") {
      return NextResponse.json({ error: "Marketplaces wajib diisi (cth: shopee,tokopedia)" }, { status: 400 });
    }

    const badge = await db.productBadge.create({
      data: {
        label: label.trim(),
        emoji: emoji?.trim() || null,
        bgColor: bgColor || "#ef4444",
        textColor: textColor || "#ffffff",
        marketplaces: marketplaces.trim(),
        order: typeof order === "number" ? order : 0,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });
    return NextResponse.json({ success: true, badge });
  } catch (err) {
    console.error("[api/product-badges] POST error:", err);
    return NextResponse.json({ error: "Gagal membuat badge" }, { status: 500 });
  }
}

// ─── PATCH /api/product-badges?id=xxx — update badge (admin) ───
export async function PATCH(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const body = await req.json();
    const { label, emoji, bgColor, textColor, marketplaces, order, isActive } = body;

    const data: any = {};
    if (typeof label === "string") data.label = label.trim();
    if (emoji !== undefined) data.emoji = emoji?.trim() || null;
    if (typeof bgColor === "string") data.bgColor = bgColor;
    if (typeof textColor === "string") data.textColor = textColor;
    if (typeof marketplaces === "string") data.marketplaces = marketplaces.trim();
    if (typeof order === "number") data.order = order;
    if (typeof isActive === "boolean") data.isActive = isActive;

    const badge = await db.productBadge.update({ where: { id }, data });
    return NextResponse.json({ success: true, badge });
  } catch (err) {
    console.error("[api/product-badges] PATCH error:", err);
    return NextResponse.json({ error: "Gagal update badge" }, { status: 500 });
  }
}

// ─── DELETE /api/product-badges?id=xxx — delete badge (admin) ───
export async function DELETE(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    await db.productBadge.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/product-badges] DELETE error:", err);
    return NextResponse.json({ error: "Gagal hapus badge" }, { status: 500 });
  }
}
