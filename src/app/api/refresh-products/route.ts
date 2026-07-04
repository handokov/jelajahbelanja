import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
// maxDuration: Vercel Hobby = 10s, Pro = 60s. Set 10 supaya kompatibel Hobby plan.
export const maxDuration = 10;

// ─── Konfigurasi ───────────────────────────────────────────────────
const BATCH_LIMIT = 2; // max 2 produk per request (ZAI page_reader butuh waktu ~5s per produk)
const DELAY_MS = 500; // jeda 0.5 detik antar request
const STALE_HOURS = 24; // produk yang lastScrapedAt > 24 jam dianggap basi
const SHOPEE_API_TIMEOUT = 5000; // 5 detik timeout per Shopee API call

// ─── Helper: extract shopid & itemid dari URL ────────────────────────
function extractIds(url: string): { shopId: number; itemId: number } | null {
  // Format 1: https://shopee.co.id/product-name-i.12345.67890
  let match = url.match(/-i\.(\d+)\.(\d+)/);
  if (match) {
    return { shopId: parseInt(match[1], 10), itemId: parseInt(match[2], 10) };
  }
  // Format 2: https://shopee.co.id/product/12345/67890
  match = url.match(/shopee\.co\.id\/product\/(\d+)\/(\d+)/);
  if (match) {
    return { shopId: parseInt(match[1], 10), itemId: parseInt(match[2], 10) };
  }
  // Format 3: query params ?shopid=12345&itemid=67890
  try {
    const u = new URL(url);
    const shopId = u.searchParams.get("shopid");
    const itemId = u.searchParams.get("itemid");
    if (shopId && itemId) {
      return { shopId: parseInt(shopId, 10), itemId: parseInt(itemId, 10) };
    }
  } catch {}
  return null;
}

// ─── Helper: resolve shope.ee short URL ──────────────────────────────
async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  try {
    const res = await fetch(shortUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
      signal: AbortSignal.timeout(10000),
    });
    return res.url || null;
  } catch {
    return null;
  }
}

// ─── Strategy 1: Shopee API v4 ────────────────────────────────────
async function fetchShopeeApi(
  shopId: number,
  itemId: number
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  const apiUrl = `https://shopee.co.id/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "id-ID,id;q=0.9",
        "X-Shopee-Language": "id",
        "X-API-SOURCE": "pc",
        Referer: "https://shopee.co.id/",
        "af-ac-enc-dat": "null",
        Cookie: "SPC_EC=",
      },
      signal: AbortSignal.timeout(SHOPEE_API_TIMEOUT),
    });

    if (!res.ok) {
      return { data: null, error: `Shopee API HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.error) {
      return { data: null, error: `Shopee API error code ${data.error}` };
    }
    if (!data.data) {
      return { data: null, error: "Shopee API: data kosong" };
    }

    return { data: data.data };
  } catch (err: any) {
    return { data: null, error: err.name === "TimeoutError" ? "Shopee API timeout" : "Shopee API gagal" };
  }
}

// ─── Strategy 2: HTML meta tag scraping ───────────────────────────
async function scrapeFromHtml(
  url: string
): Promise<Partial<{ title: string; image: string; price: number }> | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "id-ID,id;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = await res.text();
    const result: Partial<{ title: string; image: string; price: number }> = {};

    // JSON-LD
    const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const block of jsonLdMatch) {
        try {
          const inner = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          if (inner) {
            const parsed = JSON.parse(inner[1]);
            if (parsed["@type"] === "Product" || parsed.name) {
              if (parsed.name && !result.title) result.title = decodeHTMLEntities(String(parsed.name));
              if (parsed.image && !result.image) {
                result.image = typeof parsed.image === "string" ? parsed.image : Array.isArray(parsed.image) ? parsed.image[0] : "";
              }
              if (parsed.offers?.price && !result.price) result.price = parsePrice(parsed.offers.price);
            }
          }
        } catch {}
      }
    }

    // og:title
    if (!result.title) {
      const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/);
      if (titleMatch) result.title = decodeHTMLEntities(titleMatch[1]);
    }

    // og:image
    if (!result.image) {
      const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/);
      if (imgMatch) result.image = imgMatch[1];
    }

    // product:price:amount
    if (!result.price) {
      const priceMatch = html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([\d.]+)["']/);
      if (priceMatch) result.price = parseFloat(priceMatch[1]);
    }

    // Clean up title
    if (result.title) {
      result.title = result.title
        .replace(/\s*[-|–]\s*Shopee\s*Indonesia\s*/gi, "")
        .replace(/\s*[-|–]\s*Shopee\s*/gi, "")
        .trim();
    }

    if (!result.title && !result.image && !result.price) return null;

    return result;
  } catch {
    return null;
  }
}

// ─── Strategy 3: ZAI page_reader + AI extraction ─────────────────
// Ini yang paling reliable — bisa melewati anti-bot Shopee
async function scrapeWithZAI(
  url: string
): Promise<Partial<{ title: string; image: string; price: number; originalPrice: number; rating: number; reviewCount: number; soldCount: number; location: string; category: string }> | null> {
  try {
    const zai = await ZAI.create();
    const pageResult = await zai.functions.invoke("page_reader", { url });
    const pageHtml = pageResult?.data?.html || "";

    if (pageHtml.length < 100) return null;

    // Gunakan ZAI LLM untuk extract data dari HTML
    const prompt = `Kamu adalah extractor data produk Shopee Indonesia. Dari konten halaman Shopee berikut, extract info produk dan kembalikan HANYA JSON object dengan field ini:
- title: nama produk (string)
- image: URL foto produk utama (string)
- price: harga dalam Rupiah, angka saja tanpa titik/koma (number)
- originalPrice: harga asli sebelum diskon, angka saja, atau null (number|null)
- rating: rating 0-5 (number)
- reviewCount: jumlah review (number)
- soldCount: jumlah terjual (number)
- location: kota seller (string atau null)
- category: salah satu dari Fashion, Kecantikan, Elektronik, Rumah Tangga, Olahraga, Otomotif, Makanan, Kesehatan, Buku, Mainan (string)

PENTING: Shopee adalah SPA (Single Page Application) jadi HTML mungkin tidak berisi data produk langsung. Cari data di:
1. Script tags yang berisi JSON data (window.__INITIAL_STATE__, __NEXT_DATA__, dsb)
2. Meta tags (og:title, og:image, product:price:amount)
3. URL pattern (nama produk di URL)
4. Teks yang mengandung nama produk, harga, rating

Jika data tidak ditemukan sama sekali, isi null. JANGAN tambahkan teks lain selain JSON.

Konten halaman:
${pageHtml.substring(0, 20000)}`;

    const response = await zai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const result: any = {};
    if (parsed.title) result.title = String(parsed.title);
    if (parsed.image) result.image = String(parsed.image);
    if (parsed.price) result.price = Number(parsed.price);
    if (parsed.originalPrice) result.originalPrice = Number(parsed.originalPrice);
    if (parsed.rating) result.rating = Number(parsed.rating);
    if (parsed.reviewCount) result.reviewCount = Number(parsed.reviewCount);
    if (parsed.soldCount) result.soldCount = Number(parsed.soldCount);
    if (parsed.location) result.location = String(parsed.location);
    if (parsed.category) result.category = String(parsed.category);

    if (!result.title && !result.image && !result.price) return null;

    return result;
  } catch (err) {
    console.error("[refresh-products] ZAI page_reader failed:", err);
    return null;
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parsePrice(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).replace(/[^\d]/g, "");
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

// ─── Helper: map Shopee category ID ─────────────────────────────────
function mapCategoryId(catId: string): string {
  const catMap: Record<string, string> = {
    "16": "Elektronik", "42": "Elektronik", "75": "Elektronik",
    "76": "Elektronik", "77": "Elektronik", "78": "Elektronik",
    "79": "Elektronik", "80": "Elektronik", "81": "Elektronik",
    "17": "Fashion", "18": "Fashion", "24": "Fashion",
    "25": "Fashion", "26": "Fashion", "27": "Fashion",
    "28": "Fashion", "29": "Fashion", "30": "Fashion",
    "31": "Fashion", "32": "Fashion", "33": "Fashion",
    "34": "Fashion", "35": "Fashion", "36": "Fashion",
    "37": "Fashion", "38": "Fashion", "39": "Fashion",
    "40": "Fashion", "41": "Fashion",
    "43": "Kecantikan", "44": "Kecantikan", "45": "Kecantikan",
    "46": "Kecantikan", "47": "Kecantikan", "48": "Kecantikan",
    "49": "Kecantikan", "50": "Kecantikan",
    "51": "Rumah Tangga", "52": "Rumah Tangga", "53": "Rumah Tangga",
    "54": "Rumah Tangga", "55": "Rumah Tangga", "56": "Rumah Tangga",
    "57": "Rumah Tangga",
    "58": "Olahraga", "59": "Olahraga", "60": "Olahraga",
    "61": "Olahraga", "62": "Olahraga",
    "63": "Otomotif", "64": "Otomotif", "65": "Otomotif",
    "66": "Otomotif", "67": "Otomotif",
    "68": "Makanan", "69": "Makanan", "70": "Makanan",
    "71": "Makanan", "72": "Makanan",
    "82": "Kesehatan", "83": "Kesehatan", "84": "Kesehatan",
    "85": "Kesehatan", "86": "Kesehatan",
    "87": "Buku", "88": "Buku", "89": "Buku",
    "90": "Buku", "91": "Buku",
    "92": "Mainan", "93": "Mainan", "94": "Mainan",
    "95": "Mainan",
  };
  return catMap[catId] || "Fashion";
}

// ─── Helper: delay ──────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Refresh satu produk (3-strategy fallback) ─────────────────────
async function refreshOneProduct(
  productId: string,
  productUrl: string
): Promise<{ id: string; status: "ok" | "skip" | "fail"; reason?: string }> {
  let ids = extractIds(productUrl);
  let resolvedUrl: string | null = null;

  // Resolve short URL (shope.ee, atid.me, s.shopee.co.id)
  if (!ids && (productUrl.includes("shope.ee") || productUrl.includes("atid.me") || productUrl.includes("s.shopee.co.id"))) {
    resolvedUrl = await resolveShortUrl(productUrl);
    if (resolvedUrl) {
      ids = extractIds(resolvedUrl);
      // Kadang atid.me → s.shopee.co.id → perlu resolve 2x
      if (!ids && (resolvedUrl.includes("shope.ee") || resolvedUrl.includes("s.shopee.co.id"))) {
        const secondResolve = await resolveShortUrl(resolvedUrl);
        if (secondResolve) {
          resolvedUrl = secondResolve;
          ids = extractIds(secondResolve);
        }
      }
    }
  }
  // Jika URL punya affiliateUrl (AT link), coba resolve juga
  if (!ids && !resolvedUrl) {
    // Cek apakah ada produk dengan URL ini yang punya affiliateUrl
    try {
      const product = await db.shopeeProduct.findUnique({
        where: { id: productId },
        select: { url: true, affiliateUrl: true },
      });
      if (product?.affiliateUrl && product.affiliateUrl !== productUrl) {
        const affResolved = await resolveShortUrl(product.affiliateUrl);
        if (affResolved) {
          ids = extractIds(affResolved);
          if (ids) resolvedUrl = affResolved;
        }
      }
    } catch {}
  }

  const fetchUrl = resolvedUrl || productUrl;

  // ── Strategy 1: Shopee API v4 ──
  if (ids) {
    const apiResult = await fetchShopeeApi(ids.shopId, ids.itemId);
    const item = apiResult.data;

    if (item) {
      const updateData: Record<string, unknown> = { lastScrapedAt: new Date() };

      if (item.name) updateData.title = String(item.name);
      if (item.image) {
        updateData.image = `https://down-id.img.susercontent.com/file/${item.image}`;
      } else if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        updateData.image = `https://down-id.img.susercontent.com/file/${item.images[0]}`;
      }

      const priceMin = item.price_min || item.price;
      if (priceMin) {
        const priceVal = Array.isArray(priceMin) ? priceMin[0] : priceMin;
        updateData.price = typeof priceVal === "number" ? priceVal : parseInt(String(priceVal), 10);
      }

      const priceBeforeDiscount = item.price_min_before_discount || item.price_before_discount;
      if (priceBeforeDiscount) {
        const origVal = Array.isArray(priceBeforeDiscount) ? priceBeforeDiscount[0] : priceBeforeDiscount;
        const origPrice = typeof origVal === "number" ? origVal : parseInt(String(origVal), 10);
        if (origPrice > 0) updateData.originalPrice = origPrice;
      }

      const newPrice = Number(updateData.price) || 0;
      const newOrigPrice = Number(updateData.originalPrice) || 0;
      if (newOrigPrice > newPrice) {
        updateData.discountPercent = Math.round(((newOrigPrice - newPrice) / newOrigPrice) * 100);
      }

      if (item.item_rating) {
        updateData.rating = item.item_rating.rating_star || 0;
        const ratingCount = item.item_rating.rating_count || [];
        updateData.reviewCount = Array.isArray(ratingCount)
          ? ratingCount.reduce((sum: number, c: number) => sum + (c || 0), 0)
          : 0;
      }

      if (item.historical_sold !== undefined && item.historical_sold !== null) {
        updateData.soldCount = item.historical_sold;
      } else if (item.sold !== undefined && item.sold !== null) {
        updateData.soldCount = item.sold;
      }

      if (item.shop_location) updateData.location = String(item.shop_location);
      if (item.catid) updateData.category = mapCategoryId(String(item.catid));

      await db.shopeeProduct.update({
        where: { id: productId },
        data: updateData,
      });

      return { id: productId, status: "ok", reason: "Shopee API v4" };
    }
  }

  // ── Strategy 2: HTML meta tag scraping ──
  const scraped = await scrapeFromHtml(fetchUrl);
  if (scraped && (scraped.title || scraped.image || scraped.price)) {
    const updateData: Record<string, unknown> = { lastScrapedAt: new Date() };
    if (scraped.title) updateData.title = scraped.title;
    if (scraped.image) updateData.image = scraped.image;
    if (scraped.price && scraped.price > 0) updateData.price = scraped.price;

    await db.shopeeProduct.update({
      where: { id: productId },
      data: updateData,
    });

    return { id: productId, status: "ok", reason: "HTML scraping" };
  }

  // ── Strategy 3: ZAI page_reader + AI extraction ──
  // Ini strategi terkuat — bisa melewati anti-bot Shopee
  const zaiResult = await scrapeWithZAI(fetchUrl);
  if (zaiResult && (zaiResult.title || zaiResult.image || zaiResult.price)) {
    const updateData: Record<string, unknown> = { lastScrapedAt: new Date() };
    if (zaiResult.title) updateData.title = zaiResult.title;
    if (zaiResult.image) updateData.image = zaiResult.image;
    if (zaiResult.price && zaiResult.price > 0) updateData.price = zaiResult.price;
    if (zaiResult.originalPrice && zaiResult.originalPrice > 0) updateData.originalPrice = zaiResult.originalPrice;
    if (zaiResult.rating) updateData.rating = zaiResult.rating;
    if (zaiResult.reviewCount) updateData.reviewCount = zaiResult.reviewCount;
    if (zaiResult.soldCount) updateData.soldCount = zaiResult.soldCount;
    if (zaiResult.location) updateData.location = zaiResult.location;
    if (zaiResult.category) updateData.category = zaiResult.category;

    // Hitung diskon
    const p = Number(updateData.price) || 0;
    const op = Number(updateData.originalPrice) || 0;
    if (op > p) {
      updateData.discountPercent = Math.round(((op - p) / op) * 100);
    }

    await db.shopeeProduct.update({
      where: { id: productId },
      data: updateData,
    });

    return { id: productId, status: "ok", reason: "ZAI page_reader" };
  }

  // ── Semua strategi gagal ──
  if (!ids) {
    return { id: productId, status: "skip", reason: "URL tidak bisa di-extract (bukan Shopee)" };
  }

  // Tetap update lastScrapedAt supaya produk tidak terus-menerus dianggap basi
  // (kalau semua strategi gagal, tandai sebagai "sudah dicoba" supaya tidak diulang terus)
  try {
    await db.shopeeProduct.update({
      where: { id: productId },
      data: { lastScrapedAt: new Date() },
    });
  } catch {}

  return { id: productId, status: "fail", reason: "Shopee anti-bot block — semua strategi gagal" };
}

// ═══════════════════════════════════════════════════════════════════════
// POST /api/refresh-products
//
// Mode:
//   1. Single:   { "productId": "xxx" }           — refresh 1 produk
//   2. Batch:    { "mode": "stale" }              — refresh produk basi (max 2)
//   3. Cron:     { "mode": "stale", "limit": 10 } — cron job, custom limit
// ═══════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  // Auth: admin atau cron secret
  const authErr = await checkAuth(req);
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (authErr && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { productId, mode, limit } = body;

    // ─── Mode 1: Single product refresh ────────────────────────────
    if (productId) {
      const product = await db.shopeeProduct.findUnique({
        where: { id: productId },
        select: { id: true, url: true },
      });

      if (!product) {
        return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
      }

      const result = await refreshOneProduct(product.id, product.url);
      return NextResponse.json({ results: [result], total: 1 });
    }

    // ─── Mode 2 & 3: Batch refresh stale products ─────────────────
    if (mode === "stale") {
      const batchLimit = Math.min(limit || BATCH_LIMIT, BATCH_LIMIT);
      const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

      const staleProducts = await db.shopeeProduct.findMany({
        where: {
          enabled: true,
          OR: [
            { lastScrapedAt: { lt: staleThreshold } },
            { lastScrapedAt: null },
          ],
        },
        select: { id: true, url: true },
        orderBy: { lastScrapedAt: "asc" },
        take: batchLimit,
      });

      if (staleProducts.length === 0) {
        return NextResponse.json({
          results: [],
          total: 0,
          message: "Semua produk sudah up-to-date",
        });
      }

      const results = [];
      for (let i = 0; i < staleProducts.length; i++) {
        const p = staleProducts[i];
        const result = await refreshOneProduct(p.id, p.url);
        results.push(result);
        if (i < staleProducts.length - 1) {
          await delay(DELAY_MS);
        }
      }

      const ok = results.filter((r) => r.status === "ok").length;
      const fail = results.filter((r) => r.status === "fail").length;
      const skip = results.filter((r) => r.status === "skip").length;

      // Invalidasi ISR cache kalau ada produk yang berhasil di-refresh
      if (ok > 0) {
        try {
          revalidatePath("/", "layout");
          console.log("[refresh-products] ISR cache invalidated");
        } catch (e) {
          console.warn("[refresh-products] revalidatePath failed:", e);
        }
      }

      return NextResponse.json({
        results,
        total: results.length,
        summary: { ok, fail, skip },
      });
    }

    // ─── Mode 4: Refresh all products (by IDs) ──
    if (mode === "all" && Array.isArray(body.ids)) {
      const productIds = body.ids as string[];
      const results = [];

      for (let i = 0; i < productIds.length; i++) {
        const pid = productIds[i];
        const product = await db.shopeeProduct.findUnique({
          where: { id: pid },
          select: { id: true, url: true },
        });
        if (product) {
          const result = await refreshOneProduct(product.id, product.url);
          results.push(result);
          if (i < productIds.length - 1) {
            await delay(DELAY_MS);
          }
        }
      }

      const ok = results.filter((r) => r.status === "ok").length;
      const fail = results.filter((r) => r.status === "fail").length;

      if (ok > 0) {
        try { revalidatePath("/", "layout"); } catch {}
      }

      return NextResponse.json({
        results,
        total: results.length,
        summary: { ok, fail, skip: results.filter((r) => r.status === "skip").length },
      });
    }

    // ─── Mode 5: Refresh all products in DB ──
    if (mode === "refresh-all") {
      const limitCount = Math.min(limit || 10, 20);
      const allProducts = await db.shopeeProduct.findMany({
        where: { enabled: true },
        select: { id: true, url: true },
        orderBy: { createdAt: "desc" },
        take: limitCount,
      });

      if (allProducts.length === 0) {
        return NextResponse.json({ results: [], total: 0, message: "Tidak ada produk" });
      }

      const results = [];
      for (let i = 0; i < allProducts.length; i++) {
        const p = allProducts[i];
        const result = await refreshOneProduct(p.id, p.url);
        results.push(result);
        if (i < allProducts.length - 1) {
          await delay(DELAY_MS);
        }
      }

      const ok = results.filter((r) => r.status === "ok").length;
      if (ok > 0) {
        try { revalidatePath("/", "layout"); } catch {}
      }

      return NextResponse.json({
        results,
        total: results.length,
        summary: {
          ok,
          fail: results.filter((r) => r.status === "fail").length,
          skip: results.filter((r) => r.status === "skip").length,
        },
      });
    }

    // ─── Mode 6: Fix marketplace ──
    if (mode === "fix-marketplace") {
      const { detectMarketplaceFromUrl } = await import("@/lib/utils");

      const validMarketplaces = ["shopee", "tokopedia", "lazada", "aliexpress", "amazon"];
      const badProducts = await db.shopeeProduct.findMany({
        where: {
          marketplace: { notIn: validMarketplaces },
        },
        select: { id: true, url: true, marketplace: true },
      });

      if (badProducts.length === 0) {
        return NextResponse.json({
          fixed: 0,
          message: "Semua produk sudah punya marketplace yang benar",
        });
      }

      let fixed = 0;
      for (const p of badProducts) {
        const correctMarketplace = detectMarketplaceFromUrl(p.url);
        await db.shopeeProduct.update({
          where: { id: p.id },
          data: { marketplace: correctMarketplace },
        });
        fixed++;
      }

      return NextResponse.json({
        fixed,
        total: badProducts.length,
        details: badProducts.map((p) => ({
          id: p.id,
          oldMarketplace: p.marketplace,
          url: p.url.slice(0, 50),
        })),
      });
    }

    return NextResponse.json(
      { error: "Kirim productId, mode:'stale', atau mode:'fix-marketplace'" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[api/refresh-products] Error:", err);
    return NextResponse.json(
      { error: "Gagal refresh produk" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET /api/refresh-products — dipanggil oleh Vercel Cron
// ═══════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

    const staleProducts = await db.shopeeProduct.findMany({
      where: {
        enabled: true,
        OR: [
          { lastScrapedAt: { lt: staleThreshold } },
          { lastScrapedAt: null },
        ],
      },
      select: { id: true, url: true },
      orderBy: { lastScrapedAt: "asc" },
      take: BATCH_LIMIT,
    });

    if (staleProducts.length === 0) {
      return NextResponse.json({ message: "Semua produk up-to-date", refreshed: 0 });
    }

    const results = [];
    for (let i = 0; i < staleProducts.length; i++) {
      const p = staleProducts[i];
      const result = await refreshOneProduct(p.id, p.url);
      results.push(result);
      if (i < staleProducts.length - 1) {
        await delay(DELAY_MS);
      }
    }

    const ok = results.filter((r) => r.status === "ok").length;
    console.log(`[cron refresh] ${ok}/${results.length} produk berhasil di-refresh`);

    if (ok > 0) {
      try {
        revalidatePath("/", "layout");
        console.log("[cron refresh] ISR cache invalidated");
      } catch (e) {
        console.warn("[cron refresh] revalidatePath failed:", e);
      }
    }

    return NextResponse.json({
      refreshed: ok,
      total: results.length,
      summary: {
        ok,
        fail: results.filter((r) => r.status === "fail").length,
        skip: results.filter((r) => r.status === "skip").length,
      },
    });
  } catch (err) {
    console.error("[api/refresh-products GET/cron] Error:", err);
    return NextResponse.json({ error: "Cron refresh gagal" }, { status: 500 });
  }
}
