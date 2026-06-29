import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMockProducts } from "@/lib/sources/mock";
import { buildAffiliateUrl, getAffiliateTags } from "@/lib/affiliate";
import type { Product, Marketplace } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Mapping kategori pelengkap — kalau user lihat sepatu,
 * rekomendasikan celana, kaos, hoodie, dll.
 *
 * Key: kategori yang sedang dilihat
 * Value: array kategori pelengkap yang cocok dipadukan
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
 * Misal: sepatu → celana + kaos + hoodie
 */
const PRODUCT_KEYWORD_COMPLEMENTS: Record<string, string[]> = {
  // Fashion items → outfit building blocks
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
  // Beauty → complementary beauty
  serum: ["sunscreen", "moisturizer", "masker", "lip"],
  sunscreen: ["serum", "moisturizer", "lip"],
  lipstick: ["serum", "foundation", "masker"],
  foundation: ["serum", "sunscreen", "lip"],
  parfum: ["serum", "body", "lip"],
  masker: ["serum", "sunscreen", "lip"],
  // Electronics → accessories
  earbuds: ["charger", "powerbank", "speaker"],
  speaker: ["earbuds", "charger", "ring"],
  powerbank: ["charger", "earbuds", "cable"],
  smartwatch: ["earbuds", "charger", "strap"],
  keyboard: ["mouse", "mousepad", "headset"],
  mouse: ["keyboard", "mousepad", "headset"],
  headset: ["keyboard", "mouse", "mousepad"],
  charger: ["powerbank", "cable", "earbuds"],
  // Home → complementary
  lampu: ["diffuser", "karpet", "gorden"],
  diffuser: ["lampu", "karpet", "rak"],
  vacuum: ["lampu", "rak", "dispenser"],
  airfryer: ["juicer", "perkakas", "rak"],
  // Sports → gear
  dumbbell: ["yoga", "sepatu", "kaos"],
  yoga: ["dumbbell", "mat", "kaos"],
  skipping: ["dumbbell", "kaos", "sepatu"],
};

/**
 * POST /api/recommendations
 *
 * Return produk pelengkap berdasarkan produk yang sedang dilihat.
 * Filter berdasarkan:
 * 1. Kategori pelengkap (fashion → fashion, beauty, dll)
 * 2. Range harga (±50% dari harga produk asli)
 * 3. Keyword matching (sepatu → celana, kaos, hoodie)
 * 4. Prioritas viral/flash sale
 *
 * Body: { product: Product, limit?: number }
 * Response: { recommendations: Product[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = body.product as Product;
    const limit = body.limit || 4;

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

    // Generate mock products dari kategori pelengkap
    const allCandidates: Product[] = [];

    for (const cat of complementaryCats) {
      const catName =
        cat.charAt(0).toUpperCase() + cat.slice(1);
      const mockProducts = generateMockProducts(cat, catName, 10);
      allCandidates.push(...mockProducts);
    }

    // Filter & score candidates
    const tags = await getAffiliateTags();

    const scored = allCandidates
      // Exclude product yang sama
      .filter((p) => p.id !== product.id)
      // Filter harga range
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

    return NextResponse.json({ recommendations: scored });
  } catch (err) {
    console.error("[api/recommendations] Error:", err);
    return NextResponse.json(
      { error: "Gagal memuat rekomendasi" },
      { status: 500 }
    );
  }
}
