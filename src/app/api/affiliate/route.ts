import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureAffiliateTagsSeeded } from "@/lib/seed";
import { invalidateAffiliateCache } from "@/lib/affiliate";
import { VALID_MARKETPLACES } from "@/lib/config";
import { checkAuth } from "@/lib/admin-auth";
import type { AffiliateTagDTO, UpdateAffiliateTagInput, Marketplace } from "@/lib/types";

function toDTO(row: {
  id: string;
  marketplace: string;
  tag: string;
  enabled: boolean;
}): AffiliateTagDTO {
  return {
    id: row.id,
    marketplace: row.marketplace as Marketplace,
    tag: row.tag,
    enabled: row.enabled,
  };
}

/**
 * GET /api/affiliate -> list semua tag affiliate (admin only)
 */
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    await ensureAffiliateTagsSeeded();
    const tags = await db.affiliateTag.findMany({
      orderBy: { marketplace: "asc" },
    });
    return NextResponse.json<{ tags: AffiliateTagDTO[] }>({
      tags: tags.map(toDTO),
    });
  } catch (err) {
    console.error("[api/affiliate GET] Error:", err);
    return NextResponse.json({ error: "Gagal memuat tag affiliate" }, { status: 500 });
  }
}

/**
 * PATCH /api/affiliate -> update tag untuk satu marketplace
 * Body: { marketplace, tag, enabled }
 */
export async function PATCH(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    await ensureAffiliateTagsSeeded();
    const body = (await req.json()) as UpdateAffiliateTagInput;
    if (!body.marketplace || !VALID_MARKETPLACES.includes(body.marketplace)) {
      return NextResponse.json(
        { error: "Marketplace tidak valid" },
        { status: 400 }
      );
    }

    // Upsert: kalau belum ada row, create; kalau ada, update
    const updated = await db.affiliateTag.upsert({
      where: { marketplace: body.marketplace },
      update: {
        tag: (body.tag ?? "").trim(),
        enabled: body.enabled ?? true,
      },
      create: {
        marketplace: body.marketplace,
        tag: (body.tag ?? "").trim(),
        enabled: body.enabled ?? true,
      },
    });

    invalidateAffiliateCache();
    return NextResponse.json<{ tag: AffiliateTagDTO }>({ tag: toDTO(updated) });
  } catch (err) {
    console.error("[api/affiliate PATCH] Error:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui tag affiliate" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/affiliate?reset=true -> reset semua tag (kosong + disabled)
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const reset = searchParams.get("reset") === "true";
    if (!reset) {
      return NextResponse.json({ error: "Gunakan ?reset=true" }, { status: 400 });
    }

    for (const m of VALID_MARKETPLACES) {
      await db.affiliateTag.upsert({
        where: { marketplace: m },
        update: { tag: "", enabled: false },
        create: { marketplace: m, tag: "", enabled: false },
      });
    }
    invalidateAffiliateCache();
    const tags = await db.affiliateTag.findMany();
    return NextResponse.json<{ tags: AffiliateTagDTO[] }>({
      tags: tags.map(toDTO),
    });
  } catch (err) {
    console.error("[api/affiliate POST] Error:", err);
    return NextResponse.json(
      { error: "Gagal reset tag affiliate" },
      { status: 500 }
    );
  }
}
