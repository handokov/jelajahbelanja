import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * GET /api/admin/blog
 * List semua artikel dengan filter/search/pagination.
 *
 * Query params:
 *   - q: search title/excerpt/tags
 *   - category: filter by category exact
 *   - status: "published" | "draft" | "all"
 *   - source: "ai" | "manual" | "all"
 *   - limit: default 50, max 200
 *   - offset: default 0
 */
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const category = url.searchParams.get("category")?.trim() || "";
    const status = url.searchParams.get("status") || "all";
    const source = url.searchParams.get("source") || "all";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

    // Build where clause
    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { tags: { contains: q, mode: "insensitive" } },
      ];
    }
    if (category) where.category = category;
    if (status === "published") where.isPublished = true;
    if (status === "draft") where.isPublished = false;
    if (source === "ai") where.isAiGenerated = true;
    if (source === "manual") where.isAiGenerated = false;

    const [articles, total, stats] = await Promise.all([
      db.blogArticle.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          slug: true,
          title: true,
          coverImage: true,
          excerpt: true,
          category: true,
          readTime: true,
          author: true,
          tags: true,
          metaDescription: true,
          isPublished: true,
          isAiGenerated: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          content: true, // include content for editing convenience (single fetch)
        },
      }),
      db.blogArticle.count({ where }),
      // Stats (total keseluruhan, ignore filter)
      db.blogArticle.groupBy({
        by: ["isPublished", "isAiGenerated"],
        _count: true,
      }),
    ]);

    const totalAll = stats.reduce((sum, s) => sum + s._count, 0);
    const publishedCount = stats.filter(s => s.isPublished).reduce((sum, s) => sum + s._count, 0);
    const draftCount = totalAll - publishedCount;
    const aiCount = stats.filter(s => s.isAiGenerated).reduce((sum, s) => sum + s._count, 0);
    const manualCount = totalAll - aiCount;

    // Distinct categories
    const categories = await db.blogArticle.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });

    return NextResponse.json({
      success: true,
      articles,
      total,
      stats: {
        total: totalAll,
        published: publishedCount,
        draft: draftCount,
        ai: aiCount,
        manual: manualCount,
      },
      categories: categories.map(c => c.category),
    });
  } catch (err: any) {
    console.error("[api/admin/blog] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/blog
 * Buat artikel baru MANUAL (bukan AI).
 * Body: { title, excerpt, category, content, tags, metaDescription, author, readTime, isPublished, slug? }
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const {
      title,
      excerpt,
      category = "Tips Belanja",
      content,
      coverImage,
      tags = "",
      metaDescription,
      author = "Tim JelajahBelanja",
      readTime,
      isPublished = true,
      slug: customSlug,
      publishedAt,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "title wajib diisi" }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "content wajib diisi" }, { status: 400 });
    }

    const slug = (customSlug?.trim() || slugify(title)).slice(0, 80);

    // Cek duplikat slug
    const existing = await db.blogArticle.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `Slug "${slug}" sudah dipakai oleh artikel lain. Gunakan judul/slug berbeda.` },
        { status: 409 }
      );
    }

    // Auto-compute readTime kalau tidak diisi
    const computedReadTime =
      readTime?.trim() ||
      `${Math.max(3, Math.ceil(content.split(/\s+/).length / 200))} menit`;

    const computedExcerpt = excerpt?.trim() || content.replace(/<[^>]+>/g, "").slice(0, 180) + "...";
    const computedMeta = metaDescription?.trim() || computedExcerpt.slice(0, 160);

    const article = await db.blogArticle.create({
      data: {
        slug,
        title: title.trim(),
        coverImage: typeof coverImage === "string" ? coverImage.trim() || null : null,
        excerpt: computedExcerpt,
        category,
        readTime: computedReadTime,
        author,
        tags,
        metaDescription: computedMeta,
        content,
        isPublished: !!isPublished,
        isAiGenerated: false,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      },
    });

    // Revalidate blog pages
    revalidatePath("/artikel");
    revalidatePath(`/artikel/${slug}`);
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Artikel berhasil dibuat",
      article: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        url: `/artikel/${article.slug}`,
      },
    });
  } catch (err: any) {
    console.error("[api/admin/blog] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
