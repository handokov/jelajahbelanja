import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureCategoriesSeeded, DEFAULT_CATEGORIES } from "@/lib/seed";
import { checkAuth } from "@/lib/admin-auth";
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
  shopeeCat: string | null;
  tokopediaCat: string | null;
  lazadaCat: string | null;
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
    shopeeCat: c.shopeeCat,
    tokopediaCat: c.tokopediaCat,
    lazadaCat: c.lazadaCat,
    order: c.order,
    enabled: c.enabled,
  };
}

export async function GET(req: NextRequest) {
  try {
    await ensureCategoriesSeeded();

    // Cek auth — admin lihat semua, public hanya yang enabled
    const isAdmin = !(await checkAuth(req));
    const where = isAdmin ? {} : { enabled: true };

    const categories = await db.category.findMany({ where, orderBy: { order: "asc" } });
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

export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

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
        shopeeCat: body.shopeeCat?.trim() || null,
        tokopediaCat: body.tokopediaCat?.trim() || null,
        lazadaCat: body.lazadaCat?.trim() || null,
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

export async function PATCH(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    await ensureCategoriesSeeded();
    const body = await req.json();

    if (Array.isArray(body?.categories)) {
      const updates: UpdateCategoryInput[] = body.categories;
      const ops = updates.map((u) =>
        db.category.update({
          where: { id: u.id },
          data: {
            ...(u.name !== undefined ? { name: u.name } : {}),
            ...(u.emoji !== undefined ? { emoji: u.emoji } : {}),
            ...(u.keywords !== undefined ? { keywords: u.keywords } : {}),
            ...(u.amazonNode !== undefined ? { amazonNode: u.amazonNode } : {}),
            ...(u.aliexpressCat !== undefined ? { aliexpressCat: u.aliexpressCat } : {}),
            ...(u.shopeeCat !== undefined ? { shopeeCat: u.shopeeCat } : {}),
            ...(u.tokopediaCat !== undefined ? { tokopediaCat: u.tokopediaCat } : {}),
            ...(u.lazadaCat !== undefined ? { lazadaCat: u.lazadaCat } : {}),
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
        ...(input.shopeeCat !== undefined ? { shopeeCat: input.shopeeCat } : {}),
        ...(input.tokopediaCat !== undefined ? { tokopediaCat: input.tokopediaCat } : {}),
        ...(input.lazadaCat !== undefined ? { lazadaCat: input.lazadaCat } : {}),
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

export async function DELETE(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

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

export async function PUT(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    await db.category.deleteMany({});
    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c, i) => ({
        name: c.name,
        emoji: c.emoji,
        keywords: c.keywords,
        amazonNode: c.amazonNode,
        aliexpressCat: c.aliexpressCat,
        shopeeCat: c.shopeeCat,
        tokopediaCat: c.tokopediaCat,
        lazadaCat: c.lazadaCat,
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
