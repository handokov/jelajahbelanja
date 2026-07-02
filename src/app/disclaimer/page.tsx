import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Disclaimer & Affiliate Disclosure",
  description:
    "Disclosure affiliate JelajahBelanja. Transparansi penuh mengenai link afiliasi, komisi, dan hubungan komersial dengan marketplace.",
  openGraph: {
    title: "Disclaimer & Affiliate Disclosure — JelajahBelanja",
    description: "Transparansi penuh mengenai link afiliasi dan hubungan komersial JelajahBelanja.",
  },
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-header-gradient text-white">
        <div className="container mx-auto px-4 max-w-3xl py-8 md:py-12">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7" />
            Disclaimer &amp; Affiliate Disclosure
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-xl">
            Komitmen transparansi kami kepada pengunjung mengenai hubungan komersial dan link afiliasi di JelajahBelanja.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-8 space-y-8 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {/* Apa Itu Affiliate */}
        <section>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            Apa Itu Link Afiliasi?
          </h2>
          <p className="mb-3">
            Link afiliasi adalah URL khusus yang mengarahkan pengunjung ke halaman produk di marketplace (seperti Shopee, Tokopedia, atau Lazada). Ketika kamu membeli produk melalui link afiliasi kami, JelajahBelanja menerima komisi kecil dari marketplace tersebut — tanpa menambah biaya apapun untuk kamu. Harga produk yang kamu bayar tetap sama, baik kamu mengaksesnya melalui link kami maupun langsung dari marketplace.
          </p>
          <p>
            Program afiliasi ini merupakan cara kami memonetisasi website agar bisa terus menyediakan layanan kurasi produk secara gratis untuk pengunjung. Kami selalu berusaha memastikan bahwa konten dan rekomendasi kami tidak terpengaruh oleh komisi — produk yang kami tampilkan dipilih berdasarkan kualitas, popularitas, dan relevansi bagi pengunjung Indonesia.
          </p>
        </section>

        {/* Marketplace yang Kami Ikuti */}
        <section>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            Program Afiliasi yang Kami Ikuti
          </h2>
          <p className="mb-3">
            JelajahBelanja saat ini berpartisipasi dalam program afiliasi resmi dari marketplace berikut:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">Shopee Affiliate Program</strong> — Program afiliasi resmi Shopee Indonesia. Kami menerima komisi ketika pengunjung membeli produk melalui link Shopee yang mengandung parameter <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">aff_atk</code> kami.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">Tokopedia Affiliate Program</strong> — Program afiliasi resmi Tokopedia. Komisi diterima melalui parameter <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">aff_code</code> pada link produk.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">Lazada Affiliate Program</strong> — Program afiliasi resmi Lazada Indonesia. Komisi diterima melalui parameter <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">aff_id</code> pada link produk.
            </li>
          </ul>
          <p className="mt-3">
            Semua program afiliasi di atas dijalankan sesuai dengan syarat dan ketentuan masing-masing marketplace. Kami tidak memanipulasi harga, review, atau peringkat produk demi keuntungan afiliasi.
          </p>
        </section>

        {/* Bagaimana Kami Menggunakan Link Afiliasi */}
        <section>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            Bagaimana Kami Menggunakan Link Afiliasi?
          </h2>
          <p className="mb-3">
            Setiap kali kamu melihat tombol &quot;Beli di Shopee&quot;, &quot;Beli di Tokopedia&quot;, atau tombol serupa di website kami, tombol tersebut mengandung link afiliasi. Artinya, ketika kamu mengklik tombol tersebut dan kemudian melakukan pembelian di marketplace, kami akan menerima komisi kecil dari marketplace tersebut.
          </p>
          <p className="mb-3">
            Kami menggunakan atribut <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">rel=&quot;nofollow sponsored&quot;</code> pada semua link afiliasi, sesuai pedoman Google dan praktik SEO terbaik. Ini berarti mesin pencari tidak menganggap link kami sebagai bentuk manipulasi peringkat.
          </p>
          <p>
            Penting untuk diketahui: kamu tidak wajib membeli melalui link kami. Kamu selalu bisa mengunjungi marketplace secara langsung dan mencari produk yang sama. Namun, pembelian melalui link kami membantu kami mempertahankan dan mengembangkan layanan ini tetap gratis untuk semua pengunjung.
          </p>
        </section>

        {/* Integritas Konten */}
        <section>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            Integritas Konten &amp; Rekomendasi
          </h2>
          <p className="mb-3">
            Komisi afiliasi tidak mempengaruhi urutan tampil, rekomendasi, atau review produk di JelajahBelanja. Produk yang ditampilkan diwebsite kami diurutkan berdasarkan metrik objektif seperti jumlah terjual, rating, viral score, dan tren pencarian — bukan berdasarkan besaran komisi.
          </p>
          <p>
            Kami berkomitmen untuk hanya menampilkan produk dari seller yang memiliki reputasi baik, rating tinggi, dan track record yang jelas di marketplace. Jika kamu menemukan produk yang tidak sesuai deskripsi atau bermasalah, silakan laporkan melalui halaman{" "}
            <Link href="/kontak" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">
              Kontak
            </Link>{" "}
            kami.
          </p>
        </section>

        {/* Batasan Tanggung Jawab */}
        <section>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            Batasan Tanggung Jawab
          </h2>
          <p className="mb-3">
            JelajahBelanja bukan penjual atau distributor produk yang ditampilkan di website ini. Kami hanya menyediakan layanan kurasi dan agregasi produk dari berbagai marketplace. Segala transaksi pembelian dilakukan langsung antara kamu dan seller di marketplace masing-masing.
          </p>
          <p className="mb-3">
            Oleh karena itu, JelajahBelanja tidak bertanggung jawab atas: kualitas produk, ketepatan pengiriman, garansi, pengembalian dana, atau sengketa antara pembeli dan penjual. Untuk masalah transaksi, kamu harus menghubungi customer service marketplace tempat pembelian dilakukan.
          </p>
          <p>
            Informasi harga, diskon, dan ketersediaan produk yang ditampilkan di JelajahBelanja bersifat dinamis dan dapat berubah sewaktu-waktu sesuai dengan data dari marketplace. Kami berusaha memperbarui informasi secara berkala, namun tidak menjamin keakuratan data secara real-time.
          </p>
        </section>

        {/* Kepatuhan */}
        <section>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            Kepatuhan terhadap Regulasi
          </h2>
          <p className="mb-3">
            Halaman disclaimer ini disusun sesuai dengan pedoman Federal Trade Commission (FTC) mengenai pengungkapan hubungan afiliasi, serta mengikuti kebijakan masing-masing program afiliasi marketplace yang kami ikuti. Kami berkomitmen untuk selalu transparan mengenai hubungan komersial kami.
          </p>
          <p>
            Jika kamu memiliki pertanyaan mengenai disclaimer ini atau praktik afiliasi kami, jangan ragu untuk menghubungi kami melalui halaman{" "}
            <Link href="/kontak" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">
              Kontak
            </Link>.
          </p>
        </section>

        {/* Last updated */}
        <p className="text-xs text-zinc-400 dark:text-zinc-600 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          Terakhir diperbarui: 2 Juli 2026
        </p>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20 border border-fuchsia-200 dark:border-fuchsia-800/50 p-6 text-center">
          <p className="text-sm text-fuchsia-700 dark:text-fuchsia-300 mb-3">
            Punya pertanyaan tentang praktik afiliasi kami?
          </p>
          <Link
            href="/kontak"
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-fuchsia-600 text-white px-5 py-2.5 rounded-xl hover:bg-fuchsia-700 transition-colors"
          >
            Hubungi Kami
          </Link>
        </div>
      </div>
    </div>
  );
}
