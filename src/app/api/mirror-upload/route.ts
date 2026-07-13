import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "jelajahbelanja2024";

function checkAuth(req: NextRequest): NextResponse | null {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * POST /api/mirror-upload
 *
 * Terima image sebagai base64 dari scraper extension → upload ke Cloudinary.
 * Cloudinary credentials tetap di server (aman, tidak exposed di extension).
 *
 * Body: { "image": "data:image/jpeg;base64,...", "publicId": "product-xxx" }
 * Response: { "success": true, "url": "https://res.cloudinary.com/..." }
 *
 * Flow di scraper:
 * 1. Download image dari Tokopedia CDN (browser context, bisa akses)
 * 2. Convert ke base64
 * 3. POST ke API ini
 * 4. Dapat Cloudinary URL (permanent, tidak expired)
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { image, publicId } = body as { image: string; publicId: string };

    if (!image || !image.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, error: "image harus data URI (data:image/...;base64,...)" },
        { status: 400 }
      );
    }

    if (!publicId) {
      return NextResponse.json(
        { success: false, error: "publicId wajib diisi" },
        { status: 400 }
      );
    }

    // Upload ke Cloudinary
    const timestamp = Math.floor(Date.now() / 1000);
    const sigStr = `folder=jb-products/mirror&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash("sha1").update(sigStr).digest("hex");

    const formData = new FormData();
    formData.append("file", image);
    formData.append("public_id", publicId);
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
      return NextResponse.json(
        { success: false, error: `Cloudinary ${uploadRes.status}: ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const uploadData = await uploadRes.json();
    const cloudUrl = uploadData.secure_url;

    return NextResponse.json({
      success: true,
      url: cloudUrl,
    });
  } catch (err: any) {
    console.error("[api/mirror-upload] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
