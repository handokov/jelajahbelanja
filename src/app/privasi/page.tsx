import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Eye, Server, Cookie, UserCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan Privasi JelajahBelanja — bagaimana kami mengumpulkan, menggunakan, dan melindungi data pengunjung.",
  openGraph: {
    title: "Kebijakan Privasi — JelajahBelanja",
    description: "Informasi tentang bagaimana kami melindungi privasi pengunjung.",
  },
};

export default function PrivasiPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-header-gradient text-white">
        <div className="container mx-auto px-4 max-w-3xl py-8 md:py-12">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3">Kebijakan Privasi</h1>
          <p className="text-sm md:text-base text-white/80 max-w-xl">
            Komitmen kami untuk melindungi privasi dan data pengunjung JelajahBelanja.
          </p>
          <p className="text-xs text-white/50 mt-2">Terakhir diperbarui: 1 Juli 2025</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-8 space-y-8">
        {/* Intro */}
        <section className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <p>
            JelajahBelanja menghargai privasi setiap pengunjung. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi ketika Anda mengunjungi website kami. Dengan menggunakan JelajahBelanja, Anda menyetujui praktik yang dijelaskan dalam kebijakan ini. Jika Anda tidak setuju dengan kebijakan ini, mohon untuk tidak menggunakan website kami.
          </p>
          <p>
            Kami berkomitmen untuk menjaga transparansi tentang praktik data kami. Jika Anda memiliki pertanyaan setelah membaca kebijakan ini, silakan hubungi kami melalui halaman{" "}
            <Link href="/kontak" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">
              Kontak
            </Link>.
          </p>
        </section>

        {/* Sections */}
        {[
          {
            icon: <Eye className="w-5 h-5" />,
            title: "Informasi yang Kami Kumpulkan",
            content: [
              "JelajahBelanja dirancang untuk meminimalkan pengumpulan data. Kami tidak meminta registrasi, login, atau informasi pribadi untuk menggunakan website ini. Secara spesifik, berikut data yang mungkin kami kumpulkan secara otomatis:",
              "Informasi browser: Ketika Anda mengunjungi website kami, server kami secara otomatis mencatat alamat IP, jenis browser, sistem operasi, halaman yang dikunjungi, dan waktu kunjungan. Data ini digunakan semata-mata untuk keperluan teknis seperti keamanan dan analitik.",
              "Data klik: Kami mencatat klik pada link affiliate untuk mendeteksi dan mencegah penipuan (click fraud). Data ini mencakup alamat IP, waktu klik, dan produk yang diklik. Data ini tidak dikaitkan dengan identitas pribadi Anda dan hanya digunakan untuk keperluan keamanan.",
              "Kami tidak mengumpulkan nama, alamat email, nomor telepon, alamat pengiriman, atau informasi pembayaran. Transaksi pembelian dilakukan di marketplace (Shopee, Tokopedia, Lazada) dan tunduk pada kebijakan privasi masing-masing platform.",
            ],
          },
          {
            icon: <Server className="w-5 h-5" />,
            title: "Penggunaan Informasi",
            content: [
              "Informasi yang kami kumpulkan digunakan untuk tujuan berikut:",
              "Menjaga keamanan website dan mencegah penyalahgunaan, termasuk deteksi bot dan click fraud pada link affiliate.",
              "Menganalisis pola kunjungan untuk meningkatkan pengalaman pengguna dan kualitas kurasi produk.",
              "Memastikan website berfungsi dengan baik dan memperbaiki error teknis.",
              "Mematuhi kewajiban hukum yang berlaku di Indonesia.",
              "Kami tidak menggunakan data pengunjung untuk iklan yang ditargetkan, profiling, atau menjual data ke pihak ketiga.",
            ],
          },
          {
            icon: <Cookie className="w-5 h-5" />,
            title: "Cookies dan Teknologi Pelacakan",
            content: [
              "JelajahBelanja menggunakan cookies dalam jumlah minimal untuk keperluan berikut:",
              "Cookie preferensi tema (light/dark mode) — ini menyimpan pilihan tampilan Anda dan tidak mengandung data pribadi.",
              "Cookie sesi admin — digunakan hanya untuk autentikasi halaman administrasi dan tidak relevan untuk pengunjung umum.",
              "Kami tidak menggunakan tracking pixel dari jejaring sosial, fingerprinting browser, atau teknologi pelacakan invasif lainnya. Kami juga tidak menggunakan Google Analytics atau layanan analitik pihak ketiga yang melacak pengunjung lintas website.",
              "Anda dapat mengatur browser Anda untuk menolak semua cookies, meskipun ini mungkin mempengaruhi pengalaman penggunaan website.",
            ],
          },
          {
            icon: <Lock className="w-5 h-5" />,
            title: "Keamanan Data",
            content: [
              "Kami mengambil langkah-langkah teknis yang wajar untuk melindungi data yang kami kumpulkan, termasuk:",
              "Enkripsi HTTPS untuk semua komunikasi antara browser Anda dan server kami.",
              "Proteksi click fraud yang mendeteksi dan memblokir aktivitas mencurigakan.",
              "Pembatasan akses ke data hanya kepada personel yang berwenang.",
              "Namun, tidak ada metode transmisi data melalui internet yang 100% aman. Kami tidak dapat menjamin keamanan absolut, tetapi kami berkomitmen untuk terus meningkatkan langkah-langkah keamanan kami.",
            ],
          },
          {
            icon: <UserCheck className="w-5 h-5" />,
            title: "Hak Pengguna",
            content: [
              "Sebagai pengunjung JelajahBelanja, Anda memiliki hak untuk:",
              "Mengetahui data apa yang kami kumpulkan dan bagaimana penggunaannya (sebagaimana dijelaskan dalam kebijakan ini).",
              "Meminta kami untuk menghapus data log yang terkait dengan alamat IP Anda.",
              "Menolak penggunaan cookies melalui pengaturan browser Anda.",
              "Menghubungi kami jika Anda memiliki kekhawatiran tentang penanganan data Anda.",
              "Untuk mengajukan permintaan terkait data Anda, silakan kirim email ke hello@jelajahbelanja.com dengan subjek 'Permintaan Data'.",
            ],
          },
          {
            icon: <Shield className="w-5 h-5" />,
            title: "Link ke Pihak Ketiga",
            content: [
              "Website kami mengandung link ke marketplace pihak ketiga (Shopee, Tokopedia, Lazada, dll). Ketika Anda mengklik link ini, Anda akan meninggalkan JelajahBelanja dan diarahkan ke website marketplace tersebut. Kami tidak bertanggung jawab atas praktik privasi atau konten di website pihak ketiga. Kami menyarankan Anda untuk membaca kebijakan privasi setiap marketplace sebelum melakukan transaksi.",
              "Link affiliate di website kami disertai atribut rel='nofollow sponsored' yang menandakan bahwa link tersebut adalah link berbayar. Ini sesuai dengan pedoman mesin pencari dan regulasi FTC tentang transparansi affiliate.",
            ],
          },
          {
            icon: <Eye className="w-5 h-5" />,
            title: "Perubahan Kebijakan",
            content: [
              "Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Setiap perubahan akan dipublikasikan di halaman ini dengan tanggal 'Terakhir diperbarui' yang baru. Kami mendorong Anda untuk meninjau kebijakan ini secara berkala. Penggunaan berkelanjutan atas website setelah perubahan dianggap sebagai penerimaan Anda terhadap kebijakan yang diperbarui.",
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
            Punya pertanyaan tentang kebijakan privasi kami?
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
