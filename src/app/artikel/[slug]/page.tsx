import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogArticles, getArticleBySlug, getAllArticleSlugs } from "@/lib/blog-data";
import { Clock, ArrowLeft, Tag } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  "Tips Belanja": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Review Produk": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Tips Hemat": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Ide Hadiah": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "Affiliate Guide": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Artikel Tidak Ditemukan" };

  return {
    title: article.title,
    description: article.metaDescription,
    keywords: article.tags,
    openGraph: {
      title: article.title,
      description: article.metaDescription,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      tags: article.tags,
    },
  };
}

export default async function ArtikelDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  // Find related articles (same category, excluding current)
  const relatedArticles = blogArticles
    .filter((a) => a.category === article.category && a.slug !== article.slug)
    .slice(0, 3);

  // JSON-LD Article
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: article.author,
      url: "https://jelajahbelanja.com",
    },
    publisher: {
      "@type": "Organization",
      name: "JelajahBelanja",
      url: "https://jelajahbelanja.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://jelajahbelanja.com/artikel/${article.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* Header */}
      <div className="bg-header-gradient text-white">
        <div className="container mx-auto px-4 max-w-3xl py-6 md:py-10">
          <Link
            href="/artikel"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Semua Artikel
          </Link>

          {/* Category + Meta */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                CATEGORY_COLORS[article.category] || "bg-zinc-100 text-zinc-600"
              }`}
            >
              <Tag className="w-3 h-3" />
              {article.category}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-white/60">
              <Clock className="w-3 h-3" />
              {article.readTime}
            </span>
            <span className="text-[11px] text-white/60">
              {new Date(article.publishedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl md:text-3xl font-extrabold leading-tight mb-3">
            {article.title}
          </h1>

          {/* Author */}
          <p className="text-sm text-white/60">Oleh {article.author}</p>
        </div>
      </div>

      {/* Article Content */}
      <article className="container mx-auto px-4 max-w-3xl py-8">
        <div
          className="prose prose-zinc dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-lg md:prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-p:leading-relaxed
            prose-li:text-zinc-700 dark:prose-li:text-zinc-300
            prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100
            prose-a:text-fuchsia-600 dark:prose-a:text-fuchsia-400 prose-a:no-underline hover:prose-a:underline
            prose-ul:my-3 prose-ol:my-3
            prose-li:my-0.5"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Tags */}
        <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* CTA to Home */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20 border border-fuchsia-200 dark:border-fuchsia-800/50 p-5 text-center">
          <p className="text-sm font-semibold text-fuchsia-900 dark:text-fuchsia-100 mb-2">
            Cari produk viral & best seller?
          </p>
          <p className="text-xs text-fuchsia-700 dark:text-fuchsia-300 mb-3">
            Temukan produk terbaik dari Shopee, Tokopedia, dan Lazada di JelajahBelanja.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-fuchsia-600 text-white px-5 py-2.5 rounded-xl hover:bg-fuchsia-700 transition-colors"
          >
            Jelajah Produk Sekarang
          </Link>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Artikel Terkait
            </h3>
            <div className="space-y-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/artikel/${related.slug}`}
                  className="block p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 bg-white dark:bg-zinc-950 transition-colors"
                >
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${
                      CATEGORY_COLORS[related.category] || "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {related.category}
                  </span>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {related.title}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{related.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Back to Blog */}
      <div className="container mx-auto px-4 max-w-3xl pb-12 text-center">
        <Link
          href="/artikel"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-fuchsia-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke semua artikel
        </Link>
      </div>
    </div>
  );
}
