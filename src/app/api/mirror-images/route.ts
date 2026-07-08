import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";
import { v2 as cloudinary } from "cloudinary";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Marketplaces dengan image yang bisa expired
const EXPIRING_DOMAINS = [
  "tokopedia-static.net",
  "tokopedia-link",
  "ta.tokopedia.com",
  "p16-images",
  "p19-images",
  "p20-images",
  "p21-images",
  "p22-images",
  "p23-images",
  "p24-images",
  "p25-images",
  "p26-images",
  "p27-images",
  "p28-images",
  "p29-images",
  "p30-images",
];

function isExpiringImage(url: string): boolean {
  const lower = url.toLowerCase();
  // Cloudinary already mirrored
  if (lower.includes("cloudinary.com")) return false;
  // Check if from expiring domains
  return EXPIRING_DOMAINS.some(d => lower.includes(d));
}

// GET: status — berapa produk perlu mirror
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const products = await db.shopeeProduct.findMany({
      where: { enabled: true },
      select: { id: true, image: true, marketplace: true, title: true },
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

// POST: mirror images to Cloudinary
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  const startTime = Date.now();
  const result = {
    success: true,
    scanned: 0,
    mirrored: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
    duration: 0,
  };

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit) || 50; // max 50 per run
    const dryRun = !!body.dryRun;

    // Cari produk dengan image dari Tokopedia (yang bisa expired)
    const products = await db.shopeeProduct.findMany({
      where: { enabled: true },
      select: { id: true, image: true, title: true, marketplace: true },
    });

    const needMirror = products
      .filter(p => p.image && isExpiringImage(p.image))
      .slice(0, limit);

    result.scanned = needMirror.length;

    if (dryRun) {
      result.duration = Date.now() - startTime;
      return NextResponse.json(result);
    }

    for (const product of needMirror) {
      try {
        // Generate public_id dari product ID (unique, stable)
        const publicId = `jb-products/mirror/${product.id}`;

        // Cek apakah sudah ada di Cloudinary (skip upload)
        try {
          const existing = await cloudinary.api.resource(publicId);
          // Sudah ada — update DB kalau URL belum match
          const cloudUrl = existing.secure_url;
          if (product.image !== cloudUrl) {
            await db.shopeeProduct.update({
              where: { id: product.id },
              data: { image: cloudUrl, updatedAt: new Date() },
            });
            result.mirrored++;
          } else {
            result.skipped++;
          }
          continue;
        } catch {
          // Belum ada — proceed to upload
        }

        // Upload ke Cloudinary dari URL (Cloudinary fetch langsung)
        const uploadResult = await cloudinary.uploader.upload(product.image, {
          public_id: publicId,
          folder: "jb-products/mirror",
          overwrite: false,
          resource_type: "image",
          // Auto-convert ke WebP untuk ukuran lebih kecil
          fetch_format: "auto",
          quality: "auto",
        });

        // Update DB dengan Cloudinary URL
        await db.shopeeProduct.update({
          where: { id: product.id },
          data: { image: uploadResult.secure_url, updatedAt: new Date() },
        });
        result.mirrored++;
      } catch (err: any) {
        result.failed++;
        if (result.errors.length < 10) {
          result.errors.push(`${product.title?.slice(0, 30)}: ${err.message?.slice(0, 100)}`);
        }
      }

      // Small delay antar upload (rate limit Cloudinary)
      await new Promise(r => setTimeout(r, 200));
    }

    result.success = result.failed === 0 || result.mirrored > 0;
    result.duration = Date.now() - startTime;
    return NextResponse.json(result);
  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message);
    result.duration = Date.now() - startTime;
    return NextResponse.json(result, { status: 500 });
  }
}
