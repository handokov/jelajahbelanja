import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

// POST /api/upload — upload gambar ke Vercel Blob
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Hanya file gambar yang diperbolehkan" }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
    }

    // Upload ke Vercel Blob
    const filename = `banners/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error("[api/upload POST] Error:", err?.message || err);

    // Fallback: jika Vercel Blob belum dikonfigurasi, kembalikan error yang jelas
    if (err?.message?.includes("BLOB_READ_WRITE_TOKEN") || err?.message?.includes("No token")) {
      return NextResponse.json(
        { error: "Vercel Blob belum dikonfigurasi. Tambahkan BLOB_READ_WRITE_TOKEN di Vercel dashboard, atau gunakan URL gambar langsung." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Gagal mengupload gambar: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
