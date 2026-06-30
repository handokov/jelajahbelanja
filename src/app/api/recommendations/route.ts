import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAffiliateUrl, getAffiliateTags } from "@/lib/affiliate";
import { dbRowToProduct } from "@/lib/product-mapper";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Mapping kategori pelengkap — kalau user lihat sepatu,
 * rekomendasikan celana, kaos, hoodie, dll.
 */
const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  fashion: ["fashion", "beauty"],
  beauty: ["beauty", "fashion"],
  elektronik: ["elektronik", "gaming"],
  gaming: ["gaming", "elektronik"],
  home: ["home", "beauty"],
  olahraga: ["olahraga", "fashion"],
  mainan: ["mainan", "elektronik"],
  otomotif: ["otomotif", "elektronik"],
};

/**
 * Mapping keyword produk → kategori pelengkap yang lebih spesifik.
 */
const PRODUCT_KEYWORD_COMPLEMENTS: Record<string, string[]> = {
  sepatu: ["celana", "kaos", "hoodie", "sneaker", "jeans"],
  sneakers: ["celana", "kaos", "hoodie", "jogger"],
  kaos: ["celana", "sepatu", "sneaker", "hoodie"],
  hoodie: ["celana", "sepatu", "sneaker", "kaos"],
  celana: ["sepatu", "kaos", "hoodie", "sneaker"],
  jeans: ["sepatu", "kaos", "hoodie", "sneaker"],
  dress: ["sepatu", "tas", "aksesoris"],
  tas: ["sepatu", "kaos", "dress"],
  jam: ["sepatu", "celana", "kaos"],
  kacamata: ["sepatu", "kaos", "celana"],
  sandal: ["celana", "kaos", "short"],
  topi: ["kaos", "celana", "sepatu"],
  serum: ["sunscreen", "moisturizer", "masker", "lip"],
  sunscreen: ["serum", "moisturizer", "lip"],
  lipstick: ["serum", "foundation", "masker"],
  foundation: ["serum", "sunscreen", "lip"],
  parfum: ["serum", "body", "lip"],
  masker: ["serum", "sunscreen", "lip"],
  earbuds: ["charger", "powerbank", "speaker"],
  speaker: ["earbuds", "charger", "ring"],
  powerbank: ["charger", "earbuds", "cable"],
  smartwatch: ["earbuds", "charger", "strap"],
  keyboard: ["mouse", "mousepad", "headset"],
  mouse: ["keyboard", "mousepad", "headset"],
  headset: ["keyboard", "mouse", "mousepad"],
  charger: ["powerbank", "cable", "earbuds"],
  lampu: ["diffuser", "karpet", "gorden"],
  diffuser: ["lampu", "karpet", "rak"],
  vacuum: ["lampu", "rak", "dispenser"],
  airfryer: ["juicer", "perkakas", "rak"],
  dumbbell: ["yoga", "sepatu", "kaos"],
  yoga: ["dumbbell", "mat", "kaos"],
  skipping: ["dumbbell", "kaos", "sepatu"],
};

/**
 * Helper: convert DB product to Product type.
 * Pakai dbRowToProduct dari product-mapper agar viralScore konsisten.
 * Tambahkan prefix "shopee-" ke id untuk kompatibilitas frontend.
 */
function toProductWithPrefix(p: any): Product {
  const product = dbRowToProduct(p);
  return { ...product, id: `shopee-${product.id}` };
}

/**
 * POST /api/recommendations
 *
 * Return produk pelengkap dari DATABASE berdasarkan produk yang sedang dilihat.
 * Tidak lagi pakai mock data — hanya produk asli yang di-upload admin.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = body.product as Product;
    const limit = body.limit || 6;

    if (!product?.title || !product?.category) {
      return NextResponse.json(
        { error: "Product with title and category is required" },
        { status: 400 }
      );
    }

    // Harga range: ±60% dari produk asli
    const priceMin = Math.max(0, Math.round(product.price * 0.4));
    const priceMax = Math.round(product.price * 1.6);

    // Tentukan kategori pelengkap
    const categorySlug = (product.categorySlug || product.category).toLowerCase();
    const complementaryCats = COMPLEMENTARY_CATEGORIES[categorySlug] || [
      categorySlug,
    ];

    // Tentukan keyword pelengkap berdasarkan judul produk
    const titleLower = product.title.toLowerCase();
    const matchedKeywords: string[] = [];
    for (const [keyword, complements] of Object.entries(
      PRODUCT_KEYWORD_COMPLEMENTS
    )) {
      if (titleLower.includes(keyword)) {
        matchedKeywords.push(...complements);
      }
    }
    const uniqueKeywords = [...new Set(matchedKeywords)];

    // Strip "shopee-" prefix dari product ID untuk DB query
    const dbProductId = product.id.startsWith("shopee-")
      ? product.id.replace("shopee-", "")
      : product.id;

    // Query produk asli dari database — kategori pelengkap + isHidden bukan true
    const dbProducts = await db.shopeeProduct.findMany({
      where: {
        category: { in: complementaryCats.map(c => c.charAt(0).toUpperCase() + c.slice(1)) },
        isHidden: { not: true },
        enabled: true,
        id: { not: dbProductId },
      },
      orderBy: [
        { isViral: "desc" },
        { soldCount: "desc" },
      ],
      take: 50,
    });

    // Jika produk di kategori pelengkap kurang dari limit, tambah dari semua kategori
    let allProducts = [...dbProducts];
    if (allProducts.length < limit) {
      const extraProducts = await db.shopeeProduct.findMany({
        where: {
          isHidden: { not: true },
          enabled: true,
          id: {
            not: dbProductId,
            notIn: allProducts.map(p => p.id),
          },
        },
        orderBy: [
          { isViral: "desc" },
          { soldCount: "desc" },
        ],
        take: limit - allProducts.length,
      });
      allProducts.push(...extraProducts);
    }

    // Convert ke Product type
    const allCandidates = allProducts.map(toProductWithPrefix);

    // Filter & score candidates
    const tags = await getAffiliateTags();

    const scored = allCandidates
      // Filter harga range (longgar)
      .filter((p) => p.price >= priceMin && p.price <= priceMax)
      // Score berdasarkan relevansi
      .map((p) => {
        let score = 0;

        // Keyword match — prioritas tinggi
        const pTitleLower = p.title.toLowerCase();
        for (const kw of uniqueKeywords) {
          if (pTitleLower.includes(kw)) score += 50;
        }

        // Viral products — prioritas
        if (p.isViral) score += 30;

        // Flash sale (diskon > 40%) — prioritas
        if ((p.discountPercent || 0) > 40) score += 20;

        // High rating
        if (p.rating >= 4.8) score += 10;

        // Best seller
        if (p.soldCount > 10000) score += 10;

        // Different marketplace from original — more variety
        if (p.marketplace !== product.marketplace) score += 5;

        return { ...p, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      // Inject affiliate URL
      .map(({ _score, ...p }) => ({
        ...p,
        affiliateUrl: buildAffiliateUrl(p.url, p.marketplace, tags) || p.url,
      }));

    // Jika setelah filter harga gak ada yang cocok, fallback ke semua produk tanpa filter harga
    if (scored.length === 0 && allCandidates.length > 0) {
      const fallback = allCandidates
        .slice(0, limit)
        .map((p) => ({
          ...p,
          affiliateUrl: buildAffiliateUrl(p.url, p.marketplace, tags) || p.url,
        }));
      return NextResponse.json({ recommendations: fallback });
    }

    return NextResponse.json({ recommendations: scored });
  } catch (err) {
    console.error("[api/recommendations] Error:", err);
    return NextResponse.json(
      { error: "Gagal memuat rekomendasi" },
      { status: 500 }
    );
  }
}
