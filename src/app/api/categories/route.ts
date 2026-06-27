import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureCategoriesSeeded, DEFAULT_CATEGORIES } from "@/lib/seed";
import type {
  CategoryDTO,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/types";

function toDTO(c: {
  id: string;
  name: string;
  emoji: string;
  keywords: string;
  amazonNode: string | null;
  aliexpressCat: string | null;
  order: number;
  enabled: boolean;
}): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    keywords: c.keywords,
    amazonNode: c.amazonNode,
    aliexpressCat: c.aliexpressCat,
    order: c.order,
    enabled: c.enabled,
  };
}

/**
 * GET /api/categories -> list semua kategori urut by order
 */
export async function GET() {
  try {
    await ensureCategoriesSeeded();
    const categories = await db.category.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json<{ categories: CategoryDTO[] }>({
      categories: categories.map(toDTO),
    });
  } catch (err) {
    console.error("[api/categories GET] Error:", err);
    return NextResponse.json(
      { error: "Gagal memuat kategori" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories -> buat kategori baru
 */
export async function POST(req: NextRequest) {
  try {
    await ensureCategoriesSeeded();
    const body = (await req.json()) as CreateCategoryInput;

    if (!body.name || !body.emoji || !body.keywords) {
      return NextResponse.json(
        { error: "Nama, emoji, dan keywords wajib diisi" },
        { status: 400 }
      );
    }

    const maxOrder = await db.category.aggregate({ _max: { order: true } });
    const newOrder = (maxOrder._max.order ?? -1) + 1;

    const created = await db.category.create({
      data: {
        name: body.name.trim(),
        emoji: body.emoji.trim(),
        keywords: body.keywords.trim(),
        amazonNode: body.amazonNode?.trim() || null,
        aliexpressCat: body.aliexpressCat?.trim() || null,
        order: newOrder,
        enabled: body.enabled ?? true,
      },
    });

    return NextResponse.json<{ category: CategoryDTO }>({
      category: toDTO(created),
    });
  } catch (err) {
    console.error("[api/categories POST] Error:", err);
    return NextResponse.json(
      { error: "Gagal membuat kategori" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/categories -> update satu kategori (atau batch reorder)
 * Body: { categories: UpdateCategoryInput[] }  -> batch update
 *    atau { id, ...fields }  -> single update
 */
export async function PATCH(req: NextRequest) {
  try {
    await ensureCategoriesSeeded();
    const body = await req.json();

    // Batch reorder
    if (Array.isArray(body?.categories)) {
      const updates: UpdateCategoryInput[] = body.categories;
      // Update satu per satu (SQLite tidak mendukung bulk update dengan Prisma)
      const ops = updates.map((u) =>
        db.category.update({
          where: { id: u.id },
          data: {
            ...(u.name !== undefined ? { name: u.name } : {}),
            ...(u.emoji !== undefined ? { emoji: u.emoji } : {}),
            ...(u.keywords !== undefined ? { keywords: u.keywords } : {}),
            ...(u.amazonNode !== undefined ? { amazonNode: u.amazonNode } : {}),
            ...(u.aliexpressCat !== undefined ? { aliexpressCat: u.aliexpressCat } : {}),
            ...(u.order !== undefined ? { order: u.order } : {}),
            ...(u.enabled !== undefined ? { enabled: u.enabled } : {}),
          },
        })
      );
      await Promise.all(ops);
      const updated = await db.category.findMany({ orderBy: { order: "asc" } });
      return NextResponse.json<{ categories: CategoryDTO[] }>({
        categories: updated.map(toDTO),
      });
    }

    // Single update
    const input = body as UpdateCategoryInput;
    if (!input?.id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const updated = await db.category.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
        ...(input.keywords !== undefined ? { keywords: input.keywords } : {}),
        ...(input.amazonNode !== undefined ? { amazonNode: input.amazonNode } : {}),
        ...(input.aliexpressCat !== undefined ? { aliexpressCat: input.aliexpressCat } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      },
    });

    return NextResponse.json<{ category: CategoryDTO }>({
      category: toDTO(updated),
    });
  } catch (err) {
    console.error("[api/categories PATCH] Error:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui kategori" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories?id=<id> -> hapus kategori
 */
export async function DELETE(req: NextRequest) {
  try {
    await ensureCategoriesSeeded();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/categories DELETE] Error:", err);
    return NextResponse.json(
      { error: "Gagal menghapus kategori" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories?reset=true -> reset ke default
 */
export async function PUT() {
  try {
    // Hapus semua kategori dan buat ulang dari DEFAULT_CATEGORIES
    await db.category.deleteMany({});
    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c, i) => ({
        name: c.name,
        emoji: c.emoji,
        keywords: c.keywords,
        amazonNode: c.amazonNode,
        aliexpressCat: c.aliexpressCat,
        order: i,
        enabled: true,
      })),
    });
    const categories = await db.category.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json<{ categories: CategoryDTO[] }>({
      categories: categories.map(toDTO),
    });
  } catch (err) {
    console.error("[api/categories PUT] Error:", err);
    return NextResponse.json(
      { error: "Gagal reset kategori" },
      { status: 500 }
    );
  }
}
