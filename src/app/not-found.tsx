"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Big 404 */}
        <div className="mb-6">
          <span className="text-8xl font-extrabold bg-gradient-to-r from-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
            404
          </span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
          Maaf, halaman yang kamu cari tidak ada atau sudah dipindahkan. Coba kembali ke beranda atau cari produk yang kamu butuhkan.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-fuchsia-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-fuchsia-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}
