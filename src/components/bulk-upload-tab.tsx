"use client";

import * as React from "react";
import { Upload, FileText, CheckCircle2, XCircle, Download, Loader2, AlertCircle, ArrowRightLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// CSV template untuk didownload user
const CSV_TEMPLATE = `title,url,image,price,originalPrice,discountPercent,rating,reviewCount,soldCount,location,category,marketplace,affiliateUrl,notes
Celana Jeans Pria Slim Fit,https://shopee.co.id/product-123,https://example.com/image1.jpg,150000,250000,40,4.8,1200,5000,Jakarta,Fashion,shopee,https://shope.ee/aff123,,
Kaos Oversize Unisex,https://shopee.co.id/product-456,https://example.com/image2.jpg,75000,120000,38,4.7,800,3000,Bandung,Fashion,shopee,,,
Sepatu Sneakers Pria,https://shopee.co.id/product-789,https://example.com/image3.jpg,250000,,,0,0,0,Surabaya,Fashion,shopee,,produk baru belum ada rating`;

// Kolom wajib JB
const JB_REQUIRED = ["title", "url", "image", "price", "category"];

// Kolom header JB
const JB_HEADERS = ["title", "url", "image", "price", "originalPrice", "discountPercent", "rating", "reviewCount", "soldCount", "location", "category", "marketplace", "affiliateUrl", "notes"];

interface BulkUploadResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
}

// ============================================================
// AT CSV Converter Logic
// ============================================================

// Parse satu baris CSV (handle quoted fields)
function parseCsvLine(line: string): string[] {
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
}

// Parse seluruh CSV text jadi array of rows
function parseCsvText(text: string): string[][] {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map(parseCsvLine);
}

// Strip HTML tags dari string
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

// Extract original Shopee URL dari affiliate link AT
function extractShopeeUrl(affiliateUrl: string): string {
  if (!affiliateUrl) return "";

  try {
    // Coba decode dulu kalau URL-encoded
    let decoded = affiliateUrl;
    try {
      decoded = decodeURIComponent(affiliateUrl);
    } catch {
      // sudah decoded
    }

    // Cari origin_link parameter di URL Shopee affiliate
    const originMatch = decoded.match(/origin_link=([^&]+)/);
    if (originMatch) {
      let originUrl = originMatch[1];
      try {
        originUrl = decodeURIComponent(originUrl);
      } catch {
        // sudah decoded
      }
      return originUrl;
    }

    // Cari pattern shopee.co.id/universal-link/product/... langsung
    const directMatch = decoded.match(/(https:\/\/shopee\.co\.id\/universal-link\/product\/\d+\/\d+)/);
    if (directMatch) return directMatch[1];

    // Kalau link atid.me, coba cari URL shopee di dalamnya
    const shopeeMatch = decoded.match(/(https:\/\/shopee\.co\.id\/[^\s&]+)/);
    if (shopeeMatch) return shopeeMatch[1];

    // Fallback: return affiliate URL itu sendiri
    return decoded;
  } catch {
    return affiliateUrl;
  }
}

// Convert satu baris AT ke format JB
function convertAtRowToJb(row: string[]): Record<string, string> {
  const productId = (row[0] || "").replace(/^\uFEFF/, "").replace("?", "").trim(); // Remove BOM & ?
  const title = (row[1] || "").trim();
  const imageUrl = (row[2] || "").trim();
  const affiliateLinkRaw = (row[4] || "").trim();
  const affiliateLink2 = (row[5] || "").trim();
  const description = (row[6] || "").trim();
  const priceStr = (row[7] || "0").trim();
  const originalPriceStr = (row[8] || "0").trim();
  const category1 = (row[13] || "").trim();
  const category2 = (row[15] || "").trim();
  const category3 = (row[17] || "").trim();

  // Price logic — AT format: col7 bisa jadi harga asli, col8 harga diskon (atau sebaliknya)
  let price = parseInt(priceStr, 10) || 0;
  let originalPrice = parseInt(originalPriceStr, 10) || 0;

  // Kalau col8 < col7 → col7 = harga asli, col8 = harga jual (diskon)
  if (originalPrice > 0 && originalPrice < price) {
    const temp = price;
    price = originalPrice;
    originalPrice = temp;
  }

  // Affiliate URL — prefer the short atid.me link (col 5), fallback to col 4
  const affiliateUrl = affiliateLink2 || affiliateLinkRaw;

  // Extract original Shopee URL dari affiliate link
  const url = extractShopeeUrl(affiliateLinkRaw) || `https://shopee.co.id/search?keyword=${encodeURIComponent(title.slice(0, 50))}`;

  // Category — use most specific (category3 > category2 > category1)
  const category = category3 || category2 || category1 || "Lainnya";

  // Discount percent
  let discountPercent = "";
  if (originalPrice > price && price > 0) {
    discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100).toString();
  }

  // Notes — strip HTML dari description, limit 200 chars
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

// Convert seluruh AT CSV text ke JB format rows
function convertAtCsvToJb(text: string, maxRows = 500): { rows: Record<string, string>[]; totalInput: number; errors: string[] } {
  const allRows = parseCsvText(text);
  const errors: string[] = [];
  const convertedRows: Record<string, string>[] = [];

  // AT CSV tidak punya header — langsung data
  // Tapi kalau baris pertama kelihatannya header (misal ada "product_id" dll), skip
  let startIndex = 0;
  if (allRows.length > 0) {
    const firstCell = (allRows[0][0] || "").toLowerCase();
    if (firstCell.includes("product") || firstCell.includes("id") || firstCell.includes("item")) {
      startIndex = 1; // Skip header row
    }
  }

  const dataRows = allRows.slice(startIndex, startIndex + maxRows);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    // Minimal: harus ada title (col 1) dan image (col 2)
    if (!row[1] || !row[2]) {
      errors.push(`Baris ${startIndex + i + 1}: Title atau Image kosong, skip`);
      continue;
    }

    // Minimal: harus ada price (col 7 atau col 8 setelah salah satunya valid)
    const col7 = parseInt(row[7] || "0", 10);
    const col8 = parseInt(row[8] || "0", 10);
    if (col7 <= 0 && col8 <= 0) {
      errors.push(`Baris ${startIndex + i + 1}: Price tidak valid (col7=${row[7]}, col8=${row[8]}), skip`);
      continue;
    }

    const converted = convertAtRowToJb(row);
    convertedRows.push(converted);
  }

  return {
    rows: convertedRows,
    totalInput: allRows.length - startIndex,
    errors,
  };
}

// Generate JB CSV text dari converted rows
function generateJbCsv(rows: Record<string, string>[]): string {
  const headerLine = JB_HEADERS.join(",");
  const dataLines = rows.map((row) =>
    JB_HEADERS.map((h) => {
      const val = row[h] || "";
      // Escape: kalau ada koma, newline, atau quote → wrap dengan quotes
      if (val.includes(",") || val.includes("\n") || val.includes('"')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}


// ============================================================
// Component
// ============================================================

type Mode = "jb-upload" | "at-converter";

export function BulkUploadTab({ adminFetch }: { adminFetch: (url: string, options?: RequestInit) => Promise<Response> }) {
  const [mode, setMode] = React.useState<Mode>("jb-upload");

  // State untuk mode JB Upload (existing)
  const [dragActive, setDragActive] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvPreview, setCsvPreview] = React.useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [result, setResult] = React.useState<BulkUploadResult | null>(null);

  // State untuk mode AT Converter
  const [atFile, setAtFile] = React.useState<File | null>(null);
  const [atDragActive, setAtDragActive] = React.useState(false);
  const [converting, setConverting] = React.useState(false);
  const [convertedRows, setConvertedRows] = React.useState<Record<string, string>[]>([]);
  const [convertedPreview, setConvertedPreview] = React.useState<string[][]>([]);
  const [atTotalInput, setAtTotalInput] = React.useState(0);
  const [atErrors, setAtErrors] = React.useState<string[]>([]);
  const [atUploading, setAtUploading] = React.useState(false);
  const [atResult, setAtResult] = React.useState<BulkUploadResult | null>(null);

  // ============================================================
  // JB Upload logic (existing)
  // ============================================================

  const parseCsvForPreview = React.useCallback((text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      setCsvHeaders([]);
      setCsvPreview([]);
      return;
    }

    const headers = parseCsvLine(lines[0]);
    const previewRows = lines.slice(1, 6).map(parseCsvLine);

    setCsvHeaders(headers);
    setCsvPreview(previewRows);
  }, []);

  const handleFile = React.useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      alert("Hanya file CSV yang diperbolehkan");
      return;
    }
    setCsvFile(file);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCsvForPreview(text);
    };
    reader.readAsText(file);
  }, [parseCsvForPreview]);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUpload = React.useCallback(async () => {
    if (!csvFile) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await adminFetch("/api/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ success: 0, failed: 0, total: 0, errors: [data.error || "Gagal upload"] });
        return;
      }

      setResult(data);
    } catch (err: any) {
      setResult({ success: 0, failed: 0, total: 0, errors: [err?.message || "Error tidak diketahui"] });
    } finally {
      setUploading(false);
    }
  }, [csvFile, adminFetch]);

  const handleDownloadTemplate = React.useCallback(() => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-upload-jelajahbelanja.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleReset = React.useCallback(() => {
    setCsvFile(null);
    setCsvPreview([]);
    setCsvHeaders([]);
    setResult(null);
  }, []);

  // ============================================================
  // AT Converter logic
  // ============================================================

  const handleAtFile = React.useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt") && !file.name.endsWith(".xlsx")) {
      alert("Hanya file CSV/XLSX yang diperbolehkan");
      return;
    }
    setAtFile(file);
    setConvertedRows([]);
    setConvertedPreview([]);
    setAtErrors([]);
    setAtTotalInput(0);
    setAtResult(null);
  }, []);

  const handleAtDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setAtDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleAtFile(file);
  }, [handleAtFile]);

  const handleConvert = React.useCallback(async () => {
    if (!atFile) return;
    setConverting(true);
    setAtResult(null);

    try {
      const text = await atFile.text();
      const { rows, totalInput, errors } = convertAtCsvToJb(text, 500);

      setConvertedRows(rows);
      setAtTotalInput(totalInput);
      setAtErrors(errors);

      // Preview: first 5 rows
      const previewData = rows.slice(0, 5).map((row) =>
        JB_HEADERS.map((h) => row[h] || "")
      );
      setConvertedPreview(previewData);
    } catch (err: any) {
      setAtErrors([`Gagal parse file: ${err?.message || "Unknown error"}`]);
    } finally {
      setConverting(false);
    }
  }, [atFile]);

  const handleDownloadConverted = React.useCallback(() => {
    if (convertedRows.length === 0) return;
    const csv = generateJbCsv(convertedRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted-at-to-jb-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [convertedRows]);

  const handleAtUpload = React.useCallback(async () => {
    if (convertedRows.length === 0) return;
    setAtUploading(true);
    setAtResult(null);

    try {
      // Generate CSV dari converted rows, lalu upload via bulk-upload API
      const csv = generateJbCsv(convertedRows);
      const blob = new Blob([csv], { type: "text/csv" });
      const formData = new FormData();
      formData.append("file", blob, "at-converted.csv");

      const res = await adminFetch("/api/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setAtResult({ success: 0, failed: 0, total: 0, errors: [data.error || "Gagal upload"] });
        return;
      }

      setAtResult(data);
    } catch (err: any) {
      setAtResult({ success: 0, failed: 0, total: 0, errors: [err?.message || "Error tidak diketahui"] });
    } finally {
      setAtUploading(false);
    }
  }, [convertedRows, adminFetch]);

  const handleAtReset = React.useCallback(() => {
    setAtFile(null);
    setConvertedRows([]);
    setConvertedPreview([]);
    setAtErrors([]);
    setAtTotalInput(0);
    setAtResult(null);
  }, []);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "jb-upload" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("jb-upload")}
          className="gap-1.5"
        >
          <Upload className="w-4 h-4" />
          Upload CSV JB
        </Button>
        <Button
          variant={mode === "at-converter" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("at-converter")}
          className="gap-1.5"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Konverter AT CSV
        </Button>
      </div>

      {/* ============================================================ */}
      {/* MODE: JB Upload (existing) */}
      {/* ============================================================ */}
      {mode === "jb-upload" && (
        <>
          {/* Cara pakai */}
          <div className="rounded-2xl border border-fuchsia-200 dark:border-fuchsia-900/50 bg-fuchsia-50 dark:bg-fuchsia-900/20 p-4">
            <p className="text-sm font-semibold text-fuchsia-900 dark:text-fuchsia-100 mb-2">
              Cara Upload Massal
            </p>
            <ol className="text-sm text-fuchsia-800 dark:text-fuchsia-200 space-y-1 list-decimal list-inside">
              <li>Download template CSV dulu (klik tombol di bawah)</li>
              <li>Buka di Excel, isi data produk satu per satu — kolom wajib: <code className="bg-fuchsia-100 dark:bg-fuchsia-800 px-1 rounded text-xs">title, url, image, price, category</code></li>
              <li>Save As → CSV (Comma Separated Values)</li>
              <li>Drag & drop file CSV ke area di bawah, atau klik untuk pilih file</li>
              <li>Cek preview, lalu klik Upload</li>
            </ol>
            <p className="text-xs text-fuchsia-700 dark:text-fuchsia-300 mt-2">
              Maks 200 produk per upload. Kolom opsional: originalPrice, discountPercent, rating, reviewCount, soldCount, location, marketplace, affiliateUrl, notes.
            </p>
          </div>

          {/* Download template */}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
            <Download className="w-4 h-4" />
            Download Template CSV
          </Button>

          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".csv,.txt";
                input.onchange = (e: any) => {
                  const file = e.target?.files?.[0];
                  if (file) handleFile(file);
                };
                input.click();
              }}
              className={cn(
                "relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                dragActive
                  ? "border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-fuchsia-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                csvFile && "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10"
              )}
            >
              {csvFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{csvFile.name}</p>
                  <p className="text-xs text-zinc-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Drag & drop file CSV di sini
                  </p>
                  <p className="text-xs text-zinc-400">atau klik untuk pilih file</p>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {csvFile && csvHeaders.length > 0 && !result && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Preview ({csvPreview.length} baris pertama dari file)
              </p>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800">
                      {csvHeaders.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          {h}
                          {JB_REQUIRED.includes(h.toLowerCase()) && (
                            <span className="text-red-500 ml-0.5">*</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, ri) => (
                      <tr key={ri} className="border-t border-zinc-100 dark:border-zinc-800">
                        {csvHeaders.map((_, ci) => (
                          <td key={ci} className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap max-w-[200px] truncate">
                            {row[ci] || <span className="text-zinc-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={uploading} className="gap-1.5">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload {csvPreview.length}+ Produk
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={uploading}>
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className={cn(
                "rounded-2xl border p-4",
                result.failed === 0
                  ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20"
              )}>
                <div className="flex items-center gap-3 mb-3">
                  {result.failed === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  )}
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Upload Selesai!
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {result.success} berhasil, {result.failed} gagal dari {result.total} produk
                    </p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">
                      <XCircle className="w-3.5 h-3.5 inline mr-1" />
                      Detail Error:
                    </p>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                      {result.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Button onClick={handleReset} variant="outline">
                Upload Lagi
              </Button>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* MODE: AT Converter */}
      {/* ============================================================ */}
      {mode === "at-converter" && (
        <>
          {/* Cara pakai */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 p-4">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Cara Konverter CSV Accesstrade
            </p>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Download CSV dari dashboard <b>Accesstrade</b> (Product Feed / Offer)</li>
              <li>Upload file CSV AT ke area di bawah</li>
              <li>Klik <b>Konversi ke JB</b> — otomatis mapping kolom AT ke format JB</li>
              <li>Cek preview hasil konversi</li>
              <li>Pilih: <b>Download CSV JB</b> atau <b>Upload ke Database</b></li>
            </ol>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              Maks 500 produk per konversi. Affiliate link otomatis terisi dari data AT.
            </p>
          </div>

          {/* AT Column → JB Mapping Info */}
          <details className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <summary className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              Mapping Kolom AT → JB
            </summary>
            <div className="p-4 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left py-1.5 pr-3 text-zinc-500 dark:text-zinc-400">Kolom AT (Accesstrade)</th>
                    <th className="text-left py-1.5 pr-3 text-zinc-500 dark:text-zinc-400">→</th>
                    <th className="text-left py-1.5 text-zinc-500 dark:text-zinc-400">Kolom JB</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-600 dark:text-zinc-400">
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 1: Product Name</td><td className="pr-3">→</td><td>title *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 4: Affiliate Link (decoded)</td><td className="pr-3">→</td><td>url *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 2: Image URL</td><td className="pr-3">→</td><td>image *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 7: Price</td><td className="pr-3">→</td><td>price *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 8: Original Price</td><td className="pr-3">→</td><td>originalPrice</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Calculated: price vs originalPrice</td><td className="pr-3">→</td><td>discountPercent</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 17/15/13: Category (most specific)</td><td className="pr-3">→</td><td>category *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Default: shopee</td><td className="pr-3">→</td><td>marketplace</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 5: Affiliate Link (atid.me)</td><td className="pr-3">→</td><td>affiliateUrl</td></tr>
                  <tr><td className="py-1 pr-3">Col 6: Description (HTML stripped)</td><td className="pr-3">→</td><td>notes</td></tr>
                </tbody>
              </table>
            </div>
          </details>

          {/* Step 1: Upload AT CSV */}
          {!atResult && convertedRows.length === 0 && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setAtDragActive(true); }}
                onDragLeave={() => setAtDragActive(false)}
                onDrop={handleAtDrop}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".csv,.txt";
                  input.onchange = (e: any) => {
                    const file = e.target?.files?.[0];
                    if (file) handleAtFile(file);
                  };
                  input.click();
                }}
                className={cn(
                  "relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                  atDragActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-zinc-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                  atFile && "border-blue-400 bg-blue-50 dark:bg-blue-900/10"
                )}
              >
                {atFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-blue-500" />
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{atFile.name}</p>
                    <p className="text-xs text-zinc-500">{(atFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Drag & drop file CSV Accesstrade di sini
                    </p>
                    <p className="text-xs text-zinc-400">atau klik untuk pilih file</p>
                  </div>
                )}
              </div>

              {/* Convert Button */}
              {atFile && (
                <div className="flex gap-2">
                  <Button onClick={handleConvert} disabled={converting} className="gap-1.5">
                    {converting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengkonversi...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Konversi ke JB
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleAtReset} disabled={converting}>
                    Batal
                  </Button>
                </div>
              )}

              {/* Conversion errors */}
              {atErrors.length > 0 && convertedRows.length === 0 && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-3">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">
                    <XCircle className="w-3.5 h-3.5 inline mr-1" />
                    Error Konversi:
                  </p>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                    {atErrors.slice(0, 10).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Step 2: Preview Converted Data */}
          {convertedRows.length > 0 && !atResult && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Konversi Berhasil!
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {convertedRows.length} produk dikonversi dari {atTotalInput} baris data AT
                    </p>
                    {atErrors.length > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {atErrors.length} baris diskip karena error
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Preview Hasil Konversi ({convertedPreview.length} dari {convertedRows.length} produk)
              </p>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800">
                      {JB_HEADERS.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          {h}
                          {JB_REQUIRED.includes(h) && (
                            <span className="text-red-500 ml-0.5">*</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {convertedPreview.map((row, ri) => (
                      <tr key={ri} className="border-t border-zinc-100 dark:border-zinc-800">
                        {JB_HEADERS.map((h, ci) => (
                          <td key={ci} className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap max-w-[180px] truncate">
                            {row[ci] || <span className="text-zinc-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Skip errors detail */}
              {atErrors.length > 0 && (
                <details className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <summary className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Lihat {atErrors.length} error konversi
                  </summary>
                  <div className="p-3 max-h-40 overflow-y-auto">
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                      {atErrors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleAtUpload} disabled={atUploading} className="gap-1.5">
                  {atUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload {convertedRows.length} Produk ke Database
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleDownloadConverted} disabled={atUploading} className="gap-1.5">
                  <Download className="w-4 h-4" />
                  Download CSV JB
                </Button>
                <Button variant="outline" onClick={handleAtReset} disabled={atUploading}>
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* Upload Result */}
          {atResult && (
            <div className="space-y-3">
              <div className={cn(
                "rounded-2xl border p-4",
                atResult.failed === 0
                  ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20"
              )}>
                <div className="flex items-center gap-3 mb-3">
                  {atResult.failed === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  )}
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Upload Selesai!
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {atResult.success} berhasil, {atResult.failed} gagal dari {atResult.total} produk
                    </p>
                  </div>
                </div>

                {atResult.errors.length > 0 && (
                  <div className="mt-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">
                      <XCircle className="w-3.5 h-3.5 inline mr-1" />
                      Detail Error:
                    </p>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                      {atResult.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Button onClick={handleAtReset} variant="outline">
                Konversi Lagi
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
