import Link from "next/link";

/**
 * SiteFooter — footer dengan navigasi, deskripsi, dan affiliate disclosure.
 */
export function SiteFooter() {
  return (
    <footer className="bg-header-gradient text-white mt-auto">
      <div className="container mx-auto px-4 max-w-7xl py-6">
        {/* Top row: logo + description */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm mb-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="JB" className="w-5 h-5" />
            <span className="font-semibold">JelajahBelanja</span>
            <span className="text-white/70">© 2025</span>
          </div>
          <p className="text-xs text-white/70 text-center md:text-right max-w-md">
            Platform agregator produk viral Indonesia dari Shopee, Tokopedia, dan
            Lazada.
          </p>
        </div>

        {/* Navigation links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/60 mb-4">
          <Link href="/tentang" className="hover:text-white transition-colors">
            Tentang
          </Link>
          <span aria-hidden>·</span>
          <Link href="/kontak" className="hover:text-white transition-colors">
            Kontak
          </Link>
          <span aria-hidden>·</span>
          <Link href="/artikel" className="hover:text-white transition-colors">
            Blog
          </Link>
          <span aria-hidden>·</span>
          <Link
            href="/privasi"
            className="hover:text-white transition-colors"
          >
            Kebijakan Privasi
          </Link>
          <span aria-hidden>·</span>
          <Link href="/syarat" className="hover:text-white transition-colors">
            Syarat & Ketentuan
          </Link>
          <span aria-hidden>·</span>
          <Link
            href="/disclaimer"
            className="hover:text-white transition-colors"
          >
            Disclaimer
          </Link>
        </div>

        {/* Affiliate disclosure */}
        <p className="text-[11px] text-white/60 leading-relaxed border-t border-white/20 pt-3">
          <strong className="text-white/80">Disclosure Affiliate:</strong>{" "}
          Beberapa link di JelajahBelanja adalah link afiliasi. Jika kamu membeli
          produk melalui link tersebut, kami mungkin menerima komisi kecil dari
          marketplace tanpa biaya tambahan untuk kamu. Ini membantu kami terus
          menyediakan layanan gratis. Terima kasih atas dukunganmu!
        </p>
      </div>
    </footer>
  );
}
