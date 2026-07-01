import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Instagram, Clock, Send } from "lucide-react";

export const metadata: Metadata = {
  title: "Kontak Kami",
  description:
    "Hubungi tim JelajahBelanja untuk pertanyaan, saran, kerja sama, atau laporan masalah. Kami siap membantu!",
  openGraph: {
    title: "Kontak JelajahBelanja",
    description: "Hubungi kami untuk pertanyaan, saran, atau kerja sama.",
  },
};

export default function KontakPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-header-gradient text-white">
        <div className="container mx-auto px-4 max-w-3xl py-8 md:py-12">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3">Hubungi Kami</h1>
          <p className="text-sm md:text-base text-white/80 max-w-xl">
            Ada pertanyaan, saran, atau ingin bekerja sama? Tim JelajahBelanja siap membantu kamu.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-8 space-y-8">
        {/* Contact Methods */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="mailto:hello@jelajahbelanja.com"
            className="group p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-all"
          >
            <Mail className="w-8 h-8 text-fuchsia-500 mb-3" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Email</h2>
            <p className="text-sm text-fuchsia-600 dark:text-fuchsia-400 group-hover:underline">
              hello@jelajahbelanja.com
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Untuk pertanyaan umum, saran, dan kerja sama
            </p>
          </a>

          <a
            href="https://instagram.com/jelajahbelanja"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-all"
          >
            <Instagram className="w-8 h-8 text-fuchsia-500 mb-3" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Instagram</h2>
            <p className="text-sm text-fuchsia-600 dark:text-fuchsia-400 group-hover:underline">
              @jelajahbelanja
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Follow untuk update produk viral & tips belanja
            </p>
          </a>

          <a
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-all"
          >
            <MessageCircle className="w-8 h-8 text-fuchsia-500 mb-3" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">WhatsApp</h2>
            <p className="text-sm text-fuchsia-600 dark:text-fuchsia-400 group-hover:underline">
              Chat langsung
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Untuk bantuan cepat dan laporan masalah
            </p>
          </a>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <Clock className="w-8 h-8 text-fuchsia-500 mb-3" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Jam Respons</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Senin - Jumat, 09:00 - 17:00 WIB
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Kami akan merespons dalam 1-2 hari kerja
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <section>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-fuchsia-500" />
            Pertanyaan yang Sering Diajukan
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Apakah JelajahBelanja menjual produk?",
                a: "Tidak. JelajahBelanja adalah platform kurasi produk. Kami membantu kamu menemukan produk terbaik dari marketplace seperti Shopee, Tokopedia, dan Lazada. Pembelian dilakukan langsung di marketplace masing-masing, sehingga kamu mendapat perlindungan garansi dan buyer protection dari marketplace.",
              },
              {
                q: "Apakah ada biaya untuk menggunakan JelajahBelanja?",
                a: "Tidak ada. JelajahBelanja sepenuhnya gratis untuk pengguna. Kami mendapatkan penghasilan dari program affiliate marketplace, artinya kami menerima komisi kecil ketika kamu membeli produk melalui link di website kami — tanpa biaya tambahan untuk kamu.",
              },
              {
                q: "Bagaimana cara melaporkan produk yang bermasalah?",
                a: "Jika kamu menemukan produk yang tidak sesuai deskripsi, penipuan, atau konten yang melanggar, silakan hubungi kami melalui email atau WhatsApp. Kami akan meninjau dan menghapus produk tersebut dari website kami. Untuk masalah transaksi, kamu harus menghubungi customer service marketplace tempat pembelian dilakukan.",
              },
              {
                q: "Saya ingin bekerja sama dengan JelajahBelanja, bagaimana caranya?",
                a: "Kami terbuka untuk berbagai bentuk kerja sama, termasuk product listing, content collaboration, dan partnership. Kirim proposal kamu ke hello@jelajahbelanja.com dengan subjek 'Kerja Sama' dan tim kami akan merespons dalam 2-3 hari kerja.",
              },
              {
                q: "Apakah data saya aman di JelajahBelanja?",
                a: "Ya. JelajahBelanja tidak mengumpulkan data pribadi pengunjung. Kami tidak menggunakan form registrasi, tracking script pihak ketiga yang berlebihan, atau menjual data ke siapapun. Untuk informasi lengkap, silakan baca halaman Kebijakan Privasi kami.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              >
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-sm">
                  {faq.q}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20 border border-fuchsia-200 dark:border-fuchsia-800/50 p-6 text-center">
          <p className="text-sm text-fuchsia-700 dark:text-fuchsia-300 mb-3">
            Atau kembali jelajahi produk viral terbaru
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-fuchsia-600 text-white px-5 py-2.5 rounded-xl hover:bg-fuchsia-700 transition-colors"
          >
            Jelajah Produk
          </Link>
        </div>
      </div>
    </div>
  );
}
