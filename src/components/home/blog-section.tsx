"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";

const BLOG_POSTS = [
  {
    slug: "cara-aman-belanja-online-shopee",
    title: "Cara Aman Belanja Online di Shopee",
    excerpt:
      "Panduan lengkap belanja aman — cek rating toko, bedakan produk original vs kw, dan hindari penipuan.",
    cat: "Tips Belanja",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    slug: "produk-viral-tiktok-worth-it",
    title: "10 Produk Viral TikTok yang Worth It",
    excerpt:
      "Review jujur produk viral yang beneran bagus — mana yang worth it dan mana yang cuma hype.",
    cat: "Review Produk",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  {
    slug: "rahasia-diskon-shopee-promo-cashback",
    title: "Rahasia Dapat Diskon Shopee",
    excerpt:
      "Voucher tersembunyi, jadwal flash sale, dan promo cashback yang sering terlewat pembeli.",
    cat: "Tips Hemat",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
];

/**
 * BlogSection — preview 3 artikel blog di homepage.
 */
export function BlogSection() {
  return (
    <section className="py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-fuchsia-500" />
            Artikel & Panduan
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Tips belanja, review produk, dan panduan affiliate
          </p>
        </div>
        <Link
          href="/artikel"
          className="text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400 hover:underline"
        >
          Lihat semua →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BLOG_POSTS.map((a) => (
          <Link
            key={a.slug}
            href={`/artikel/${a.slug}`}
            className="group p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 hover:shadow-md transition-all"
          >
            <span
              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${a.color}`}
            >
              {a.cat}
            </span>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1.5 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors line-clamp-2">
              {a.title}
            </h3>
            <p className="text-xs text-zinc-500 line-clamp-2">{a.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
