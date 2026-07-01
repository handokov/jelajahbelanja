import Link from "next/link";
import { ArrowLeft, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-900/30 mb-6">
          <Search className="w-10 h-10 text-violet-600 dark:text-violet-400" />
        </div>

        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          404
        </h1>

        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-2">
          Produk tidak ditemukan
        </p>

        <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-8">
          Mungkin produk sudah dihapus atau link-nya salah. Coba cari produk lain di {SITE_NAME}!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-lg shadow-violet-500/25">
            <Link href="/">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Ke Homepage
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg">
            <a href="/?search=">
              <Search className="w-5 h-5 mr-2" />
              Cari Produk
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
