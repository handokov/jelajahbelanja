/**
 * Blog Data — JelajahBelanja Articles
 *
 * Static blog articles sudah dipindah ke database (AI generated via Groq API).
 * File ini tetap ada untuk backward compatibility, tapi array kosong.
 * Semua artikel sekarang dikelola via DB + /api/blog-generate.
 */

export interface BlogArticle {
  slug: string;
  title: string;
  coverImage?: string | null;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  tags: string[];
  metaDescription: string;
  content: string;
}

// Array kosong — semua artikel sekarang dari database (AI generated)
export const blogArticles: BlogArticle[] = [];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return blogArticles.find(a => a.slug === slug);
}
