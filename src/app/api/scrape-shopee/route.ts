import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Extract shopid and itemid from various Shopee URL formats:
 * - https://shopee.co.id/product-name-i.SHOPID.ITEMID
 * - https://shopee.co.id/product-name-i.SHOPID.ITEMID?...
 * - https://shope.ee/xxx (short URL, will be resolved)
 */
function extractIds(url: string): { shopId: number; itemId: number } | null {
  // Pattern: -i.SHOPID.ITEMID at end of path
  const match = url.match(/-i\.(\d+)\.(\d+)/);
  if (match) {
    return { shopId: parseInt(match[1], 10), itemId: parseInt(match[2], 10) };
  }
  return null;
}

/**
 * Resolve short URL (shope.ee) to full URL
 */
async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  try {
    const res = await fetch(shortUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
      signal: AbortSignal.timeout(10000),
    });
    return res.url || null;
  } catch {
    return null;
  }
}

/**
 * Fetch product data using Shopee's internal API v4
 */
async function fetchShopeeApi(shopId: number, itemId: number): Promise<Record<string, unknown> | null> {
  const apiUrl = `https://shopee.co.id/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "X-Shopee-Language": "id",
        "X-API-SOURCE": "pc",
        Referer: `https://shopee.co.id/`,
        "af-ac-enc-dat": "null",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error("[scrape-shopee] Shopee API status:", res.status);
      return null;
    }

    const data = await res.json();

    if (data.error) {
      console.error("[scrape-shopee] Shopee API error:", data.error, data.msg || "");
      return null;
    }

    const item = data.data;
    if (!item) return null;

    const product: Record<string, unknown> = {};

    // Title
    product.title = item.name || "";

    // Image - Shopee returns image field as "xxx" which needs prefix
    if (item.image) {
      product.image = `https://down-id.img.susercontent.com/file/${item.image}`;
    } else if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      product.image = `https://down-id.img.susercontent.com/file/${item.images[0]}`;
    }

    // Price - Shopee API returns prices in minor units (need to handle)
    // price_min and price_max are in the smallest currency unit
    // For IDR, Shopee sometimes returns the actual price (no conversion needed for IDR)
    const priceMin = item.price_min || item.price;
    const priceMax = item.price_max || item.price;

    if (priceMin) {
      // Shopee API returns price as array [min, max] or single number
      const priceVal = Array.isArray(priceMin) ? priceMin[0] : priceMin;
      // If price is unreasonably large (above 10M IDR per unit), it might be in minor units
      product.price = typeof priceVal === "number" ? priceVal : parseInt(String(priceVal), 10);
    }

    // Original price (before discount)
    const priceBeforeDiscount = item.price_min_before_discount || item.price_before_discount;
    if (priceBeforeDiscount) {
      const origVal = Array.isArray(priceBeforeDiscount) ? priceBeforeDiscount[0] : priceBeforeDiscount;
      product.originalPrice = typeof origVal === "number" ? origVal : parseInt(String(origVal), 10);
    }

    // Historical price for original
    if (!product.originalPrice && item.historical_price) {
      const histVal = Array.isArray(item.historical_price) ? item.historical_price[0] : item.historical_price;
      if (histVal && Number(histVal) > Number(product.price || 0)) {
        product.originalPrice = typeof histVal === "number" ? histVal : parseInt(String(histVal), 10);
      }
    }

    // Rating
    if (item.item_rating) {
      product.rating = item.item_rating.rating_star || 0;
      const ratingCount = item.item_rating.rating_count || [];
      product.reviewCount = Array.isArray(ratingCount)
        ? ratingCount.reduce((sum: number, c: number) => sum + (c || 0), 0)
        : 0;
    }

    // Sold count
    if (item.historical_sold !== undefined && item.historical_sold !== null) {
      product.soldCount = item.historical_sold;
    } else if (item.sold !== undefined && item.sold !== null) {
      product.soldCount = item.sold;
    }

    // Location / shop location
    if (item.shop_location) {
      product.location = item.shop_location;
    } else if (item.shop_info) {
      product.location = item.shop_info.shop_location || null;
    }

    // Category
    if (item.catid) {
      product.category = mapCategoryId(String(item.catid));
    }

    return product;
  } catch (err) {
    console.error("[scrape-shopee] Shopee API fetch failed:", err);
    return null;
  }
}

/**
 * Map Shopee category IDs to our categories
 */
function mapCategoryId(catId: string): string {
  const catMap: Record<string, string> = {
    "16": "Elektronik",
    "42": "Elektronik",
    "75": "Elektronik",
    "76": "Elektronik",
    "77": "Elektronik",
    "78": "Elektronik",
    "79": "Elektronik",
    "80": "Elektronik",
    "81": "Elektronik",
    "100029": "Elektronik",
    "100041": "Elektronik",
    "100042": "Elektronik",
    "100043": "Elektronik",
    "100044": "Elektronik",
    "100630": "Elektronik",
    "100631": "Elektronik",
    "100632": "Elektronik",
    "100633": "Elektronik",
    "100634": "Elektronik",
    "100635": "Elektronik",
    "100636": "Elektronik",
    "100637": "Elektronik",
    "100638": "Elektronik",
    "100639": "Elektronik",
    "100640": "Elektronik",
    "100641": "Elektronik",
    "100642": "Elektronik",
    "100643": "Elektronik",
    "100644": "Elektronik",
    "100645": "Elektronik",
    "100646": "Elektronik",
    "100647": "Elektronik",
    "100648": "Elektronik",
    "100649": "Elektronik",
    "17": "Fashion",
    "18": "Fashion",
    "24": "Fashion",
    "25": "Fashion",
    "26": "Fashion",
    "27": "Fashion",
    "28": "Fashion",
    "29": "Fashion",
    "30": "Fashion",
    "31": "Fashion",
    "32": "Fashion",
    "33": "Fashion",
    "34": "Fashion",
    "35": "Fashion",
    "36": "Fashion",
    "37": "Fashion",
    "38": "Fashion",
    "39": "Fashion",
    "100009": "Fashion",
    "100010": "Fashion",
    "100011": "Fashion",
    "100012": "Fashion",
    "100013": "Fashion",
    "100014": "Fashion",
    "100015": "Fashion",
    "100016": "Fashion",
    "100017": "Fashion",
    "100018": "Fashion",
    "100019": "Fashion",
    "100020": "Fashion",
    "100021": "Fashion",
    "100022": "Fashion",
    "100023": "Fashion",
    "100024": "Fashion",
    "100025": "Fashion",
    "100026": "Fashion",
    "100027": "Fashion",
    "100028": "Fashion",
    "1": "Beauty",
    "2": "Beauty",
    "3": "Beauty",
    "4": "Beauty",
    "5": "Beauty",
    "6": "Beauty",
    "7": "Beauty",
    "8": "Beauty",
    "9": "Beauty",
    "10": "Beauty",
    "11": "Beauty",
    "12": "Beauty",
    "13": "Beauty",
    "14": "Beauty",
    "15": "Beauty",
    "100001": "Beauty",
    "100002": "Beauty",
    "100003": "Beauty",
    "100004": "Beauty",
    "100005": "Beauty",
    "100006": "Beauty",
    "100007": "Beauty",
    "100008": "Beauty",
    "40": "Home",
    "41": "Home",
    "43": "Home",
    "44": "Home",
    "45": "Home",
    "46": "Home",
    "47": "Home",
    "48": "Home",
    "49": "Home",
    "50": "Home",
    "51": "Home",
    "52": "Home",
    "53": "Home",
    "54": "Home",
    "55": "Home",
    "56": "Home",
    "57": "Home",
    "58": "Home",
    "59": "Home",
    "60": "Home",
    "61": "Home",
    "62": "Home",
    "63": "Home",
    "64": "Home",
    "65": "Home",
    "66": "Home",
    "67": "Home",
    "68": "Home",
    "69": "Home",
    "70": "Home",
    "71": "Home",
    "72": "Home",
    "73": "Home",
    "74": "Home",
    "100030": "Home",
    "100031": "Home",
    "100032": "Home",
    "100033": "Home",
    "100034": "Home",
    "100035": "Home",
    "100036": "Home",
    "100037": "Home",
    "100038": "Home",
    "100039": "Home",
    "100040": "Home",
    "82": "Gaming",
    "83": "Gaming",
    "84": "Gaming",
    "85": "Gaming",
    "86": "Gaming",
    "87": "Gaming",
    "88": "Gaming",
    "89": "Gaming",
    "90": "Gaming",
    "91": "Gaming",
    "92": "Gaming",
    "93": "Gaming",
    "94": "Gaming",
    "95": "Gaming",
    "96": "Gaming",
    "97": "Gaming",
    "98": "Gaming",
    "99": "Gaming",
    "100": "Gaming",
    "100050": "Gaming",
    "100051": "Gaming",
    "100052": "Gaming",
    "100053": "Gaming",
    "100054": "Gaming",
    "100055": "Gaming",
    "100056": "Gaming",
    "100057": "Gaming",
    "100058": "Gaming",
    "100059": "Gaming",
    "100060": "Gaming",
    "101": "Olahraga",
    "102": "Olahraga",
    "103": "Olahraga",
    "104": "Olahraga",
    "105": "Olahraga",
    "106": "Olahraga",
    "107": "Olahraga",
    "108": "Olahraga",
    "109": "Olahraga",
    "110": "Olahraga",
    "111": "Olahraga",
    "112": "Olahraga",
    "113": "Olahraga",
    "114": "Olahraga",
    "115": "Olahraga",
    "116": "Olahraga",
    "117": "Olahraga",
    "118": "Olahraga",
    "119": "Olahraga",
    "120": "Olahraga",
    "121": "Olahraga",
    "122": "Olahraga",
    "100061": "Olahraga",
    "100062": "Olahraga",
    "100063": "Olahraga",
    "100064": "Olahraga",
    "100065": "Olahraga",
    "100066": "Olahraga",
    "100067": "Olahraga",
    "100068": "Olahraga",
    "100069": "Olahraga",
    "100070": "Olahraga",
    "100071": "Olahraga",
    "100072": "Olahraga",
    "100073": "Olahraga",
    "100074": "Olahraga",
    "100075": "Olahraga",
    "100076": "Olahraga",
    "100077": "Olahraga",
    "100078": "Olahraga",
    "100079": "Olahraga",
    "100080": "Olahraga",
    "100081": "Olahraga",
    "100082": "Olahraga",
    "100083": "Olahraga",
    "100084": "Olahraga",
    "100085": "Olahraga",
    "100086": "Olahraga",
    "100087": "Olahraga",
    "100088": "Olahraga",
    "100089": "Olahraga",
    "100090": "Olahraga",
    "123": "Mainan",
    "124": "Mainan",
    "125": "Mainan",
    "126": "Mainan",
    "127": "Mainan",
    "128": "Mainan",
    "129": "Mainan",
    "130": "Mainan",
    "131": "Mainan",
    "132": "Mainan",
    "133": "Mainan",
    "134": "Mainan",
    "135": "Mainan",
    "100091": "Mainan",
    "100092": "Mainan",
    "100093": "Mainan",
    "100094": "Mainan",
    "100095": "Mainan",
    "100096": "Mainan",
    "100097": "Mainan",
    "100098": "Mainan",
    "100099": "Mainan",
    "100100": "Mainan",
    "136": "Otomotif",
    "137": "Otomotif",
    "138": "Otomotif",
    "139": "Otomotif",
    "140": "Otomotif",
    "141": "Otomotif",
    "142": "Otomotif",
    "143": "Otomotif",
    "144": "Otomotif",
    "145": "Otomotif",
    "146": "Otomotif",
    "147": "Otomotif",
    "148": "Otomotif",
    "149": "Otomotif",
    "150": "Otomotif",
    "100101": "Otomotif",
    "100102": "Otomotif",
    "100103": "Otomotif",
    "100104": "Otomotif",
    "100105": "Otomotif",
    "100106": "Otomotif",
    "100107": "Otomotif",
    "100108": "Otomotif",
    "100109": "Otomotif",
    "100110": "Otomotif",
    "100111": "Otomotif",
    "100112": "Otomotif",
    "100113": "Otomotif",
    "100114": "Otomotif",
    "100115": "Otomotif",
    "100116": "Otomotif",
    "100117": "Otomotif",
    "100118": "Otomotif",
    "100119": "Otomotif",
    "100120": "Otomotif",
  };
  return catMap[catId] || "Fashion";
}

/**
 * Fallback: parse HTML page for meta tags and JSON-LD
 */
async function scrapeHtmlPage(url: string): Promise<Record<string, unknown>> {
  const product: Record<string, unknown> = {};

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    const pageContent = await res.text();

    // JSON-LD
    const jsonLdMatch = pageContent.match(
      /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    if (jsonLdMatch) {
      for (const block of jsonLdMatch) {
        try {
          const inner = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          if (inner) {
            const parsed = JSON.parse(inner[1]);
            if (parsed["@type"] === "Product" || parsed.name) {
              product.title = parsed.name || "";
              if (parsed.image) {
                product.image = typeof parsed.image === "string" ? parsed.image : Array.isArray(parsed.image) ? parsed.image[0] : "";
              }
              if (parsed.offers) {
                const offers = parsed.offers;
                if (offers.price) product.price = parsePrice(offers.price);
                if (offers.highPrice) product.originalPrice = parsePrice(offers.highPrice);
              }
              if (parsed.aggregateRating) {
                product.rating = parseFloat(parsed.aggregateRating.ratingValue) || undefined;
                product.reviewCount = parseInt(parsed.aggregateRating.reviewCount) || undefined;
              }
            }
          }
        } catch {}
      }
    }

    // Meta tags
    const ogTitle = pageContent.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    if (ogTitle && !product.title) product.title = ogTitle[1];

    const ogImage = pageContent.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImage && !product.image) product.image = ogImage[1];

    const metaPrice = pageContent.match(/<meta\s+(?:property|name)=["']product:price:amount["']\s+content=["']([^"']+)["']/i);
    if (metaPrice && !product.price) product.price = parsePrice(metaPrice[1]);

    // Clean up title
    if (product.title) {
      product.title = String(product.title)
        .replace(/\s*[-|–]\s*Shopee\s*Indonesia\s*/gi, "")
        .replace(/\s*[-|–]\s*Shopee\s*/gi, "")
        .trim();
    }
  } catch (err) {
    console.error("[scrape-shopee] HTML scrape failed:", err);
  }

  return product;
}

/**
 * Groq AI fallback extraction
 */
async function extractWithAI(pageContent: string, product: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Try ZAI LLM first (more reliable), then fall back to Groq
  const existingTitle = product.title || "";
  const existingPrice = product.price || "";
  const existingImage = product.image || "";

  // ZAI LLM approach
  try {
    const zai = await ZAI.create();
    const prompt = `Kamu adalah extractor data produk Shopee Indonesia. Dari konten halaman Shopee berikut, extract info produk dan kembalikan HANYA JSON object dengan field ini:
- title: nama produk (string)
- image: URL foto produk utama (string)
- price: harga dalam Rupiah, angka saja tanpa titik/koma (number)
- originalPrice: harga asli sebelum diskon, angka saja, atau null (number|null)
- rating: rating 0-5 (number)
- reviewCount: jumlah review (number)
- soldCount: jumlah terjual (number)
- location: kota seller (string atau null)
- category: salah satu dari Fashion, Beauty, Elektronik, Home, Gaming, Olahraga, Mainan, Otomotif (string)

Data yang sudah diketahui: ${existingTitle ? `title="${existingTitle}"` : ""} ${existingPrice ? `price=${existingPrice}` : ""} ${existingImage ? `image="${existingImage}"` : ""}

PENTING: Shopee adalah SPA (Single Page Application) jadi HTML mungkin tidak berisi data produk langsung. Cari data di:
1. Script tags yang berisi JSON data (window.__INITIAL_STATE__, __NEXT_DATA__, dsb)
2. Meta tags (og:title, og:image, product:price:amount)
3. URL pattern (nama produk di URL)
4. Teks yang mengandung nama produk, harga, rating

Jika data tidak ditemukan sama sekali, isi null. JANGAN tambahkan teks lain selain JSON.

Konten halaman:
${pageContent.substring(0, 20000)}`;

    const response = await zai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!product.title && parsed.title) product.title = parsed.title;
      if (!product.image && parsed.image) product.image = parsed.image;
      if (!product.price && parsed.price) product.price = parsed.price;
      if (!product.originalPrice && parsed.originalPrice) product.originalPrice = parsed.originalPrice;
      if (parsed.rating) product.rating = parsed.rating;
      if (parsed.reviewCount) product.reviewCount = parsed.reviewCount;
      if (parsed.soldCount) product.soldCount = parsed.soldCount;
      if (parsed.location) product.location = parsed.location;
      if (parsed.category) product.category = parsed.category;
      console.log("[scrape-shopee] ZAI AI extraction success, title:", parsed.title);
    }
    return product;
  } catch (zaiErr) {
    console.error("[scrape-shopee] ZAI AI extraction failed:", zaiErr);
  }

  // Fallback: Groq
  if (!GROQ_API_KEY) return product;

  try {
    const truncated = pageContent.substring(0, 15000);
    const aiRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "system",
              content: `Kamu adalah extractor data produk Shopee Indonesia. Dari HTML halaman Shopee, extract info produk dan kembalikan HANYA JSON object dengan field ini:
- title: nama produk (string)
- image: URL foto produk utama (string)
- price: harga dalam Rupiah, angka saja tanpa titik/koma (number)
- originalPrice: harga asli sebelum diskon, angka saja, atau null (number|null)
- rating: rating 0-5 (number)
- reviewCount: jumlah review (number)
- soldCount: jumlah terjual (number)
- location: kota seller (string atau null)
- category: salah satu dari Fashion, Beauty, Elektronik, Home, Gaming, Olahraga, Mainan, Otomotif (string)

Contoh: {"title":"Earbuds TWS Pro","image":"https://down-id.img.susercontent.com/xxx","price":89000,"originalPrice":250000,"rating":4.9,"reviewCount":28500,"soldCount":75000,"location":"Jakarta Barat","category":"Elektronik"}

Jika data tidak ditemukan, isi null. JANGAN tambahkan teks lain selain JSON.`,
            },
            {
              role: "user",
              content: `Extract data produk dari halaman Shopee ini:\n\n${truncated}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      }
    );

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!product.title && parsed.title) product.title = parsed.title;
        if (!product.image && parsed.image) product.image = parsed.image;
        if (!product.price && parsed.price) product.price = parsed.price;
        if (!product.originalPrice && parsed.originalPrice) product.originalPrice = parsed.originalPrice;
        if (parsed.rating) product.rating = parsed.rating;
        if (parsed.reviewCount) product.reviewCount = parsed.reviewCount;
        if (parsed.soldCount) product.soldCount = parsed.soldCount;
        if (parsed.location) product.location = parsed.location;
        if (parsed.category) product.category = parsed.category;
      }
    }
  } catch (aiErr) {
    console.error("[scrape-shopee] AI extraction failed:", aiErr);
  }

  return product;
}

export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    let { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL Shopee tidak valid" },
        { status: 400 }
      );
    }

    // SSRF Protection: Validate URL dengan proper parsing + domain allowlist
    try {
      const parsed = new URL(url);
      const allowedHosts = [
        "shopee.co.id",
        "shope.ee",
        "shopee.ph",
        "shopee.sg",
        "shopee.com.my",
        "shopee.th",
        "shopee.vn",
        "shopee.com.br",
        "shopee.com.mx",
        "shopee.cl",
        "shopee.pl",
        "shopee.com.co",
      ];
      const isAllowed = allowedHosts.some(
        (host) => parsed.hostname === host || parsed.hostname.endsWith("." + host)
      );
      if (!isAllowed) {
        return NextResponse.json(
          { error: "URL Shopee tidak valid — domain tidak diizinkan" },
          { status: 400 }
        );
      }
      // Only allow https: and http: schemes
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return NextResponse.json(
          { error: "URL Shopee tidak valid — scheme tidak diizinkan" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "URL Shopee tidak valid — format URL salah" },
        { status: 400 }
      );
    }

    // Resolve short URLs (shope.ee)
    if (url.includes("shope.ee") || url.includes("shope.ee/")) {
      const resolved = await resolveShortUrl(url);
      if (resolved) url = resolved;
    }

    let product: Record<string, unknown> = {};

    // Strategy 1: Use Shopee API v4 (best approach, but often blocked now)
    const ids = extractIds(url);
    if (ids) {
      console.log("[scrape-shopee] Trying API v4, shopId:", ids.shopId, "itemId:", ids.itemId);
      const apiResult = await fetchShopeeApi(ids.shopId, ids.itemId);
      if (apiResult) {
        product = apiResult;
      }
    }

    // Strategy 2: HTML scrape if API didn't return enough data
    if (!product.title || !product.image || !product.price) {
      console.log("[scrape-shopee] API incomplete, trying HTML scrape...");
      const htmlResult = await scrapeHtmlPage(url);
      if (!product.title && htmlResult.title) product.title = htmlResult.title;
      if (!product.image && htmlResult.image) product.image = htmlResult.image;
      if (!product.price && htmlResult.price) product.price = htmlResult.price;
      if (!product.originalPrice && htmlResult.originalPrice) product.originalPrice = htmlResult.originalPrice;
      if (!product.rating && htmlResult.rating) product.rating = htmlResult.rating;
      if (!product.reviewCount && htmlResult.reviewCount) product.reviewCount = htmlResult.reviewCount;
      if (!product.soldCount && htmlResult.soldCount) product.soldCount = htmlResult.soldCount;
      if (!product.location && htmlResult.location) product.location = htmlResult.location;
      if (!product.category && htmlResult.category) product.category = htmlResult.category;
    }

    // Strategy 3: ZAI page_reader + AI extraction (most reliable for Shopee)
    if (!product.title || !product.price) {
      console.log("[scrape-shopee] Trying ZAI page_reader + AI extraction...");
      try {
        const zai = await ZAI.create();
        const pageResult = await zai.functions.invoke("page_reader", { url });
        const pageHtml = pageResult?.data?.html || "";
        const pageTitle = pageResult?.data?.title || "";

        if (pageHtml.length > 100) {
          product = await extractWithAI(pageHtml, product);
        }

        // Jika masih belum dapat judul, coba dari page title
        if (!product.title && pageTitle && pageTitle !== "Shopee Indonesia | Situs Belanja Online Terlengkap & Terpercaya") {
          product.title = pageTitle.replace(/\s*[-|–]\s*Shopee\s*Indonesia\s*/gi, "").replace(/\s*[-|–]\s*Shopee\s*/gi, "").trim();
        }
      } catch (zaiErr) {
        console.error("[scrape-shopee] ZAI page_reader failed:", zaiErr);
      }
    }

    // Strategy 4: Groq AI fallback on HTML content (original approach)
    if (!product.title || !product.price) {
      console.log("[scrape-shopee] Trying Groq AI fallback...");
      try {
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "id-ID,id;q=0.9",
          },
          signal: AbortSignal.timeout(15000),
          redirect: "follow",
        });
        const pageContent = await pageRes.text();
        if (pageContent.length > 100) {
          product = await extractWithAI(pageContent, product);
        }
      } catch {}
    }

    // Set defaults
    if (!product.category) product.category = "Fashion";
    if (!product.rating) product.rating = 4.5;
    if (!product.reviewCount) product.reviewCount = 0;
    if (!product.soldCount) product.soldCount = 0;

    const price = Number(product.price) || 0;
    const origPrice = Number(product.originalPrice) || 0;
    const discountPercent = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : null;

    // Final validation - at minimum we need a title
    if (!product.title) {
      return NextResponse.json(
        { error: "Gagal mengambil data produk. Coba paste link produk yang lain." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        title: String(product.title),
        image: String(product.image || ""),
        price,
        originalPrice: origPrice > 0 ? origPrice : null,
        discountPercent,
        rating: Number(product.rating) || 4.5,
        reviewCount: Number(product.reviewCount) || 0,
        soldCount: Number(product.soldCount) || 0,
        location: product.location ? String(product.location) : null,
        category: String(product.category || "Fashion"),
      },
    });
  } catch (err) {
    console.error("[scrape-shopee] Error:", err);
    return NextResponse.json(
      { error: "Gagal scrape produk Shopee. Coba lagi nanti." },
      { status: 500 }
    );
  }
}

function parsePrice(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).replace(/[^\d]/g, "");
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}
