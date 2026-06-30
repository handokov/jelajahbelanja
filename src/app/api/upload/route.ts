import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

// POST /api/upload — upload gambar ke Vercel Blob
// Dua mode:
// 1. FormData dengan "file" — upload file langsung
// 2. JSON dengan "url" — download dari URL, re-upload ke Blob (proxy untuk bypass hotlink protection)
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Mode 1: File upload (FormData)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Hanya file gambar yang diperbolehkan" }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
      }

      const filename = `banners/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
      });

      return NextResponse.json({ url: blob.url });
    }

    // Mode 2: URL download (JSON)
    const body = await req.json();
    const imageUrl = body.url;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
    }

    // Download gambar dari URL
    console.log("[api/upload] Downloading image from:", imageUrl.substring(0, 100));
    const imgRes = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/*,*/*",
        "Referer": new URL(imageUrl).origin + "/",
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Gagal download gambar (status ${imgRes.status}). Coba upload file langsung saja.` },
        { status: 400 }
      );
    }

    const imgContentType = imgRes.headers.get("content-type") || "image/jpeg";
    if (!imgContentType.startsWith("image/") && !imgContentType.includes("octet-stream")) {
      return NextResponse.json(
        { error: "URL bukan gambar. Coba upload file langsung." },
        { status: 400 }
      );
    }

    const imgBuffer = await imgRes.arrayBuffer();

    if (imgBuffer.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran gambar dari URL melebihi 5MB" }, { status: 400 });
    }

    // Upload ke Vercel Blob
    const ext = imgContentType.includes("png") ? "png" : imgContentType.includes("webp") ? "webp" : "jpg";
    const filename = `banners/${Date.now()}-downloaded.${ext}`;
    const blob = await put(filename, imgBuffer, {
      access: "public",
      contentType: imgContentType.includes("octet-stream") ? "image/jpeg" : imgContentType,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error("[api/upload POST] Error:", err?.message || err);

    if (err?.message?.includes("BLOB_READ_WRITE_TOKEN") || err?.message?.includes("No token")) {
      return NextResponse.json(
        { error: "Vercel Blob belum dikonfigurasi. Tambahkan BLOB_READ_WRITE_TOKEN di Vercel dashboard." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Gagal mengupload gambar: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
