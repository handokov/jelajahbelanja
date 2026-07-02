/**
 * SEOSection — konten SEO untuk bantu Google index.
 * Dipisahkan dari UI logic biar gampang di-update.
 */
export function SEOSection() {
  return (
    <section className="mb-8 prose prose-sm dark:prose-invert max-w-none">
      <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Produk Viral Shopee, Tokopedia & Lazada Terlengkap
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        JelajahBelanja adalah platform agregator produk viral Indonesia yang
        mengumpulkan ribuan best seller dari marketplace lokal seperti Shopee,
        Tokopedia, dan Lazada. Kami memantau produk yang sedang trending di
        TikTok dan media sosial, lalu menampilkannya dengan filter viralitas
        sehingga kamu bisa cepat menemukan{" "}
        <strong>produk viral 24 jam terakhir</strong>,{" "}
        <strong>best seller mingguan</strong>, atau produk{" "}
        <strong>terbaru</strong> dari berbagai kategori. Setiap produk dilengkapi
        info rating, jumlah terjual, lokasi seller, dan harga termurah dengan
        diskon terbesar. Update setiap hari, jadi kamu tidak ketinggalan tren
        belanja online terbaru.
      </p>
    </section>
  );
}
