"use client";

import * as React from "react";
import { Upload, FileText, CheckCircle2, XCircle, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// CSV template untuk didownload user
const CSV_TEMPLATE = `title,url,image,price,originalPrice,discountPercent,rating,reviewCount,soldCount,location,category,marketplace,affiliateUrl,notes
Celana Jeans Pria Slim Fit,https://shopee.co.id/product-123,https://example.com/image1.jpg,150000,250000,40,4.8,1200,5000,Jakarta,Fashion,shopee,https://shope.ee/aff123,,
Kaos Oversize Unisex,https://shopee.co.id/product-456,https://example.com/image2.jpg,75000,120000,38,4.7,800,3000,Bandung,Fashion,shopee,,,
Sepatu Sneakers Pria,https://shopee.co.id/product-789,https://example.com/image3.jpg,250000,,,0,0,0,Surabaya,Fashion,shopee,,produk baru belum ada rating`;

interface BulkUploadResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
}

export function BulkUploadTab({ adminFetch }: { adminFetch: (url: string, options?: RequestInit) => Promise<Response> }) {
  const [dragActive, setDragActive] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvPreview, setCsvPreview] = React.useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [result, setResult] = React.useState<BulkUploadResult | null>(null);

  // Parse CSV buat preview
  const parseCsvForPreview = React.useCallback((text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      setCsvHeaders([]);
      setCsvPreview([]);
      return;
    }

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

    const headers = parseLine(lines[0]);
    const previewRows = lines.slice(1, 6).map(parseLine);

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

  return (
    <div className="space-y-4">
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
                      {["title", "url", "image", "price", "category"].includes(h.toLowerCase()) && (
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
    </div>
  );
}
