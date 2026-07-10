import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const EXPIRING_DOMAINS = [
  "tokopedia-static.net", "tokopedia-link", "ta.tokopedia.com",
  "p16-images", "p19-images", "p20-images", "p21-images",
  "p22-images", "p23-images", "p24-images", "p25-images",
  "p26-images", "p27-images", "p28-images", "p29-images", "p30-images",
];

function isExpiringImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("cloudinary.com")) return false;
  return EXPIRING_DOMAINS.some(d => lower.includes(d));
}

async function uploadToCloudinary(imageUrl: string, publicId: string): Promise<string | null> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    // Signature harus include SEMUA params yang dikirim (kecuali file, api_key, signature)
    // Sort alphabetically: folder, overwrite, public_id, timestamp
    const signatureStr = `folder=jb-products/mirror&overwrite=false&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash("sha1").update(signatureStr).digest("hex");

    const formData = new FormData();
    formData.append("file", imageUrl);
    formData.append("public_id", publicId);
    formData.append("folder", "jb-products/mirror");
    formData.append("overwrite", "false");
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", API_KEY!);
    formData.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      // Kalau sudah ada, return URL langsung
      if (text.includes("already exists") || text.includes("Resource exists") || text.includes("file_name already")) {
        return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/jb-products/mirror/${publicId}`;
      }
      console.error("[mirror] Upload error:", text.slice(0, 200));
      return null;
    }

    const data = await res.json();
    return data.secure_url || null;
  } catch (err) {
    console.error("[mirror] Exception:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const products = await db.shopeeProduct.findMany({
      where: { enabled: true },
      select: { id: true, image: true, marketplace: true },
    });

    const needMirror = products.filter(p => p.image && isExpiringImage(p.image));

    return NextResponse.json({
      total: products.length,
      needMirror: needMirror.length,
      alreadyMirrored: products.filter(p => p.image?.includes("cloudinary.com")).length,
      byMarketplace: needMirror.reduce((acc, p) => {
        acc[p.marketplace] = (acc[p.marketplace] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  const startTime = Date.now();
  const result = {
    success: true, scanned: 0, mirrored: 0, failed: 0, skipped: 0,
    errors: [] as string[], duration: 0,
  };

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit) || 50;
    const dryRun = !!body.dryRun;

    const products = await db.shopeeProduct.findMany({
      where: { enabled: true },
      select: { id: true, image: true, title: true, marketplace: true },
    });

    const needMirror = products.filter(p => p.image && isExpiringImage(p.image)).slice(0, limit);
    result.scanned = needMirror.length;

    if (dryRun) {
      result.duration = Date.now() - startTime;
      return NextResponse.json(result);
    }

    for (const product of needMirror) {
      try {
        const cloudUrl = await uploadToCloudinary(product.image, product.id);
        if (cloudUrl) {
          await db.shopeeProduct.update({
            where: { id: product.id },
            data: { image: cloudUrl, updatedAt: new Date() },
          });
          result.mirrored++;
        } else {
          result.failed++;
          if (result.errors.length < 10) result.errors.push(`${product.title?.slice(0, 30)}: upload failed`);
        }
      } catch (err: any) {
        result.failed++;
        if (result.errors.length < 10) result.errors.push(`${product.title?.slice(0, 30)}: ${err.message?.slice(0, 80)}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    result.success = result.mirrored > 0 || result.failed === 0;
    result.duration = Date.now() - startTime;
    return NextResponse.json(result);
  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message);
    result.duration = Date.now() - startTime;
    return NextResponse.json(result, { status: 500 });
  }
}
