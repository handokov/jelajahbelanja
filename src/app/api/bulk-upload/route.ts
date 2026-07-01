import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/bulk-upload
 *
 * Upload massal produk dari CSV.
 * Body: { csv: string } — raw CSV content
 * Atau: FormData dengan file "file"
 *
 * CSV columns (wajib): title, url, image, price, category
 * CSV columns (opsional): originalPrice, discountPercent, rating, reviewCount, soldCount, location, marketplace, affiliateUrl, notes
 *
 * Return: { success: number, failed: number, errors: string[] }
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    let csvText = "";

    // Support kedua format: JSON body { csv: "..." } atau FormData file
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "File CSV tidak ditemukan" }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      const body = await req.json();
      csvText = body.csv || "";
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: "CSV content kosong" }, { status: 400 });
    }

    // Parse CSV
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    if (result.errors.length > 0 && result.data.length === 0) {
      return NextResponse.json(
        { error: `CSV parse error: ${result.errors[0].message}` },
        { status: 400 }
      );
    }

    const rows = result.data as Record<string, string>[];
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV kosong — tidak ada baris data" }, { status: 400 });
    }

    if (rows.length > 200) {
      return NextResponse.json(
        { error: `Maksimal 200 produk per upload. Kamu mengupload ${rows.length} produk.` },
        { status: 400 }
      );
    }

    // Validasi & insert per baris
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 karena baris 1 = header

      try {
        // Field wajib
        const title = (row.title || row.judul || row.nama || "").trim();
        const url = (row.url || row.link || "").trim();
        const image = (row.image || row.gambar || row.imageUrl || row.foto || "").trim();
        const price = Number(row.price || row.harga || 0);
        const category = (row.category || row.kategori || "Fashion").trim();

        if (!title) {
          errors.push(`Baris ${rowNum}: title/judul kosong`);
          failed++;
          continue;
        }
        if (!url) {
          errors.push(`Baris ${rowNum}: url/link kosong`);
          failed++;
          continue;
        }
        if (!image) {
          errors.push(`Baris ${rowNum}: image/gambar kosong`);
          failed++;
          continue;
        }
        if (!price || price <= 0) {
          errors.push(`Baris ${rowNum}: price/harga tidak valid`);
          failed++;
          continue;
        }

        // Field opsional
        const originalPrice = row.originalPrice || row.hargaAsli
          ? Number(row.originalPrice || row.hargaAsli || 0) || null
          : null;
        const discountPercent = row.discountPercent || row.diskon
          ? Number(row.discountPercent || row.diskon || 0) || null
          : null;
        const rating = Number(row.rating || row.bintang || 0) || 0;
        const reviewCount = Number(row.reviewCount || row.review || row.jumlahReview || 0) || 0;
        const soldCount = Number(row.soldCount || row.terjual || 0) || 0;
        const location = (row.location || row.lokasi || "").trim() || null;
        const marketplace = (row.marketplace || "").trim() || "shopee";
        const affiliateUrl = (row.affiliateUrl || row.affiliate || "").trim() || null;
        const notes = (row.notes || row.catatan || "").trim() || null;

        await db.shopeeProduct.create({
          data: {
            title,
            url,
            image,
            price,
            originalPrice,
            discountPercent,
            rating,
            reviewCount,
            soldCount,
            location,
            category,
            marketplace,
            affiliateUrl,
            notes,
            enabled: true,
            isViral: false,
            isPinned: false,
            isHidden: false,
          },
        });

        success++;
      } catch (err: any) {
        errors.push(`Baris ${rowNum}: ${err?.message || "Error tidak diketahui"}`);
        failed++;
      }
    }

    return NextResponse.json({
      success,
      failed,
      total: rows.length,
      errors: errors.slice(0, 20), // Maks 20 error ditampilkan
    });
  } catch (err) {
    console.error("[api/bulk-upload] Error:", err);
    return NextResponse.json({ error: "Gagal memproses upload" }, { status: 500 });
  }
}
