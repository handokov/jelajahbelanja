import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/affiliate-ads — ambil semua affiliate ads (admin) atau hanya yang aktif (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";
    const position = searchParams.get("position"); // sidebar, header, footer, in-content

    const where: any = {};
    if (activeOnly) where.isActive = true;
    if (position) where.position = position;

    const ads = await db.affiliateAd.findMany({
      where,
      orderBy: { order: "asc" },
    });

    // Filter berdasarkan tanggal jika activeOnly
    if (activeOnly) {
      const now = new Date();
      const filtered = ads.filter((ad) => {
        if (!ad.startDate && !ad.endDate) return true;
        if (!ad.startDate && ad.endDate) return ad.endDate >= now;
        if (ad.startDate && !ad.endDate) {
          const startPlus24h = new Date(ad.startDate.getTime() - 24 * 60 * 60 * 1000);
          return now >= startPlus24h;
        }
        const startPlus24h = new Date(ad.startDate!.getTime() - 24 * 60 * 60 * 1000);
        return now >= startPlus24h && ad.endDate! >= now;
      });
      return NextResponse.json({ ads: filtered });
    }

    return NextResponse.json({ ads });
  } catch (err: any) {
    console.error("[api/affiliate-ads GET] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Gagal memuat affiliate ads: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

// POST /api/affiliate-ads — buat affiliate ad baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.href || !body.imgSrc) {
      return NextResponse.json(
        { error: "Nama, link (href), dan gambar (imgSrc) wajib diisi" },
        { status: 400 }
      );
    }

    const ad = await db.affiliateAd.create({
      data: {
        name: body.name,
        platform: body.platform || "accesstrade",
        href: body.href,
        imgSrc: body.imgSrc,
        trackingPixel: body.trackingPixel || null,
        width: body.width ?? 300,
        height: body.height ?? 250,
        position: body.position || "sidebar",
        order: body.order ?? 0,
        isActive: body.isActive !== false,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return NextResponse.json({ ad }, { status: 201 });
  } catch (err: any) {
    console.error("[api/affiliate-ads POST] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Gagal membuat affiliate ad: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

// PATCH /api/affiliate-ads — update affiliate ad
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID affiliate ad wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await db.affiliateAd.findUnique({
      where: { id: body.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Affiliate ad tidak ditemukan" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    const fields = [
      "name", "platform", "href", "imgSrc", "trackingPixel",
      "width", "height", "position", "order", "isActive",
      "startDate", "endDate",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) {
        data[f] = f === "startDate" || f === "endDate"
          ? (body[f] ? new Date(body[f]) : null)
          : body[f];
      }
    }

    const updated = await db.affiliateAd.update({
      where: { id: body.id },
      data,
    });

    return NextResponse.json({ ad: updated });
  } catch (err: any) {
    console.error("[api/affiliate-ads PATCH] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Gagal memperbarui affiliate ad" },
      { status: 500 }
    );
  }
}

// DELETE /api/affiliate-ads — hapus affiliate ad
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID affiliate ad wajib diisi" },
        { status: 400 }
      );
    }

    await db.affiliateAd.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/affiliate-ads DELETE] Error:", err?.message || err);
    if (err?.code === "P2025") {
      return NextResponse.json(
        { error: "Affiliate ad tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menghapus affiliate ad" },
      { status: 500 }
    );
  }
}