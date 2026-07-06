/**
 * Image Proxy API Route for Next.js
 * 
 * File: app/api/image-proxy/route.ts
 * 
 * Fungsi: Download gambar dari Tokopedia/Shopee/AT dan serve dari server JB
 * Supaya gambar gak di-block oleh hotlink protection.
 * 
 * Cara pakai:
 *   /api/image-proxy?url=https://down-id.img.susercontent.com/file/xxx
 *   /api/image-proxy?url=https://cbn.com/xxx
 * 
 * Install dependency:
 *   npm install @vercel/blob
 * 
 * Opsional: Kalau mau cache permanen ke Vercel Blob, set env:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxx
 */

import { NextRequest, NextResponse } from "next/server";

// Cache di memory (simple, restart = hilang)
const imageCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_MAX = 500; // max 500 gambar di cache
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 jam

// Domain yang di-allow (security — cuma marketplace yang relevant)
const ALLOWED_DOMAINS = [
  // Shopee
  "down-id.img.susercontent.com",
  "down-img.susercontent.com",
  "susercontent.com",
  "cf.shopee.sg",
  "cf.shopee.co.id",
  // Tokopedia
  "cbn.net",
  "tokopedia.net",
  "ktpcdn.com",
  "img.tokopedia.com",
  "images.tokopedia.com",
  // Accesstrade
  "accesstrade.com",
  "atid.me",
  // General CDN
  "placehold.co",
  "via.placeholder.com",
];

function isAllowedDomain(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(
      (d) => host === d || host.endsWith("." + d)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Parameter url diperlukan" }, { status: 400 });
  }

  // Decode kalau di-encode
  const decodedUrl = decodeURIComponent(imageUrl);

  // Security: cuma allow domain tertentu
  if (!isAllowedDomain(decodedUrl)) {
    return NextResponse.json(
      { error: "Domain tidak di-allow. Tambahkan di ALLOWED_DOMAINS." },
      { status: 403 }
    );
  }

  // Cek cache dulu
  const cached = imageCache.get(decodedUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.data, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    // Download gambar dari source
    const response = await fetch(decodedUrl, {
      headers: {
        // Fake browser headers supaya gak di-block
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: new URL(decodedUrl).origin + "/",
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal download gambar: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Simpan ke cache
    if (imageCache.size >= CACHE_MAX) {
      // Hapus entry tertua
      const oldestKey = imageCache.keys().next().value;
      if (oldestKey) imageCache.delete(oldestKey);
    }
    imageCache.set(decodedUrl, {
      data: buffer,
      contentType,
      timestamp: Date.now(),
    });

    // Return gambar
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil gambar" },
      { status: 500 }
    );
  }
}
