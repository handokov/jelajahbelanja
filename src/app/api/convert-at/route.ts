import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { mapAtCategory, buildAtCategoryMap } from "@/lib/at-category-map";
import { db } from "@/lib/db";

/**
 * POST /api/convert-at
 * Parse file CSV/XLSX dari Accesstrade, convert ke format JB.
 * 
 * Return: array of JB-format rows (siap di-upload via /api/bulk-upload)
 * 
 * AT CSV format (no headers, 22 columns):
 * 0: product_id, 1: title, 2: image_url, 3: (empty), 
 * 4: affiliate_link_1 (s.shopee.co.id), 5: affiliate_link_2 (atid.me),
 * 6: description (HTML), 7: price, 8: original_price, 9: stock/flag,
 * 10-12: (empty), 13: category1, 14: (empty), 15: category2, 
 * 16: (empty), 17: category3, 18: (empty), 19: currency, 20: brand, 21: (empty)
 */

export const dynamic = "force-dynamic";

// JB CSV headers
const JB_HEADERS = ["title", "url", "image", "price", "originalPrice", "discountPercent", "rating", "reviewCount", "soldCount", "location", "category", "marketplace", "affiliateUrl", "notes"];

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractShopeeUrl(affiliateUrl: string): string {
  if (!affiliateUrl) return "";
  try {
    let decoded = affiliateUrl;
    try { decoded = decodeURIComponent(affiliateUrl); } catch {}
    const originMatch = decoded.match(/origin_link=([^&]+)/);
    if (originMatch) {
      let originUrl = originMatch[1];
      try { originUrl = decodeURIComponent(originUrl); } catch {}
      return originUrl;
    }
    const directMatch = decoded.match(/(https:\/\/shopee\.co\.id\/universal-link\/product\/\d+\/\d+)/);
    if (directMatch) return directMatch[1];
    const shopeeMatch = decoded.match(/(https:\/\/shopee\.co\.id\/[^\s&]+)/);
    if (shopeeMatch) return shopeeMatch[1];
    return decoded;
  } catch { return affiliateUrl; }
}

function convertAtRowToJb(row: any[], atCategoryMap?: Record<string, string>): Record<string, string> {
  const productId = String(row[0] || "").replace(/^\uFEFF/, "").replace("?", "").trim();
  const title = String(row[1] || "").trim();
  const imageUrl = String(row[2] || "").trim();
  const affiliateLinkRaw = String(row[4] || "").trim();
  const affiliateLink2 = String(row[5] || "").trim();
  const description = String(row[6] || "").trim();
  const priceStr = String(row[7] || "0").trim();
  const originalPriceStr = String(row[8] || "0").trim();
  const category1 = String(row[13] || "").trim();
  const category2 = String(row[15] || "").trim();
  const category3 = String(row[17] || "").trim();

  let price = parseInt(priceStr.replace(/[^\d]/g, ""), 10) || 0;
  let originalPrice = parseInt(originalPriceStr.replace(/[^\d]/g, ""), 10) || 0;

  // Swap jika col8 < col7 (harga jual vs harga asli)
  if (originalPrice > 0 && originalPrice < price) {
    const temp = price;
    price = originalPrice;
    originalPrice = temp;
  }

  const affiliateUrl = affiliateLink2 || affiliateLinkRaw;
  const url = extractShopeeUrl(affiliateLinkRaw) || `https://shopee.co.id/search?keyword=${encodeURIComponent(title.slice(0, 50))}`;
  // Map AT category1 → JB category menggunakan lookup map
  const category = mapAtCategory(category1, atCategoryMap);

  let discountPercent = "";
  if (originalPrice > price && price > 0) {
    discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100).toString();
  }

  const notes = stripHtml(description).slice(0, 200);

  return {
    title,
    url,
    image: imageUrl,
    price: price > 0 ? price.toString() : "",
    originalPrice: originalPrice > 0 && originalPrice > price ? originalPrice.toString() : "",
    discountPercent,
    rating: "4.5",
    reviewCount: "0",
    soldCount: "0",
    location: "",
    category,
    marketplace: "shopee",
    affiliateUrl,
    notes,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let allRows: any[][] = [];

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      // Parse XLSX
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    } else if (fileName.endsWith(".csv") || fileName.endsWith(".txt") || fileName.endsWith(".tsv") || fileName.endsWith(".dat")) {
      // Parse CSV/TSV — auto-detect delimiter
      const text = await file.text();
      const cleanText = text.replace(/^\uFEFF/, '');
      const lines = cleanText.split("\n").filter((l) => l.trim());
      if (lines.length === 0) {
        return NextResponse.json({ error: "File kosong" }, { status: 400 });
      }
      // Auto-detect delimiter dari baris pertama
      const firstLine = lines[0];
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const delimiter = tabCount > commaCount ? '\t' : ',';
      
      for (const line of lines) {
        const row: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === delimiter && !inQuotes) {
            row.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        row.push(current.trim());
        allRows.push(row);
      }
    } else {
      // Coba parse sebagai text file apapun extension-nya
      const text = await file.text();
      const cleanText = text.replace(/^\uFEFF/, '');
      const lines = cleanText.split("\n").filter((l) => l.trim());
      if (lines.length === 0) {
        return NextResponse.json({ error: "File kosong atau format tidak didukung" }, { status: 400 });
      }
      // Auto-detect delimiter
      const firstLine = lines[0];
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const delimiter = tabCount > commaCount ? '\t' : ',';
      
      for (const line of lines) {
        const row: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === delimiter && !inQuotes) {
            row.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        row.push(current.trim());
        allRows.push(row);
      }
    }

    if (allRows.length === 0) {
      return NextResponse.json({ error: "File kosong" }, { status: 400 });
    }

    // Skip header row jika ada
    let startIndex = 0;
    const firstCell = String(allRows[0][0] || "").toLowerCase();
    if (firstCell.includes("product") || firstCell.includes("id") || firstCell.includes("item")) {
      startIndex = 1;
    }

    // Build AT category map dari DB untuk mapping kategori
    let atCategoryMap: Record<string, string> | undefined;
    try {
      const categories = await db.category.findMany({ orderBy: { order: "asc" } });
      atCategoryMap = buildAtCategoryMap(categories);
    } catch {
      // Fallback ke hardcoded map di at-category-map.ts
      atCategoryMap = undefined;
    }

    const MAX_ROWS = 10000;
    const dataRows = allRows.slice(startIndex, startIndex + MAX_ROWS);
    const errors: string[] = [];
    const convertedRows: Record<string, string>[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row[1] || !row[2]) {
        errors.push(`Baris ${startIndex + i + 1}: Title atau Image kosong`);
        continue;
      }
      const col7 = parseInt(String(row[7] || "0").replace(/[^\d]/g, ""), 10);
      const col8 = parseInt(String(row[8] || "0").replace(/[^\d]/g, ""), 10);
      if (col7 <= 0 && col8 <= 0) {
        errors.push(`Baris ${startIndex + i + 1}: Price tidak valid`);
        continue;
      }
      convertedRows.push(convertAtRowToJb(row, atCategoryMap));
    }

    return NextResponse.json({
      rows: convertedRows,
      totalInput: allRows.length - startIndex,
      errors: errors.slice(0, 50),
      headers: JB_HEADERS,
    });
  } catch (err: any) {
    console.error("[api/convert-at] Error:", err);
    return NextResponse.json(
      { error: "Gagal memproses file: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
