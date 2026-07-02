"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Error boundary untuk halaman produk.
 * Kalau ada client-side error, tampilkan halaman yang ramah
 * bukan "Application error" yang bikin panik user.
 */
export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 max-w-5xl flex items-center h-12">
          <Link href="/" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Kembali</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Ups, ada gangguan
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Terjadi kesalahan saat memuat produk. Coba lagi atau kembali ke halaman utama.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
