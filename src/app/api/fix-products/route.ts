import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/fix-products
 * 
 * Admin-only endpoint untuk memperbaiki produk yang tidak muncul di dashboard:
 * 1. Enable semua produk yang disabled
 * 2. Unhide semua produk yang hidden
 * 3. Fix marketplace field yang salah (default "shopee" padahal URL-nya tokopedia/lazada/dll)
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const results = {
      enabled: 0,
      unhidden: 0,
      marketplaceFixed: 0,
      totalProcessed: 0,
    };

    // 1. Enable semua produk yang disabled
    // Also select marketplace supaya kita bisa revalidate path per-produk
    const disabledProducts = await db.shopeeProduct.findMany({
      where: { enabled: false },
      select: { id: true, marketplace: true },
    });
    
    if (disabledProducts.length > 0) {
      await db.shopeeProduct.updateMany({
        where: { enabled: false },
        data: { enabled: true },
      });
      results.enabled = disabledProducts.length;
    }

    // 2. Unhide semua produk yang hidden
    const hiddenProducts = await db.shopeeProduct.findMany({
      where: { isHidden: true },
      select: { id: true, marketplace: true },
    });
    
    if (hiddenProducts.length > 0) {
      await db.shopeeProduct.updateMany({
        where: { isHidden: true },
        data: { isHidden: false },
      });
      results.unhidden = hiddenProducts.length;
    }

    // 3. Fix marketplace — detect dari URL
    const { detectMarketplaceFromUrl } = await import("@/lib/utils");
    const validMarketplaces = ["shopee", "tokopedia", "lazada", "aliexpress", "amazon"];
    
    const allProducts = await db.shopeeProduct.findMany({
      select: { id: true, url: true, marketplace: true },
    });

    for (const p of allProducts) {
      const correctMarketplace = detectMarketplaceFromUrl(p.url);
      
      // Fix jika marketplace di DB salah atau tidak valid
      if (!validMarketplaces.includes(p.marketplace) || 
          (p.marketplace === "shopee" && correctMarketplace !== "shopee")) {
        await db.shopeeProduct.update({
          where: { id: p.id },
          data: { marketplace: correctMarketplace },
        });
        results.marketplaceFixed++;
      }
    }

    results.totalProcessed = allProducts.length;

    // Summary
    const totalVisible = await db.shopeeProduct.count({
      where: { enabled: true, isHidden: { not: true } },
    });
    const totalAll = await db.shopeeProduct.count();

    // ── Invalidasi ISR cache ──
    // Produk yang baru di-enable/unhide perlu cache-nya dibersihkan
    // supaya halaman produk langsung bisa diakses tanpa manual refresh
    if (results.enabled > 0 || results.unhidden > 0 || results.marketplaceFixed > 0) {
      try {
        // Revalidate homepage dan layout
        revalidatePath("/", "layout");
        
        // Revalidate setiap produk yang baru di-enable/unhide secara individual
        const productsToRevalidate = [...disabledProducts, ...hiddenProducts];
        for (const p of productsToRevalidate) {
          const mp = p.marketplace || "shopee";
          try {
            revalidatePath(`/produk/${mp}-${p.id}`);
          } catch {}
        }
        
        console.log(`[fix-products] ISR cache invalidated: ${productsToRevalidate.length} product pages + layout`);
      } catch (e) {
        console.warn("[fix-products] revalidatePath failed:", e);
      }
    }

    return NextResponse.json({
      ...results,
      summary: {
        totalProducts: totalAll,
        visibleOnDashboard: totalVisible,
        previouslyDisabled: results.enabled,
        previouslyHidden: results.unhidden,
        marketplaceFixed: results.marketplaceFixed,
      },
    });
  } catch (err) {
    console.error("[api/fix-products] Error:", err);
    return NextResponse.json(
      { error: "Gagal memperbaiki produk" },
      { status: 500 }
    );
  }
}
