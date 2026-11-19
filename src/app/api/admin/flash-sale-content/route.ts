import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/admin/flash-sale-content
 *
 * Generate konten siap copy-paste untuk posting ke grup FB/WhatsApp/Telegram.
 * Ambil produk dengan discountPercent >= 30% (atau originalPrice > price),
 * sort by diskon terbesar, ambil top 5-10.
 *
 * Query params:
 *   - limit: default 5, max 10
 *   - format: "facebook" (default) atau "whatsapp" atau "telegram"
 *
 * Return array of { product, content } — content = teks siap paste.
 */
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), 10);
    const format = url.searchParams.get("format") || "facebook";

    // Ambil produk flash sale (discount >= 30%)
    const products = await db.shopeeProduct.findMany({
      where: {
        isHidden: false,
        enabled: true,
        OR: [
          { discountPercent: { gte: 30 } },
          {
            discountPercent: null,
            originalPrice: { gt: 0 },
          },
        ],
      },
      orderBy: { discountPercent: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        price: true,
        originalPrice: true,
        discountPercent: true,
        rating: true,
        soldCount: true,
        marketplace: true,
        category: true,
        image: true,
      },
    });

    // Auto-calc discountPercent kalau null
    const withDiscount = products.map(p => {
      let disc = p.discountPercent;
      if (!disc && p.originalPrice && p.originalPrice > p.price) {
        disc = Math.round((1 - p.price / p.originalPrice) * 100);
      }
      return { ...p, discountPercent: disc || 0 };
    })
    .filter(p => p.discountPercent >= 30)
    .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
    .slice(0, limit);

    // Generate content per format
    const contents = withDiscount.map((p, i) => {
      const jbUrl = `https://jelajahbelanja.com/produk/${slugify(p.title)}-${p.id}`;
      const priceStr = `Rp${p.price.toLocaleString("id-ID")}`;
      const origStr = p.originalPrice ? `Rp${p.originalPrice.toLocaleString("id-ID")}` : "";
      const discStr = p.discountPercent ? `Diskon ${p.discountPercent}%` : "";
      const ratingStr = p.rating ? `Rating ${p.rating.toFixed(1)}` : "";
      const soldStr = p.soldCount > 0 ? `${formatSold(p.soldCount)} terjual` : "";

      let content = "";

      if (format === "whatsapp") {
        // WhatsApp: tanpa emoji berlebih, simple
        content = `*${i + 1}. ${p.title}*\n`;
        if (discStr) content += `${discStr}! `;
        content += `${priceStr}`;
        if (origStr) content += ` (was ${origStr})`;
        content += `\n`;
        if (ratingStr || soldStr) {
          content += `${[ratingStr, soldStr].filter(Boolean).join(" | ")}\n`;
        }
        content += `${jbUrl}\n`;
      } else if (format === "telegram") {
        // Telegram: support markdown
        content = `*${i + 1}. ${p.title}*\n`;
        if (discStr) content += `${discStr} `;
        content += `*${priceStr}*`;
        if (origStr) content += ` ~${origStr}~`;
        content += `\n`;
        if (ratingStr || soldStr) {
          content += `${[ratingStr, soldStr].filter(Boolean).join(" | ")}\n`;
        }
        content += `${jbUrl}\n`;
      } else {
        // Facebook default: dengan emoji, more engaging
        content = `${i + 1}. ${p.title}\n`;
        if (discStr) content += `${discStr} `;
        content += `${priceStr}`;
        if (origStr) content += ` (was ${origStr})`;
        content += `\n`;
        if (ratingStr || soldStr) {
          content += `${[ratingStr, soldStr].filter(Boolean).join(" | ")}\n`;
        }
        content += `${jbUrl}\n`;
      }

      return {
        product: {
          id: p.id,
          title: p.title,
          price: p.price,
          originalPrice: p.originalPrice,
          discountPercent: p.discountPercent,
          rating: p.rating,
          soldCount: p.soldCount,
          marketplace: p.marketplace,
          category: p.category,
          image: p.image,
          jbUrl,
        },
        content,
      };
    });

    // Generate batch content (semua produk dalam 1 post)
    let batchContent = "";
    if (format === "facebook") {
      batchContent = `FLASH SALE HARI INI!\n\n`;
      batchContent += `Kurasi ${contents.length} produk diskon terbesar dari JelajahBelanja:\n\n`;
      contents.forEach((c, i) => {
        batchContent += c.content + "\n";
      });
      batchContent += `\nKlik link di atas untuk beli. Stok terbatas!\n`;
      batchContent += `#flashsale #jelajahbelanja #diskonmurah`;
    } else if (format === "whatsapp") {
      batchContent = `*FLASH SALE HARI INI!*\n\n`;
      contents.forEach((c) => {
        batchContent += c.content + "\n";
      });
      batchContent += `\nKlik link untuk beli. Stok terbatas!`;
    } else {
      batchContent = `*FLASH SALE HARI INI!*\n\n`;
      contents.forEach((c) => {
        batchContent += c.content + "\n";
      });
      batchContent += `\nKlik link untuk beli. Stok terbatas!`;
    }

    return NextResponse.json({
      success: true,
      format,
      count: contents.length,
      items: contents,
      batchContent,
    });
  } catch (err: any) {
    console.error("[api/admin/flash-sale-content] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function formatSold(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}rb`;
  return String(count);
}
