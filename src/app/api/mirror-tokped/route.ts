import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 detik per request
export const fetchCache = "force-no-store";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * POST /api/mirror-tokped
 *
 * Mirror image Tokopedia ke Cloudinary dengan download base64 approach.
 * Flow:
 * 1. Fetch halaman produk Tokopedia (server-side dari Vercel)
 * 2. Extract fresh image URL dari HTML
 * 3. Download image ke buffer
 * 4. Upload buffer ke Cloudinary sebagai base64 (permanent URL)
 * 5. Update product image di DB
 *
 * Body: { "limit": 5 }  — proses 5 produk per request
 *       { "productId": "xxx" } — proses 1 produk spesifik
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit) || 1; // Default 1 per request (Vercel timeout)
    const productId = body.productId as string | undefined;

    // Get products that need mirror
    const products = await db.shopeeProduct.findMany({
      where: productId
        ? { id: productId }
        : {
            enabled: true,
            isHidden: false,
            marketplace: "tokopedia",
            image: { contains: "tokopedia-static" },
            NOT: { image: { contains: "cloudinary.com" } },
          },
      select: { id: true, url: true, title: true, image: true },
      take: productId ? 1 : limit,
    });

    if (products.length === 0) {
      return NextResponse.json({ success: true, message: "No products need mirror", mirrored: 0 });
    }

    const results: Array<{ id: string; title: string; status: string; cloudUrl?: string; error?: string }> = [];

    for (const product of products) {
      try {
        // Step 1: Fetch Tokopedia product page — only read first 50KB (og:image is in <head>)
        const pageRes = await fetch(product.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "id-ID,id;q=0.9",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(8000), // 8s max (Vercel free tier = 10s total)
        });

        if (!pageRes.ok) {
          results.push({ id: product.id, title: product.title.slice(0, 40), status: "fail", error: `Page fetch ${pageRes.status}` });
          continue;
        }

        // Read only first 50KB (og:image is in <head>, don't need full page)
        const reader = pageRes.body?.getReader();
        let html = "";
        if (reader) {
          const decoder = new TextDecoder();
          while (html.length < 50000) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
          }
          reader.cancel();
        }

        // Step 2: Extract image URL (try og:image first, then other patterns)
        let imageUrl: string | null = null;

        // Try og:image meta tag
        const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)/i)
          || html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
        if (ogMatch) imageUrl = ogMatch[1];

        // Try twitter:image
        if (!imageUrl) {
          const twMatch = html.match(/name=["']twitter:image["']\s+content=["']([^"']+)/i)
            || html.match(/content=["']([^"']+)["']\s+name=["']twitter:image["']/i);
          if (twMatch) imageUrl = twMatch[1];
        }

        // Try signed CDN URLs (download immediately before they expire)
        if (!imageUrl) {
          const signMatch = html.match(/https:\/\/p16-images-sign-sg\.tokopedia-static\.net\/[^"'\s<>\\]+\.(?:jpg|jpeg|png|webp)/i);
          if (signMatch) imageUrl = signMatch[0];
        }

        // Try permanent URLs
        if (!imageUrl) {
          const permMatch = html.match(/https:\/\/images\.tokopedia\.net\/img\/cache\/[^"'\s<>\\]+/i);
          if (permMatch) imageUrl = permMatch[0].replace(/[);\\]+$/, "");
        }

        if (!imageUrl) {
          results.push({ id: product.id, title: product.title.slice(0, 40), status: "fail", error: "No image URL found" });
          continue;
        }

        // Step 3: Download image to buffer
        const imgRes = await fetch(imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.tokopedia.com/",
            "Accept": "image/*",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!imgRes.ok) {
          results.push({ id: product.id, title: product.title.slice(0, 40), status: "fail", error: `Image download ${imgRes.status}` });
          continue;
        }

        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 1000) {
          results.push({ id: product.id, title: product.title.slice(0, 40), status: "fail", error: "Image too small (probably error page)" });
          continue;
        }

        // Step 4: Upload to Cloudinary as base64
        const ext = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
        const base64 = buffer.toString("base64");
        const dataURI = `data:image/${ext};base64,${base64}`;

        const timestamp = Math.floor(Date.now() / 1000);
        const sigStr = `folder=jb-products/mirror&overwrite=true&public_id=${product.id}&timestamp=${timestamp}${API_SECRET}`;
        const signature = crypto.createHash("sha1").update(sigStr).digest("hex");

        const formData = new FormData();
        formData.append("file", dataURI);
        formData.append("public_id", product.id);
        formData.append("folder", "jb-products/mirror");
        formData.append("overwrite", "true");
        formData.append("timestamp", String(timestamp));
        formData.append("api_key", API_KEY!);
        formData.append("signature", signature);

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          results.push({ id: product.id, title: product.title.slice(0, 40), status: "fail", error: `Cloudinary ${uploadRes.status}: ${errText.slice(0, 100)}` });
          continue;
        }

        const uploadData = await uploadRes.json();
        const cloudUrl = uploadData.secure_url;

        // Step 5: Update product image in DB
        await db.shopeeProduct.update({
          where: { id: product.id },
          data: { image: cloudUrl, updatedAt: new Date() },
        });

        results.push({ id: product.id, title: product.title.slice(0, 40), status: "ok", cloudUrl });
      } catch (err: any) {
        results.push({ id: product.id, title: product.title.slice(0, 40), status: "fail", error: err.message?.slice(0, 100) });
      }
    }

    const okCount = results.filter(r => r.status === "ok").length;
    const failCount = results.filter(r => r.status === "fail").length;

    return NextResponse.json({
      success: true,
      total: results.length,
      mirrored: okCount,
      failed: failCount,
      results,
    });
  } catch (err: any) {
    console.error("[api/mirror-tokped] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
