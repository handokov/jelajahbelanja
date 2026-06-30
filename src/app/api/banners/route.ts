import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/banners — ambil semua banner (admin) atau hanya yang aktif (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";

    if (activeOnly) {
      const all = await db.promoBanner.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });

      const now = new Date();
      const banners = all.filter((b) => {
        // Tanpa tanggal = selalu tampil
        if (!b.startDate && !b.endDate) return true;
        // Hanya endDate = tampil sebelum berakhir
        if (!b.startDate && b.endDate) return b.endDate >= now;
        // Hanya startDate = tampil (kasih toleransi 24 jam untuk timezone)
        if (b.startDate && !b.endDate) {
          const startPlus24h = new Date(b.startDate.getTime() - 24 * 60 * 60 * 1000);
          return now >= startPlus24h;
        }
        // Keduanya = dalam rentang (kasih toleransi 24 jam di startDate)
        const startPlus24h = new Date(b.startDate!.getTime() - 24 * 60 * 60 * 1000);
        return now >= startPlus24h && b.endDate! >= now;
      });

      return NextResponse.json({ banners, debug: { now: now.toISOString(), total: all.length, filtered: banners.length } });
    }

    // Admin: ambil semua
    const banners = await db.promoBanner.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ banners });
  } catch (err: any) {
    console.error("[api/banners GET] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Gagal memuat banner: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

// POST /api/banners — buat banner baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.image) {
      return NextResponse.json(
        { error: "Judul dan gambar wajib diisi" },
        { status: 400 }
      );
    }

    const banner = await db.promoBanner.create({
      data: {
        title: body.title,
        subtitle: body.subtitle || null,
        image: body.image,
        linkUrl: body.linkUrl || null,
        linkLabel: body.linkLabel || null,
        bgColor: body.bgColor || "#7c3aed",
        order: body.order ?? 0,
        isActive: body.isActive !== false,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return NextResponse.json({ banner }, { status: 201 });
  } catch (err: any) {
    console.error("[api/banners POST] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Gagal membuat banner: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

// PATCH /api/banners — update banner
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID banner wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await db.promoBanner.findUnique({
      where: { id: body.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Banner tidak ditemukan" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    const fields = [
      "title", "subtitle", "image", "linkUrl", "linkLabel",
      "bgColor", "order", "isActive", "startDate", "endDate",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) {
        data[f] = f === "startDate" || f === "endDate"
          ? (body[f] ? new Date(body[f]) : null)
          : body[f];
      }
    }

    const updated = await db.promoBanner.update({
      where: { id: body.id },
      data,
    });

    return NextResponse.json({ banner: updated });
  } catch (err: any) {
    console.error("[api/banners PATCH] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Gagal memperbarui banner" },
      { status: 500 }
    );
  }
}

// DELETE /api/banners — hapus banner
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID banner wajib diisi" },
        { status: 400 }
      );
    }

    await db.promoBanner.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/banners DELETE] Error:", err?.message || err);
    if (err?.code === "P2025") {
      return NextResponse.json(
        { error: "Banner tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menghapus banner" },
      { status: 500 }
    );
  }
}
