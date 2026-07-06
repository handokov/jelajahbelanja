/**
 * Image Proxy with Vercel Blob Cache
 * 
 * File: app/api/image-proxy/route.ts
 * 
 * Versi ini pakai Vercel Blob buat simpan gambar secara permanent.
 * Kalau gambar sudah pernah di-download, langsung ambil dari Blob (cepet + gak re-download).
 * 
 * Cara setup:
 * 1. npm install @vercel/blob
 * 2. Set env variable BLOB_READ_WRITE_TOKEN di Vercel dashboard
 *    (Settings → Environment Variables)
 * 3. Copy file ini ke app/api/image-proxy/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { put, head } from "@vercel/blob";

const ALLOWED_DOMAINS = [
  "down-id.img.susercontent.com",
  "down-img.susercontent.com",
  "susercontent.com",
  "cf.shopee.sg",
  "cf.shopee.co.id",
  "cbn.net",
  "tokopedia.net",
  "ktpcdn.com",
  "img.tokopedia.com",
  "images.tokopedia.com",
  "accesstrade.com",
  "atid.me",
  "placehold.co",
  "via.placeholder.com",
];

function isAllowedDomain(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

// Generate unique filename from URL
function imageKey(url: string): string {
  // Simple hash from URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const positiveHash = Math.abs(hash).toString(36);

  // Try to get extension
  const extMatch = url.match(/\.(jpg|jpeg|png|webp|gif)/i);
  const ext = extMatch ? extMatch[1] : "jpg";

  return `jb-images/${positiveHash}.${ext}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Parameter url diperlukan" }, { status: 400 });
  }

  const decodedUrl = decodeURIComponent(imageUrl);

  if (!isAllowedDomain(decodedUrl)) {
    return NextResponse.json(
      { error: "Domain tidak di-allow" },
      { status: 403 }
    );
  }

  const key = imageKey(decodedUrl);

  // Cek apakah sudah ada di Vercel Blob
  try {
    const existing = await head(key);
    if (existing) {
      // Sudah ada! Redirect ke Blob URL
      return NextResponse.redirect(existing.url);
    }
  } catch {
    // Belum ada di Blob, lanjut download
  }

  try {
    // Download gambar
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: new URL(decodedUrl).origin + "/",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal download gambar: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();

    // Simpan ke Vercel Blob
    const blob = await put(key, arrayBuffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });

    // Redirect ke Blob URL
    return NextResponse.redirect(blob.url);
  } catch (error) {
    console.error("Image proxy error:", error);

    // Fallback: serve langsung tanpa simpan ke Blob
    try {
      const fallbackResp = await fetch(decodedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: new URL(decodedUrl).origin + "/",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (fallbackResp.ok) {
        const buf = await fallbackResp.arrayBuffer();
        const ct = fallbackResp.headers.get("content-type") || "image/jpeg";
        return new NextResponse(buf, {
          headers: {
            "Content-Type": ct,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    } catch {}

    return NextResponse.json(
      { error: "Gagal mengambil gambar" },
      { status: 500 }
    );
  }
}
