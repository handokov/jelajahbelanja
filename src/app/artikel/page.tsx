import type { Metadata } from "next";
import Link from "next/link";
import { blogArticles } from "@/lib/blog-data";
import { db } from "@/lib/db";
import { Clock, ArrowRight, BookOpen, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog & Artikel — Tips Belanja Online, Review Produk, Panduan Affiliate",
  description:
    "Artikel seputar tips belanja online aman, review produk viral, rahasia diskon Shopee, ide hadiah murah, dan panduan Shopee Affiliate untuk pemula.",
  keywords: [
    "tips belanja online",
    "review produk viral",
    "diskon shopee",
    "shopee affiliate",
    "hadiah murah",
    "belanja aman",
    "produk viral tiktok",
  ],
  openGraph: {
    title: "Blog JelajahBelanja — Tips & Panduan Belanja Online Indonesia",
    description:
      "Artikel seputar tips belanja online, review produk viral, dan panduan affiliate marketing di Indonesia.",
    type: "website",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Tips Belanja": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Review Produk": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Tips Hemat": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Ide Hadiah": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "Affiliate Guide": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
};

export default async function ArtikelPage() {
  // Fetch AI-generated articles from DB
  let dbArticles: Array<{
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    readTime: string;
    publishedAt: Date;
    tags: string;
  }> = [];
  try {
    dbArticles = await db.blogArticle.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, excerpt: true, category: true, readTime: true, publishedAt: true, tags: true },
    });
  } catch {
    // DB belum ready, skip
  }

  // Combine: DB articles + static articles
  const allArticles = [
    ...dbArticles.map(a => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      readTime: a.readTime,
      publishedAt: a.publishedAt.toISOString().slice(0, 10),
      tags: a.tags ? a.tags.split(",").map(t => t.trim()) : [],
    })),
    ...blogArticles.map(a => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      readTime: a.readTime,
      publishedAt: a.publishedAt,
      tags: a.tags,
    })),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-header-gradient text-white">
        <div className="container mx-auto px-4 max-w-4xl py-8 md:py-12">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5" />
            <span className="text-sm font-medium text-white/80">Blog & Artikel</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3 leading-tight">
            Tips, Panduan & Review
            <br />
            Belanja Online Indonesia
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-xl">
            Artikel pilihan seputar belanja online aman, review produk viral, rahasia diskon,
            dan panduan affiliate marketing.
          </p>
        </div>
      </div>

      {/* Article List */}
      <div className="container mx-auto px-4 max-w-4xl py-8 space-y-6">
        {allArticles.map((article) => (
          <Link
            key={article.slug}
            href={`/artikel/${article.slug}`}
            className="group block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden hover:shadow-lg hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-all duration-200"
          >
            <div className="p-5 md:p-6">
              {/* Category + Read Time */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    CATEGORY_COLORS[article.category] || "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  {article.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {article.readTime}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {new Date(article.publishedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
                {article.title}
              </h2>

              {/* Excerpt */}
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                {article.excerpt}
              </p>

              {/* Read More */}
              <div className="flex items-center gap-1 text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400 group-hover:gap-2 transition-all">
                Baca selengkapnya
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Back to Home */}
      <div className="container mx-auto px-4 max-w-4xl pb-12 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-fuchsia-500 transition-colors"
        >
          ← Kembali ke halaman utama
        </Link>
      </div>
    </div>
  );
}
