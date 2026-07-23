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
 * GET /api/admin/blog/[id]
 * Ambil 1 artikel lengkap untuk editing.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const article = await db.blogArticle.findUnique({ where: { id } });
    if (!article) {
      return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, article });
  } catch (err: any) {
    console.error("[api/admin/blog/[id]] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/blog/[id]
 * Update artikel. Field yang tidak dikirim tidak akan diubah.
 *
 * Body partial:
 *   { title, excerpt, category, content, tags, metaDescription, author, readTime, isPublished, slug, publishedAt }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.blogArticle.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
    }

    // Build update data (hanya field yang dikirim)
    const updateData: any = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json({ error: "title tidak boleh kosong" }, { status: 400 });
      }
      updateData.title = body.title.trim();
    }

    if (body.slug !== undefined) {
      const newSlug = (body.slug.trim() || slugify(body.title || existing.title)).slice(0, 80);
      if (newSlug !== existing.slug) {
        const slugConflict = await db.blogArticle.findUnique({ where: { slug: newSlug } });
        if (slugConflict && slugConflict.id !== id) {
          return NextResponse.json(
            { error: `Slug "${newSlug}" sudah dipakai artikel lain.` },
            { status: 409 }
          );
        }
        updateData.slug = newSlug;
      }
    }
    // Kalau title berubah tapi slug tidak di-spec, auto-update slug dari title baru
    else if (body.title !== undefined && body.title.trim() !== existing.title) {
      const newSlug = slugify(body.title).slice(0, 80);
      if (newSlug !== existing.slug) {
        const slugConflict = await db.blogArticle.findUnique({ where: { slug: newSlug } });
        if (slugConflict && slugConflict.id !== id) {
          // Tidak force update slug, biarkan slug lama
        } else {
          updateData.slug = newSlug;
        }
      }
    }

    if (body.content !== undefined) {
      if (!body.content.trim()) {
        return NextResponse.json({ error: "content tidak boleh kosong" }, { status: 400 });
      }
      updateData.content = body.content;
    }

    if (body.excerpt !== undefined) updateData.excerpt = body.excerpt.trim();
    if (body.coverImage !== undefined) {
      updateData.coverImage = typeof body.coverImage === "string" ? body.coverImage.trim() || null : null;
    }
    if (body.category !== undefined) updateData.category = body.category;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription.trim();
    if (body.author !== undefined) updateData.author = body.author;
    if (body.readTime !== undefined) updateData.readTime = body.readTime;
    if (body.isPublished !== undefined) updateData.isPublished = !!body.isPublished;
    if (body.publishedAt !== undefined) {
      updateData.publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();
    }

    // Auto-compute readTime kalau content berubah tapi readTime tidak
    if (updateData.content && body.readTime === undefined) {
      updateData.readTime = `${Math.max(3, Math.ceil(updateData.content.split(/\s+/).length / 200))} menit`;
    }

    const updated = await db.blogArticle.update({
      where: { id },
      data: updateData,
    });

    // Revalidate blog pages (slug lama & baru)
    revalidatePath("/artikel");
    revalidatePath(`/artikel/${existing.slug}`);
    if (updateData.slug && updateData.slug !== existing.slug) {
      revalidatePath(`/artikel/${updateData.slug}`);
    }
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Artikel berhasil diupdate",
      article: {
        id: updated.id,
        slug: updated.slug,
        title: updated.title,
        url: `/artikel/${updated.slug}`,
      },
    });
  } catch (err: any) {
    console.error("[api/admin/blog/[id]] PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/blog/[id]
 * Hapus artikel permanen.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const existing = await db.blogArticle.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
    }

    await db.blogArticle.delete({ where: { id } });

    revalidatePath("/artikel");
    revalidatePath(`/artikel/${existing.slug}`);
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Artikel berhasil dihapus",
      slug: existing.slug,
    });
  } catch (err: any) {
    console.error("[api/admin/blog/[id]] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
