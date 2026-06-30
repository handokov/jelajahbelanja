import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/banners — ambil semua banner (admin) atau hanya yang aktif (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";

    const where = activeOnly
      ? {
          isActive: true,
          OR: [
            // Tanpa tanggal — selalu tampil
            { startDate: null, endDate: null },
            // Hanya ada startDate — tampil jika sudah lewat startDate
            { startDate: { lte: new Date() }, endDate: null },
            // Hanya ada endDate — tampil jika belum lewat endDate
            { startDate: null, endDate: { gte: new Date() } },
            // Ada keduanya — tampil jika dalam rentang
            { startDate: { lte: new Date() }, endDate: { gte: new Date() } },
          ],
        }
      : {};

    const banners = await db.promoBanner.findMany({
      where,
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ banners });
  } catch (err: any) {
    console.error("[api/banners GET] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Gagal memuat banner" },
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
      { error: "Gagal membuat banner" },
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
