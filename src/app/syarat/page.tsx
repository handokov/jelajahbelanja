import type { Metadata } from "next";
import Link from "next/link";
import { FileText, AlertTriangle, ShoppingBag, Shield, Scale, Gavel } from "lucide-react";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan Ketentuan penggunaan website JelajahBelanja. Harap baca sebelum menggunakan layanan kami.",
  openGraph: {
    title: "Syarat & Ketentuan — JelajahBelanja",
    description: "Ketentuan penggunaan layanan JelajahBelanja.",
  },
};

export default function SyaratPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-header-gradient text-white">
        <div className="container mx-auto px-4 max-w-3xl py-8 md:py-12">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3">Syarat & Ketentuan</h1>
          <p className="text-sm md:text-base text-white/80 max-w-xl">
            Ketentuan penggunaan layanan JelajahBelanja. Dengan menggunakan website ini, Anda menyetujui syarat berikut.
          </p>
          <p className="text-xs text-white/50 mt-2">Terakhir diperbarui: 1 Juli 2025</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-8 space-y-8">
        {/* Intro */}
        <section className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <p>
            Selamat datang di JelajahBelanja. Dengan mengakses atau menggunakan website ini, Anda menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju dengan salah satu ketentuan di bawah, mohon untuk tidak menggunakan website kami. Syarat dan Ketentuan ini berlaku untuk semua pengunjung dan pengguna JelajahBelanja.
          </p>
        </section>

        {/* Sections */}
        {[
          {
            icon: <FileText className="w-5 h-5" />,
            title: "1. Deskripsi Layanan",
            content: [
              "JelajahBelanja adalah platform agregator dan kurator produk yang menyajikan informasi produk dari berbagai marketplace Indonesia, termasuk namun tidak terbatas pada Shopee, Tokopedia, dan Lazada. Layanan kami meliputi:",
              "Kurasi produk viral dan best seller berdasarkan data popularitas, rating, dan jumlah terjual.",
              "Perbandingan informasi produk seperti harga, diskon, rating, dan lokasi seller dari berbagai marketplace.",
              "Artikel dan panduan edukatif seputar tips belanja online, review produk, dan panduan affiliate marketing.",
              "Penting: JelajahBelanja BUKAN toko online. Kami tidak menjual, menyimpan, atau mengirimkan produk apapun. Semua transaksi pembelian terjadi di marketplace pihak ketiga dan tunduk pada syarat & ketentuan masing-masing platform.",
            ],
          },
          {
            icon: <ShoppingBag className="w-5 h-5" />,
            title: "2. Link Affiliate dan Transparansi",
            content: [
              "JelajahBelanja berpartisipasi dalam program affiliate yang diselenggarakan oleh marketplace. Ini berarti:",
              "Beberapa link di website kami adalah link affiliate. Ketika Anda mengklik link tersebut dan melakukan pembelian di marketplace, kami mungkin menerima komisi kecil dari marketplace tanpa biaya tambahan untuk Anda.",
              "Keberadaan program affiliate tidak mempengaruhi kurasi produk kami. Produk dipilih berdasarkan kualitas dan popularitas, bukan besaran komisi.",
              "Semua link affiliate disertai atribut rel='nofollow sponsored' sesuai pedoman SEO dan regulasi FTC tentang transparansi konten bersponsor.",
              "Kami berkomitmen untuk selalu mengungkapkan hubungan affiliate kami secara terbuka, sebagaimana tercantum di halaman Tentang Kami dan di footer website.",
            ],
          },
          {
            icon: <AlertTriangle className="w-5 h-5" />,
            title: "3. Batasan Tanggung Jawab",
            content: [
              "JelajahBelanja berfungsi sebagai penyedia informasi, bukan penjual produk. Dengan menggunakan layanan kami, Anda memahami dan menyetujui bahwa:",
              "Kami tidak bertanggung jawab atas kualitas, keaslian, ketersediaan, atau pengiriman produk yang ditampilkan di website ini. Tanggung jawab produk sepenuhnya berada pada penjual di marketplace masing-masing.",
              "Informasi harga, diskon, dan ketersediaan produk dapat berubah tanpa pemberitahuan karena sifat dinamis dari marketplace. Kami berupaya memperbarui informasi secara berkala, namun tidak menjamin keakuratan data pada setiap saat.",
              "Kami tidak bertanggung jawab atas kerugian yang timbul dari transaksi yang Anda lakukan di marketplace pihak ketiga. Setiap keluhan transaksi harus diajukan langsung ke customer service marketplace yang bersangkutan.",
              "Kami tidak memberikan jaminan bahwa website akan selalu tersedia, bebas error, atau bebas virus atau komponen berbahaya lainnya.",
            ],
          },
          {
            icon: <Shield className="w-5 h-5" />,
            title: "4. Larangan Penggunaan",
            content: [
              "Anda dilarang menggunakan JelajahBelanja untuk tujuan berikut:",
              "Menggunakan alat otomatis (bot, autoclick, scraper, atau sejenisnya) untuk mengakses website atau mengklik link affiliate secara massal. Pelanggaran ini akan mengakibatkan pemblokiran IP dan dapat dilaporkan ke marketplace yang bersangkutan.",
              "Menyalin, memodifikasi, atau mendistribusikan konten website kami tanpa izin tertulis.",
              "Menggunakan website untuk tujuan ilegal, penipuan, atau aktivitas yang merugikan pihak lain.",
              "Mencoba mengakses sistem atau data yang tidak diperuntukkan bagi pengguna umum, termasuk halaman administrasi.",
              "Melanggar hak kekayaan intelektual kami atau pihak ketiga.",
              "Pelanggaran terhadap ketentuan ini dapat mengakibatkan pemblokiran akses ke website tanpa pemberitahuan.",
            ],
          },
          {
            icon: <Scale className="w-5 h-5" />,
            title: "5. Hak Kekayaan Intelektual",
            content: [
              "Seluruh konten di JelajahBelanja, termasuk namun tidak terbatas pada teks, desain, logo, tata letak, dan kode program, adalah milik JelajahBelanja dan dilindungi oleh hukum hak cipta Indonesia. Gambar produk yang ditampilkan merupakan milik penjual masing-masing di marketplace dan ditampilkan sesuai dengan ketentuan tautan (linking) yang lazim.",
              "Anda diperbolehkan membagikan link ke halaman JelajahBelanja, namun tidak diperbolehkan menyalin konten secara substansial tanpa atribusi yang jelas dan izin tertulis dari kami.",
            ],
          },
          {
            icon: <Gavel className="w-5 h-5" />,
            title: "6. Hukum yang Berlaku",
            content: [
              "Syarat dan Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum Republik Indonesia. Setiap sengketa yang timbul dari atau terkait dengan penggunaan JelajahBelanja akan diselesaikan melalui musyawarah mufakat. Apabila musyawarah tidak mencapai kesepakatan, sengketa akan diselesaikan melalui pengadilan yang berwenang di Indonesia.",
              "Jika salah satu ketentuan dalam Syarat dan Ketentuan ini dinyatakan tidak sah atau tidak dapat dilaksanakan, ketentuan lainnya tetap berlaku secara penuh.",
            ],
          },
          {
            icon: <FileText className="w-5 h-5" />,
            title: "7. Perubahan Syarat & Ketentuan",
            content: [
              "Kami berhak mengubah Syarat dan Ketentuan ini kapan saja tanpa pemberitahuan sebelumnya. Perubahan akan berlaku segera setelah dipublikasikan di halaman ini. Tanggal 'Terakhir diperbarui' di bagian atas halaman menunjukkan kapan revisi terakhir dilakukan. Penggunaan berkelanjutan atas website setelah perubahan dianggap sebagai penerimaan Anda terhadap syarat yang diperbarui.",
            ],
          },
        ].map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <span className="text-fuchsia-500">{section.icon}</span>
              {section.title}
            </h2>
            <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {section.content.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        {/* Contact CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20 border border-fuchsia-200 dark:border-fuchsia-800/50 p-6 text-center">
          <p className="text-sm text-fuchsia-700 dark:text-fuchsia-300 mb-3">
            Ada pertanyaan tentang syarat & ketentuan kami?
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
