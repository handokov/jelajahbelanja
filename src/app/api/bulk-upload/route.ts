import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/bulk-upload
 * Upload massal produk dari file CSV.
 * 
 * Kolom wajib: title, url, image, price, category
 * Kolom opsional: originalPrice, discountPercent, rating, reviewCount, soldCount, location, marketplace, affiliateUrl, notes
 * Maks 200 produk per upload.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File CSV wajib diupload" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "File CSV kosong atau tidak ada data" }, { status: 400 });
    }

    // Parse header
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
    const requiredHeaders = ["title", "url", "image", "price", "category"];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Kolom wajib tidak ditemukan: ${missingHeaders.join(", ")}` },
        { status: 400 }
      );
    }

    // Parse rows
    const MAX_ROWS = 200;
    const dataLines = lines.slice(1, MAX_ROWS + 1);
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const values = parseLine(dataLines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });

      // Validate required fields
      if (!row.title || !row.url || !row.image || !row.price || !row.category) {
        errors.push(`Baris ${i + 2}: Kolom wajib kosong`);
        failed++;
        continue;
      }

      const price = parseInt(row.price, 10);
      if (isNaN(price) || price <= 0) {
        errors.push(`Baris ${i + 2}: Price tidak valid ("${row.price}")`);
        failed++;
        continue;
      }

      try {
        await db.shopeeProduct.create({
          data: {
            title: row.title,
            url: row.url,
            image: row.image,
            price,
            originalPrice: row.originalprice ? parseInt(row.originalprice, 10) || null : null,
            discountPercent: row.discountpercent ? parseInt(row.discountpercent, 10) || null : null,
            rating: row.rating ? parseFloat(row.rating) || 4.5 : 4.5,
            reviewCount: row.reviewcount ? parseInt(row.reviewcount, 10) || 0 : 0,
            soldCount: row.soldcount ? parseInt(row.soldcount, 10) || 0 : 0,
            location: row.location || null,
            category: row.category,
            marketplace: (row.marketplace || "shopee").toLowerCase(),
            affiliateUrl: row.affiliateurl || null,
            notes: row.notes || null,
            isViral: false,
            isPinned: false,
            isHidden: false,
            enabled: true,
          },
        });
        success++;
      } catch (err: any) {
        errors.push(`Baris ${i + 2}: ${err?.message || "Gagal simpan ke database"}`);
        failed++;
      }
    }

    return NextResponse.json({
      success,
      failed,
      total: dataLines.length,
      errors: errors.slice(0, 20), // Limit error messages
    });
  } catch (err: any) {
    console.error("[api/bulk-upload] Error:", err);
    return NextResponse.json(
      { error: "Gagal memproses upload: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
