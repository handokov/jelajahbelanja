/**
 * SEOSection — konten SEO untuk bantu Google index.
 * Dipisahkan dari UI logic biar gampang di-update.
 */
export function SEOSection() {
  return (
    <section className="mb-8 prose prose-sm dark:prose-invert max-w-none">
      <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Produk Anak Terkurasi — Fashion, Sekolah & Perlengkapan Bayi
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        JelajahBelanja adalah platform kurasi produk anak Indonesia yang
        mengumpulkan best seller untuk si kecil dari marketplace seperti Shopee
        dan Tokopedia. Kami memilih produk dengan rating tinggi (≥ 4.8 bintang)
        dan jumlah terjual ribuan, sehingga kamu bisa cepat menemukan{" "}
        <strong>jepit rambut anak Korea</strong>,{" "}
        <strong>kaos kaki sekolah SD</strong>,{" "}
        <strong>tas ransel anak</strong>,{" "}
        <strong>tumbler anti tumpah</strong>,{" "}
        <strong>dress anak perempuan</strong>,{" "}
        <strong>mainan edukatif</strong>, dan{" "}
        <strong>perlengkapan sekolah</strong> lainnya. Setiap produk dilengkapi
        info rating, jumlah terjual, lokasi seller, dan harga termurah dengan
        diskon terbesar. Update setiap hari, jadi kamu tidak ketinggalan produk
        anak terbaik untuk si kecil.
      </p>
    </section>
  );
}
