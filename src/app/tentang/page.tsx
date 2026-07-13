import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Shield, Search, TrendingUp, Users, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "JelajahBelanja adalah platform kurasi produk anak Indonesia yang mengumpulkan produk terbaik untuk si kecil dari Shopee & Tokopedia — fashion anak, perlengkapan sekolah, tumbler, mainan edukatif, dan lainnya.",
  openGraph: {
    title: "Tentang JelajahBelanja",
    description:
      "Platform kurasi produk anak Indonesia — fashion, sekolah, dan perlengkapan bayi dengan rating ≥ 4.8.",
  },
};

export default function TentangPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-header-gradient text-white">
        <div className="container mx-auto px-4 max-w-3xl py-8 md:py-12">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3">Tentang JelajahBelanja</h1>
          <p className="text-sm md:text-base text-white/80 max-w-xl">
            Platform kurasi produk anak Indonesia — membantu orang tua menemukan produk terbaik untuk si kecil tanpa ribet.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-8 space-y-10">
        {/* Mission */}
        <section>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-fuchsia-500" />
            Misi Kami
          </h2>
          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p>
              JelajahBelanja lahir dari sebuah masalah yang sederhana: mencari produk anak yang berkualitas di marketplace itu memakan waktu. Setiap hari, jutaan produk baru muncul di Shopee dan Tokopedia. Di antara ribuan produk tersebut, ada yang benar-benar bagus dan worth it untuk si kecil, tapi juga banyak yang mengecewakan. Mencari jepit rambut anak yang awet, kaos kaki sekolah yang nyaman, atau tumbler anti tumpah di tengah lautan pilihan bisa memakan waktu berjam-jam.
            </p>
            <p>
              Misi kami sederhana: membantu orang tua Indonesia membuat keputusan belanja yang lebih cerdas untuk si kecil, lebih cepat, dan lebih terinformasi. Kami melakukan ini dengan mengkurasi produk-produk anak terbaik dari Shopee dan Tokopedia, menampilkan informasi yang paling relevan — harga, rating (≥ 4.8 bintang), jumlah terjual, lokasi seller — sehingga kamu bisa membandingkan dan memutuskan dalam hitungan menit, bukan jam.
            </p>
            <p>
              Kami bukan toko online. Kami tidak menjual produk apapun. Yang kami lakukan adalah menyaring dan menyajikan informasi produk anak dari berbagai sumber sehingga kamu mendapat gambaran yang lengkap sebelum membeli. Setiap produk yang tampil di JelajahBelanja sudah melewati proses seleksi berdasarkan kualitas rating, popularitas, dan value untuk uang yang kamu keluarkan.
            </p>
          </div>
        </section>

        {/* What We Do */}
        <section>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-fuchsia-500" />
            Apa yang Kami Lakukan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: <Search className="w-6 h-6" />,
                title: "Kurasi Produk Anak",
                desc: "Kami memilih produk anak terbaik dari Shopee & Tokopedia berdasarkan data real — jumlah terjual, rating ≥ 4.8, dan tren pencarian.",
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "Pantau Tren Produk Anak",
                desc: "Produk anak viral berubah setiap hari. Kami memantau tren terbaru (jepit rambut Korea, tas sekolah aesthetic, tumbler karakter) dan memperbarui rekomendasi secara berkala.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Proteksi Pembeli",
                desc: "Kami menyediakan informasi lengkap termasuk rating toko dan review pembeli, plus panduan belanja aman untuk melindungi konsumen dari penipuan.",
              },
              {
                icon: <Globe className="w-6 h-6" />,
                title: "Multi-Marketplace",
                desc: "Kamu tidak perlu buka satu-satu. Bandingkan produk dari berbagai marketplace dalam satu halaman, hemat waktu dan energi.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              >
                <div className="text-fuchsia-500 mb-2">{item.icon}</div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{item.title}</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Affiliate Disclosure */}
        <section>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-fuchsia-500" />
            Transparansi Affiliate
          </h2>
          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p>
              Sebagai platform yang mengarahkan pengunjung ke marketplace, JelajahBelanja berpartisipasi dalam program affiliate yang diselenggarakan oleh Shopee, Tokopedia, dan Lazada. Artinya, ketika kamu mengklik link produk di website kami dan kemudian melakukan pembelian di marketplace tersebut, kami mungkin menerima komisi kecil dari marketplace — tanpa biaya tambahan untuk kamu.
            </p>
            <p>
              Komisi ini membantu kami mengoperasikan dan mengembangkan JelajahBelanja secara gratis untuk semua pengguna. Namun, kami ingin menegaskan bahwa program affiliate ini tidak mempengaruhi kurasi produk kami. Produk yang kami tampilkan dipilih berdasarkan kualitas, popularitas, dan value — bukan karena komisi yang lebih besar. Jika sebuah produk tidak worth it, kami tidak akan merekomendasikannya meskipun komisinya tinggi.
            </p>
            <p>
              Kami berkomitmen untuk selalu transparan tentang hubungan affiliate kami. Semua link affiliate di website ini disertai atribut rel=&quot;nofollow sponsored&quot; sesuai pedoman SEO dan regulasi FTC. Jika kamu memiliki pertanyaan tentang praktik affiliate kami, jangan ragu untuk menghubungi kami melalui halaman{" "}
              <Link href="/kontak" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">
                Kontak
              </Link>.
            </p>
          </div>
        </section>

        {/* For Shopee / Marketplace Partners */}
        <section>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-fuchsia-500" />
            Untuk Partner Marketplace
          </h2>
          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p>
              JelajahBelanja berkomitmen untuk menjalankan program affiliate secara etis dan sesuai dengan ketentuan setiap marketplace. Kami menerapkan proteksi click fraud yang meliputi bot detection, rate limiting per IP, dan click throttling untuk memastikan bahwa setiap klik pada link affiliate berasal dari pengguna nyata yang berminat pada produk.
            </p>
            <p>
              Kami juga mematuhi semua pedoman yang ditetapkan oleh program affiliate masing-masing marketplace, termasuk larangan click fraud, spam, dan konten menyesatkan. Jika Anda adalah perwakilan marketplace dan memiliki pertanyaan atau kekhawatiran, silakan hubungi kami melalui halaman{" "}
              <Link href="/kontak" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">
                Kontak
              </Link>.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20 border border-fuchsia-200 dark:border-fuchsia-800/50 p-6 text-center">
          <p className="font-semibold text-fuchsia-900 dark:text-fuchsia-100 mb-2">
            Mulai jelajahi produk anak terbaik sekarang!
          </p>
          <p className="text-sm text-fuchsia-700 dark:text-fuchsia-300 mb-4">
            Temukan jepit rambut anak, kaos kaki sekolah, tas ransel, tumbler, dan produk anak lainnya dalam satu tempat.
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
