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

// Batch size per API request
const BATCH_SIZE = 500;

// Chunk size untuk streaming read (5MB per baca file)
const STREAM_CHUNK_SIZE = 5 * 1024 * 1024;

interface BulkUploadResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
}

// Streaming progress — more detailed untuk pipeline read→convert→upload
interface StreamingProgress {
  phase: "reading" | "converting" | "uploading" | "done";
  rowsRead: number;
  rowsConverted: number;
  rowsUploaded: number;
  rowsSuccess: number;
  rowsFailed: number;
  currentBatch: number;
  totalBatches: number;
  percentRead: number;  // 0-100 estimasi dari file offset
  errors: string[];
}

// ============================================================
// AT CSV Converter Logic
// ============================================================

// Auto-detect delimiter dari baris pertama
function detectDelimiter(firstLine: string): string {
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount > commaCount ? "\t" : ",";
}

function parseCsvLineWithDelimiter(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Legacy: comma-only parser (dipakai JB upload)
function parseCsvLine(line: string): string[] {
  return parseCsvLineWithDelimiter(line, ",");
}

function parseCsvText(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => parseCsvLineWithDelimiter(line, delimiter));
}

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

// Cek apakah baris adalah header (skip)
function isHeaderRow(row: string[]): boolean {
  const firstCell = (row[0] || "").toLowerCase();
  return firstCell.includes("product") || firstCell.includes("id") || firstCell.includes("item") || firstCell.includes("name");
}

function convertAtRowToJb(row: string[]): Record<string, string> {
  const productId = (row[0] || "").replace(/^\uFEFF/, "").replace("?", "").trim();
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

  let price = parseInt(priceStr, 10) || 0;
  let originalPrice = parseInt(originalPriceStr, 10) || 0;

  if (originalPrice > 0 && originalPrice < price) {
    const temp = price;
    price = originalPrice;
    originalPrice = temp;
  }

  const affiliateUrl = affiliateLink2 || affiliateLinkRaw;
  const url = extractShopeeUrl(affiliateLinkRaw) || `https://shopee.co.id/search?keyword=${encodeURIComponent(title.slice(0, 50))}`;
  const category = category3 || category2 || category1 || "Lainnya";

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

function convertAtCsvToJb(text: string, maxRows = 10000): { rows: Record<string, string>[]; totalInput: number; errors: string[] } {
  const allRows = parseCsvText(text);
  const errors: string[] = [];
  const convertedRows: Record<string, string>[] = [];

  let startIndex = 0;
  if (allRows.length > 0) {
    const firstCell = (allRows[0][0] || "").toLowerCase();
    if (firstCell.includes("product") || firstCell.includes("id") || firstCell.includes("item")) {
      startIndex = 1;
    }
  }

  const dataRows = allRows.slice(startIndex, startIndex + maxRows);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row[1] || !row[2]) {
      errors.push(`Baris ${startIndex + i + 1}: Title atau Image kosong, skip`);
      continue;
    }
    const col7 = parseInt(row[7] || "0", 10);
    const col8 = parseInt(row[8] || "0", 10);
    if (col7 <= 0 && col8 <= 0) {
      errors.push(`Baris ${startIndex + i + 1}: Price tidak valid, skip`);
      continue;
    }
    convertedRows.push(convertAtRowToJb(row));
  }

  return { rows: convertedRows, totalInput: allRows.length - startIndex, errors };
}

function generateJbCsv(rows: Record<string, string>[]): string {
  const headerLine = JB_HEADERS.join(",");
  const dataLines = rows.map((row) =>
    JB_HEADERS.map((h) => {
      const val = row[h] || "";
      if (val.includes(",") || val.includes("\n") || val.includes('"')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

// Split array ke chunks
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ============================================================
// Component
// ============================================================

type Mode = "jb-upload" | "at-converter";

type AtConvertMode = "preview" | "streaming";

interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  totalSuccess: number;
  totalFailed: number;
  totalProcessed: number;
  errors: string[];
}

export function BulkUploadTab({ adminFetch }: { adminFetch: (url: string, options?: RequestInit) => Promise<Response> }) {
  const [mode, setMode] = React.useState<Mode>("jb-upload");

  // JB Upload state
  const [dragActive, setDragActive] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvPreview, setCsvPreview] = React.useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<BulkUploadResult | null>(null);

  // AT Converter state
  const [atFile, setAtFile] = React.useState<File | null>(null);
  const [atDragActive, setAtDragActive] = React.useState(false);
  const [converting, setConverting] = React.useState(false);
  const [convertedRows, setConvertedRows] = React.useState<Record<string, string>[]>([]);
  const [convertedPreview, setConvertedPreview] = React.useState<string[][]>([]);
  const [atTotalInput, setAtTotalInput] = React.useState(0);
  const [atErrors, setAtErrors] = React.useState<string[]>([]);
  const [atResult, setAtResult] = React.useState<BulkUploadResult | null>(null);

  // Batch progress state (shared for both modes)
  const [batchProgress, setBatchProgress] = React.useState<BatchProgress | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Streaming progress state
  const [streamProgress, setStreamProgress] = React.useState<StreamingProgress | null>(null);

  // AT convert mode: "preview" = konversi dulu lihat preview, "streaming" = langsung convert+upload
  const [atConvertMode, setAtConvertMode] = React.useState<AtConvertMode>("preview");

  // ============================================================
  // JB Upload logic
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

  // Batch upload for JB CSV
  const handleJbUpload = React.useCallback(async () => {
    if (!csvFile) return;
    setUploading(true);
    setBatchProgress(null);
    setResult(null);

    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter((l) => l.trim());

      if (lines.length < 2) {
        setResult({ success: 0, failed: 0, total: 0, errors: ["File kosong"] });
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const dataLines = lines.slice(1);
      const chunks = chunkArray(dataLines, BATCH_SIZE);

      let totalSuccess = 0;
      let totalFailed = 0;
      let totalProcessed = 0;
      const allErrors: string[] = [];

      for (let c = 0; c < chunks.length; c++) {
        setBatchProgress({
          currentBatch: c + 1,
          totalBatches: chunks.length,
          totalSuccess,
          totalFailed,
          totalProcessed,
          errors: allErrors,
        });

        // Rebuild CSV untuk batch ini (dengan header)
        const batchCsv = [lines[0], ...chunks[c]].join("\n");
        const blob = new Blob([batchCsv], { type: "text/csv" });
        const formData = new FormData();
        formData.append("file", blob, `batch-${c + 1}.csv`);

        const res = await adminFetch("/api/bulk-upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          allErrors.push(`Batch ${c + 1}: ${data.error || "Gagal upload"}`);
          totalFailed += chunks[c].length;
        } else {
          totalSuccess += data.success || 0;
          totalFailed += data.failed || 0;
          if (data.errors?.length) allErrors.push(...data.errors);
        }
        totalProcessed += chunks[c].length;
      }

      setResult({ success: totalSuccess, failed: totalFailed, total: dataLines.length, errors: allErrors.slice(0, 30) });
    } catch (err: any) {
      setResult({ success: 0, failed: 0, total: 0, errors: [err?.message || "Error tidak diketahui"] });
    } finally {
      setUploading(false);
      setBatchProgress(null);
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
    setBatchProgress(null);
  }, []);

  // ============================================================
  // AT Converter logic
  // ============================================================

  const handleAtFile = React.useCallback((file: File) => {
    // Accept semua file — validasi content di converter, bukan extension
    // AT bisa provide file dalam berbagai format: .csv, .txt, .tsv, .xlsx, bahkan tanpa extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isBinary = ['.xlsx', '.xls', '.zip', '.gz', '.rar'].includes(ext);
    const isText = ['.csv', '.txt', '.tsv', '.dat', ''].includes(ext) || !isBinary;
    
    if (!isText && !isBinary) {
      alert(`Format file .${ext} tidak dikenali. Gunakan CSV, TSV, TXT, atau XLSX dari Accesstrade.`);
      return;
    }
    
    // Warning untuk file > 50MB
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 50 && ext !== '.xlsx') {
      const ok = confirm(`File ini ${sizeMB.toFixed(1)} MB — cukup besar. Proses di browser mungkin butuh waktu. Lanjutkan?`);
      if (!ok) return;
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
      const ext = atFile.name.split('.').pop()?.toLowerCase() || '';
      const isXlsx = ['.xlsx', '.xls'].includes(ext);

      if (isXlsx) {
        // XLSX: pakai API (server-side processing)
        // Tapi cek size dulu — Vercel limit 4.5MB body
        const sizeMB = atFile.size / (1024 * 1024);
        if (sizeMB > 4) {
          setAtErrors([`File XLSX terlalu besar (${sizeMB.toFixed(1)} MB). Maksimum 4 MB untuk XLSX. Untuk file besar, export ke CSV dari Accesstrade lalu upload file CSV-nya.`]);
          return;
        }
        const formData = new FormData();
        formData.append("file", atFile);

        const res = await adminFetch("/api/convert-at", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setAtErrors([data.error || "Gagal konversi file"]);
          return;
        }

        const { rows, totalInput, errors } = data;
        setConvertedRows(rows);
        setAtTotalInput(totalInput);
        setAtErrors(errors || []);

        const previewData = rows.slice(0, 5).map((row: Record<string, string>) =>
          JB_HEADERS.map((h) => row[h] || "")
        );
        setConvertedPreview(previewData);
      } else {
        // CSV/TXT/TSV: proses 100% client-side (bypass Vercel body limit)
        // Baca file sebagai text, lalu parse di browser
        const text = await atFile.text();
        
        // Hapus BOM jika ada
        const cleanText = text.replace(/^\uFEFF/, '');
        
        const { rows, totalInput, errors } = convertAtCsvToJb(cleanText);
        setConvertedRows(rows);
        setAtTotalInput(totalInput);
        setAtErrors(errors);

        const previewData = rows.slice(0, 5).map((row: Record<string, string>) =>
          JB_HEADERS.map((h) => row[h] || "")
        );
        setConvertedPreview(previewData);
      }
    } catch (err: any) {
      setAtErrors([`Gagal parse file: ${err?.message || "Unknown error"}`]);
    } finally {
      setConverting(false);
    }
  }, [atFile, adminFetch]);

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

  // Batch upload for AT converted data
  const handleAtUpload = React.useCallback(async () => {
    if (convertedRows.length === 0) return;
    setUploading(true);
    setBatchProgress(null);
    setAtResult(null);

    try {
      const chunks = chunkArray(convertedRows, BATCH_SIZE);

      let totalSuccess = 0;
      let totalFailed = 0;
      let totalProcessed = 0;
      const allErrors: string[] = [];

      for (let c = 0; c < chunks.length; c++) {
        setBatchProgress({
          currentBatch: c + 1,
          totalBatches: chunks.length,
          totalSuccess,
          totalFailed,
          totalProcessed,
          errors: allErrors,
        });

        const batchCsv = generateJbCsv(chunks[c]);
        const blob = new Blob([batchCsv], { type: "text/csv" });
        const formData = new FormData();
        formData.append("file", blob, `at-batch-${c + 1}.csv`);

        const res = await adminFetch("/api/bulk-upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          allErrors.push(`Batch ${c + 1}: ${data.error || "Gagal upload"}`);
          totalFailed += chunks[c].length;
        } else {
          totalSuccess += data.success || 0;
          totalFailed += data.failed || 0;
          if (data.errors?.length) allErrors.push(...data.errors);
        }
        totalProcessed += chunks[c].length;
      }

      setAtResult({ success: totalSuccess, failed: totalFailed, total: convertedRows.length, errors: allErrors.slice(0, 30) });
    } catch (err: any) {
      setAtResult({ success: 0, failed: 0, total: 0, errors: [err?.message || "Error tidak diketahui"] });
    } finally {
      setUploading(false);
      setBatchProgress(null);
    }
  }, [convertedRows, adminFetch]);

  const handleAtReset = React.useCallback(() => {
    setAtFile(null);
    setConvertedRows([]);
    setConvertedPreview([]);
    setAtErrors([]);
    setAtTotalInput(0);
    setAtResult(null);
    setBatchProgress(null);
    setStreamProgress(null);
  }, []);

  // ============================================================
  // STREAMING: Convert + Upload pipeline untuk file besar
  // Baca file per 5MB chunk → convert → upload per 500 batch
  // Tidak pernah load seluruh file ke memory
  // ============================================================

  const handleStreamingConvertUpload = React.useCallback(async () => {
    if (!atFile) return;
    setUploading(true);
    setStreamProgress({
      phase: "reading",
      rowsRead: 0,
      rowsConverted: 0,
      rowsUploaded: 0,
      rowsSuccess: 0,
      rowsFailed: 0,
      currentBatch: 0,
      totalBatches: 0,
      percentRead: 0,
      errors: [],
    });
    setAtResult(null);

    try {
      const fileSize = atFile.size;
      let offset = 0;
      let leftover = ""; // sisa dari chunk sebelumnya (baris belum lengkap)
      let headerSkipped = false;
      let delimiter = ","; // akan di-detect dari baris pertama
      let delimiterDetected = false;

      // Accumulator
      let totalRowsRead = 0;
      let totalRowsConverted = 0;
      let totalRowsSuccess = 0;
      let totalRowsFailed = 0;
      let totalBatchesUploaded = 0;
      const allErrors: string[] = [];

      // Buffer untuk batch upload
      let batchBuffer: Record<string, string>[] = [];

      // Preview: simpan 5 baris pertama untuk preview
      let previewRows: Record<string, string>[] = [];

      const flushBatch = async () => {
        if (batchBuffer.length === 0) return;
        const batch = [...batchBuffer];
        batchBuffer = [];
        totalBatchesUploaded++;

        setStreamProgress(prev => prev ? {
          ...prev,
          phase: "uploading",
          currentBatch: totalBatchesUploaded,
          rowsUploaded: prev.rowsConverted,
        } : null);

        const batchCsv = generateJbCsv(batch);
        const blob = new Blob([batchCsv], { type: "text/csv" });
        const formData = new FormData();
        formData.append("file", blob, `at-stream-batch-${totalBatchesUploaded}.csv`);

        try {
          const res = await adminFetch("/api/bulk-upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) {
            allErrors.push(`Batch ${totalBatchesUploaded}: ${data.error || "Gagal upload"}`);
            totalRowsFailed += batch.length;
          } else {
            totalRowsSuccess += data.success || 0;
            totalRowsFailed += data.failed || 0;
            if (data.errors?.length) allErrors.push(...data.errors);
          }
        } catch (err: any) {
          allErrors.push(`Batch ${totalBatchesUploaded}: ${err?.message || "Network error"}`);
          totalRowsFailed += batch.length;
        }

        setStreamProgress(prev => prev ? {
          ...prev,
          phase: "reading",
          rowsSuccess: totalRowsSuccess,
          rowsFailed: totalRowsFailed,
        } : null);
      };

      // Read file in chunks
      while (offset < fileSize) {
        const end = Math.min(offset + STREAM_CHUNK_SIZE, fileSize);
        const blob = atFile.slice(offset, end);
        const chunkText = await blob.text();
        const combined = leftover + chunkText;

        // Split by newlines
        const lines = combined.split("\n");

        // Baris terakhir mungkin belum lengkap (terpotong di tengah)
        // Simpan sebagai leftover kecuali jika ini chunk terakhir
        if (end < fileSize) {
          leftover = lines.pop() || "";
        } else {
          leftover = "";
        }

        // Detect delimiter dari baris pertama
        if (!delimiterDetected && lines.length > 0) {
          const firstNonEmpty = lines.find(l => l.trim());
          if (firstNonEmpty) {
            const tabCount = (firstNonEmpty.match(/\t/g) || []).length;
            const commaCount = (firstNonEmpty.match(/,/g) || []).length;
            delimiter = tabCount > commaCount ? "\t" : ",";
            delimiterDetected = true;
          }
        }

        // Parse dan convert setiap baris
        for (const line of lines) {
          if (!line.trim()) continue;

          const row = parseCsvLineWithDelimiter(line, delimiter);
          totalRowsRead++;

          // Skip header row
          if (!headerSkipped && isHeaderRow(row)) {
            headerSkipped = true;
            continue;
          }
          headerSkipped = true; // skip hanya 1x

          // Validasi
          if (!row[1] || !row[2]) {
            // Skip tanpa error untuk streaming (terlalu banyak log)
            continue;
          }
          const col7 = parseInt(row[7] || "0", 10);
          const col8 = parseInt(row[8] || "0", 10);
          if (col7 <= 0 && col8 <= 0) continue;

          const converted = convertAtRowToJb(row);
          totalRowsConverted++;

          // Simpan preview
          if (previewRows.length < 5) {
            previewRows.push(converted);
          }

          // Tambah ke batch buffer
          batchBuffer.push(converted);

          // Flush jika batch penuh
          if (batchBuffer.length >= BATCH_SIZE) {
            await flushBatch();
          }
        }

        offset = end;

        // Update progress
        const percentRead = Math.round((offset / fileSize) * 100);
        setStreamProgress(prev => prev ? {
          ...prev,
          phase: "reading",
          rowsRead: totalRowsRead,
          rowsConverted: totalRowsConverted,
          percentRead,
        } : null);

        // Yield ke UI — biar browser gak freeze
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Flush sisa batch terakhir
      if (batchBuffer.length > 0) {
        await flushBatch();
      }

      // Set preview
      const previewData = previewRows.map((row) =>
        JB_HEADERS.map((h) => row[h] || "")
      );
      setConvertedPreview(previewData);

      // Done
      setStreamProgress(prev => prev ? {
        ...prev,
        phase: "done",
        rowsRead: totalRowsRead,
        rowsConverted: totalRowsConverted,
        rowsSuccess: totalRowsSuccess,
        rowsFailed: totalRowsFailed,
        currentBatch: totalBatchesUploaded,
        totalBatches: totalBatchesUploaded,
        percentRead: 100,
        errors: allErrors.slice(0, 30),
      } : null);

      setAtResult({
        success: totalRowsSuccess,
        failed: totalRowsFailed,
        total: totalRowsConverted,
        errors: allErrors.slice(0, 30),
      });
      setAtTotalInput(totalRowsRead);

    } catch (err: any) {
      setAtErrors([`Gagal streaming file: ${err?.message || "Unknown error"}`]);
      setStreamProgress(null);
    } finally {
      setUploading(false);
    }
  }, [atFile, adminFetch]);

  // ============================================================
  // Shared: Progress Bar Component
  // ============================================================

  const ProgressBar = ({ progress }: { progress: BatchProgress }) => (
    <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Batch {progress.currentBatch} dari {progress.totalBatches}
          </span>
        </div>
        <span className="text-sm text-blue-700 dark:text-blue-300">
          {progress.totalProcessed} diproses
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 overflow-hidden">
        <div
          className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(progress.currentBatch / progress.totalBatches) * 100}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ {progress.totalSuccess} berhasil
        </span>
        {progress.totalFailed > 0 && (
          <span className="text-red-600 dark:text-red-400 font-medium">
            ✗ {progress.totalFailed} gagal
          </span>
        )}
        <span className="text-blue-600 dark:text-blue-400">
          Total: {progress.totalProcessed}
        </span>
      </div>
    </div>
  );

  // Shared: Result Card Component
  const ResultCard = ({ result, onReset }: { result: BulkUploadResult; onReset: () => void }) => (
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
          <div className="mt-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 max-h-48 overflow-y-auto">
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

      <Button onClick={onReset} variant="outline">
        Upload Lagi
      </Button>
    </div>
  );

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
      {/* MODE: JB Upload */}
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
              <li>Buka di Excel, isi data produk — kolom wajib: <code className="bg-fuchsia-100 dark:bg-fuchsia-800 px-1 rounded text-xs">title, url, image, price, category</code></li>
              <li>Save As → CSV (Comma Separated Values)</li>
              <li>Upload file CSV — otomatis dibagi per {BATCH_SIZE} produk per batch</li>
              <li>Cek progress bar, lalu lihat hasilnya</li>
            </ol>
            <p className="text-xs text-fuchsia-700 dark:text-fuchsia-300 mt-2">
              Tidak ada batas jumlah — 2000+ produk akan otomatis dibagi jadi beberapa batch.
            </p>
          </div>

          {/* Download template */}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
            <Download className="w-4 h-4" />
            Download Template CSV
          </Button>

          {/* Batch Progress */}
          {batchProgress && <ProgressBar progress={batchProgress} />}

          {/* Drop zone */}
          {!result && !batchProgress && (
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
          {csvFile && csvHeaders.length > 0 && !result && !batchProgress && (
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
                <Button onClick={handleJbUpload} disabled={uploading} className="gap-1.5">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Produk
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
          {result && <ResultCard result={result} onReset={handleReset} />}
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
              <li>Download CSV / XLSX dari dashboard <b>Accesstrade</b> (Product Feed / Offer)</li>
              <li>Upload file ke area di bawah — <b>semua format diterima</b> (CSV, TSV, TXT, XLSX)</li>
              <li>Pilih mode: <b>Preview</b> (lihat dulu) atau <b>Streaming</b> (langsung convert+upload)</li>
            </ol>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              File besar (1GB+) aman — diproses per 5MB chunk, tidak load semua ke memory.
            </p>
          </div>

          {/* Mapping info */}
          <details className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <summary className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              Mapping Kolom AT → JB
            </summary>
            <div className="p-4 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left py-1.5 pr-3 text-zinc-500 dark:text-zinc-400">Kolom AT</th>
                    <th className="text-left py-1.5 pr-3 text-zinc-500 dark:text-zinc-400">→</th>
                    <th className="text-left py-1.5 text-zinc-500 dark:text-zinc-400">Kolom JB</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-600 dark:text-zinc-400">
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 1: Product Name</td><td className="pr-3">→</td><td>title *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 4: Affiliate Link (decoded)</td><td className="pr-3">→</td><td>url *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 2: Image URL</td><td className="pr-3">→</td><td>image *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 7/8: Price (auto-swap)</td><td className="pr-3">→</td><td>price *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 7/8: Original Price</td><td className="pr-3">→</td><td>originalPrice</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Calculated</td><td className="pr-3">→</td><td>discountPercent</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 17/15/13: Category</td><td className="pr-3">→</td><td>category *</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Default: shopee</td><td className="pr-3">→</td><td>marketplace</td></tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-1 pr-3">Col 5: Affiliate Link</td><td className="pr-3">→</td><td>affiliateUrl</td></tr>
                  <tr><td className="py-1 pr-3">Col 6: Description (stripped)</td><td className="pr-3">→</td><td>notes</td></tr>
                </tbody>
              </table>
            </div>
          </details>

          {/* Streaming Progress */}
          {streamProgress && streamProgress.phase !== "done" && (
            <div className="rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                  <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    {streamProgress.phase === "reading" && "Membaca & konversi file..."}
                    {streamProgress.phase === "converting" && "Mengkonversi..."}
                    {streamProgress.phase === "uploading" && `Upload batch ${streamProgress.currentBatch}...`}
                  </span>
                </div>
                <span className="text-sm text-purple-700 dark:text-purple-300">
                  {streamProgress.percentRead}% dibaca
                </span>
              </div>

              {/* File read progress bar */}
              <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${streamProgress.percentRead}%` }}
                />
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="text-purple-700 dark:text-purple-300">
                  {streamProgress.rowsRead.toLocaleString()} baris dibaca
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {streamProgress.rowsConverted.toLocaleString()} dikonversi
                </span>
                {streamProgress.rowsSuccess > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ {streamProgress.rowsSuccess.toLocaleString()} berhasil
                  </span>
                )}
                {streamProgress.rowsFailed > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    ✗ {streamProgress.rowsFailed.toLocaleString()} gagal
                  </span>
                )}
                {streamProgress.currentBatch > 0 && (
                  <span className="text-purple-600 dark:text-purple-400">
                    Batch {streamProgress.currentBatch} diupload
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Batch Progress (old style — for preview mode) */}
          {batchProgress && <ProgressBar progress={batchProgress} />}

          {/* Step 1: Upload AT CSV */}
          {!atResult && convertedRows.length === 0 && !batchProgress && !streamProgress && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setAtDragActive(true); }}
                onDragLeave={() => setAtDragActive(false)}
                onDrop={handleAtDrop}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  // Accept semua format yang mungkin dari AT
                  input.accept = ".csv,.txt,.tsv,.xlsx,.xls,.dat";
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
                    <p className="text-xs text-zinc-500">
                      {(atFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Drag & drop file CSV / TSV / XLSX Accesstrade di sini
                    </p>
                    <p className="text-xs text-zinc-400">atau klik untuk pilih file — semua format diterima</p>
                  </div>
                )}
              </div>

              {atFile && (
                <>
                  {/* Mode selector */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Pilih Mode Konversi</p>
                    
                    <label className={cn(
                      "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border",
                      atConvertMode === "preview"
                        ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}>
                      <input
                        type="radio"
                        name="atConvertMode"
                        value="preview"
                        checked={atConvertMode === "preview"}
                        onChange={() => setAtConvertMode("preview")}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Preview Dulu
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Konversi → lihat preview → upload manual. Cocok untuk file kecil (&lt;50MB).
                        </p>
                      </div>
                    </label>

                    <label className={cn(
                      "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border",
                      atConvertMode === "streaming"
                        ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}>
                      <input
                        type="radio"
                        name="atConvertMode"
                        value="streaming"
                        checked={atConvertMode === "streaming"}
                        onChange={() => setAtConvertMode("streaming")}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Streaming (Rekomendasi)
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Langsung convert + upload streaming. Aman untuk file besar 1GB+. Tidak load semua ke memory.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    {atConvertMode === "preview" ? (
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
                    ) : (
                      <Button onClick={handleStreamingConvertUpload} disabled={uploading} className="gap-1.5 bg-purple-600 hover:bg-purple-700">
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Streaming...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Convert & Upload Streaming
                          </>
                        )}
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleAtReset} disabled={converting || uploading}>
                      Batal
                    </Button>
                  </div>
                </>
              )}

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

          {/* Step 2: Preview Converted Data (preview mode only) */}
          {convertedRows.length > 0 && !atResult && !batchProgress && (
            <div className="space-y-3">
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
                Preview ({convertedPreview.length} dari {convertedRows.length} produk)
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

              <div className="flex gap-2">
                <Button onClick={handleAtUpload} disabled={uploading} className="gap-1.5">
                  {uploading ? (
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
                <Button variant="outline" onClick={handleDownloadConverted} disabled={uploading} className="gap-1.5">
                  <Download className="w-4 h-4" />
                  Download CSV JB
                </Button>
                <Button variant="outline" onClick={handleAtReset} disabled={uploading}>
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
                      {streamProgress ? "Streaming Selesai!" : "Upload Selesai!"}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {atResult.success.toLocaleString()} berhasil, {atResult.failed.toLocaleString()} gagal dari {atResult.total.toLocaleString()} produk
                    </p>
                  </div>
                </div>

                {atResult.errors.length > 0 && (
                  <div className="mt-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 max-h-48 overflow-y-auto">
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

              {/* Show preview from streaming if available */}
              {convertedPreview.length > 0 && (
                <details className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <summary className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Preview 5 produk pertama
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-800">
                          {JB_HEADERS.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                              {h}
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
                </details>
              )}

              <Button onClick={handleAtReset} variant="outline">
                Upload Lagi
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
