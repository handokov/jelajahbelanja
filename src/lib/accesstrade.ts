/**
 * accesstrade.ts — Library untuk AccessTrade API integration
 *
 * Fitur:
 * - Auto-generate JWT (HS256 signed with secretKey)
 * - Fetch affiliated campaigns (Shopee, Tokopedia, TikTok, dll)
 * - Fetch product feed per campaign
 * - Detect marketplace dari campaign name / domain
 * - Rate limit internal (1 req per 500ms)
 *
 * Semua env vars baca dari process.env:
 * - ACCESSTRADE_USER_UID
 * - ACCESSTRADE_SECRET_KEY
 * - ACCESSTRADE_API_BASE (default: https://gurkha.accesstrade.global)
 * - ACCESSTRADE_COUNTRY_CODE (default: id)
 * - ACCESSTRADE_SITE_ID (default: 127377)
 */

import crypto from "crypto";
import { getAtCredentials } from "@/lib/settings";

// Credentials dibaca dynamically dari DB (fallback ke env vars)
// Supaya bisa di-edit via admin UI tanpa Vercel env vars issue
async function getCreds() {
  return getAtCredentials();
}

// Default values (untuk fungsi sync yang tidak async)
const API_BASE_FALLBACK = process.env.ACCESSTRADE_API_BASE || "https://gurkha.accesstrade.global";
const COUNTRY_CODE_FALLBACK = process.env.ACCESSTRADE_COUNTRY_CODE || "id";
const SITE_ID_FALLBACK = process.env.ACCESSTRADE_SITE_ID || "127377";

// ─── JWT Generation ───
function base64Url(obj: object): string {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Generate JWT pakai credentials dari DB (async)
async function generateJwt(): Promise<string> {
  const creds = await getCreds();
  if (!creds.USER_UID || !creds.SECRET_KEY) {
    throw new Error("ACCESSTRADE_USER_UID or ACCESSTRADE_SECRET_KEY not set. Set via admin AT Sync tab.");
  }
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: creds.USER_UID, iat: Math.floor(Date.now() / 1000) };
  const data = base64Url(header) + "." + base64Url(payload);
  const sig = crypto
    .createHmac("sha256", creds.SECRET_KEY)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return data + "." + sig;
}

// ─── Rate limiter (1 req per 500ms) ───
let lastRequestTime = 0;
async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const minDelay = 500;
  if (elapsed < minDelay) {
    await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── Generic API call ───
async function atFetch<T>(path: string): Promise<T> {
  await rateLimit();
  const creds = await getCreds();
  const url = creds.API_BASE + path;
  const jwt = await generateJwt();

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Accesstrade-User-Type": "publisher",
      Accept: "application/json",
      "User-Agent": "jb-sync/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AT API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// ─── POST version of atFetch (for Create Custom Creative endpoint) ───
async function atPostFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  await rateLimit();
  const creds = await getCreds();
  const url = creds.API_BASE + path;
  const jwt = await generateJwt();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Accesstrade-User-Type": "publisher",
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "jb-sync/1.0",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AT API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ───
export interface ATCampaign {
  id: number;
  name: string;
  url: string;
  imageUrl: string;
  currency: string;
  categories: Array<{ name: string; value: number }>;
  highestRewardSummaries: Array<{
    type: string;
    reward: number;
    isAllSameRewardAmount: boolean;
  }>;
}

export interface ATProductFeedUrl {
  baseUrl: string;
}

export interface ATProduct {
  product_id?: string;
  product_name?: string;
  title?: string;
  name?: string;
  image_link?: string;
  image?: string;
  image_url?: string;
  price?: number | string;
  sale_price?: number | string;
  discount?: number | string;
  original_price?: number | string;
  product_url?: string;
  link?: string;
  url?: string;
  aff_link?: string;
  affiliate_link?: string;
  affiliate_url?: string;
  category?: string;
  category_name?: string;
  merchant?: string;
  merchant_name?: string;
  description?: string;
  rating?: number | string;
  review_count?: number | string;
  sold_count?: number | string;
  location?: string;
}

// ─── API Functions ───

/** Dapat semua site yang Anda miliki */
export async function getSites(): Promise<Array<{ id: number; name: string; url: string; status: string }>> {
  return atFetch("/v1/publishers/me/sites");
}

/** Dapat campaign yang sudah Anda approved (affiliated) */
export async function getAffiliatedCampaigns(): Promise<ATCampaign[]> {
  const creds = await getCreds();
  const path = `/v1/publishers/me/sites/${creds.SITE_ID}/campaigns/affiliated?limit=50&page=1&countryCode=${creds.COUNTRY_CODE}`;
  return atFetch<ATCampaign[]>(path);
}

/** Dapat URL product feed untuk campaign tertentu */
export async function getProductFeedUrl(campaignId: number): Promise<string | null> {
  try {
    const creds = await getCreds();
    const path = `/v1/publishers/me/sites/${creds.SITE_ID}/campaigns/${campaignId}/productfeed/url?countryCode=${creds.COUNTRY_CODE}`;
    const result = await atFetch<ATProductFeedUrl>(path);
    return result.baseUrl || null;
  } catch {
    return null;
  }
}

/** Fetch product feed dari URL yang sudah didapat */
export async function fetchProductFeed(feedUrl: string): Promise<ATProduct[]> {
  await rateLimit();
  try {
    const res = await fetch(feedUrl, {
      headers: { Accept: "application/json", "User-Agent": "jb-sync/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Format bisa array atau { products: [...] }
    if (Array.isArray(data)) return data as ATProduct[];
    if (data.products && Array.isArray(data.products)) return data.products as ATProduct[];
    if (data.data && Array.isArray(data.data)) return data.data as ATProduct[];
    return [];
  } catch {
    return [];
  }
}

// ─── Marketplace Detection ───
/** Detect marketplace dari campaign name AT */
export function detectMarketplaceFromCampaign(campaign: ATCampaign): string {
  const name = (campaign.name || "").toLowerCase();
  const url = (campaign.url || "").toLowerCase();

  if (name.includes("shopee") || url.includes("shopee")) return "shopee";
  if (name.includes("tokopedia") || url.includes("tokopedia")) return "tokopedia";
  if (name.includes("lazada") || url.includes("lazada")) return "lazada";
  if (name.includes("blibli") || url.includes("blibli")) return "blibli";
  if (name.includes("bukalapak") || url.includes("bukalapak")) return "bukalapak";
  if (name.includes("zalora") || url.includes("zalora")) return "zalora";
  if (name.includes("sociolla") || url.includes("sociolla")) return "sociolla";
  if (name.includes("tiktok") || url.includes("tiktok")) return "tiktok";
  if (name.includes("aliexpress") || url.includes("aliexpress")) return "aliexpress";
  if (name.includes("amazon") || url.includes("amazon")) return "amazon";

  // Default: pakai name campaign
  return "shopee";
}

/** Cek apakah AT credentials sudah dikonfigurasi (DB atau env) */
export async function isAtConfigured(): Promise<boolean> {
  const creds = await getCreds();
  return !!(creds.USER_UID && creds.SECRET_KEY);
}

// ─── Quicklink: Auto-affiliate untuk produk marketplace ───

export interface ATQuicklink {
  affiliateLink: string;
  trackingTemplate: string;
  finalUrl: string;
  landingUrl: string;
}

/** Cache quicklink per campaign (1 jam) supaya tidak fetch berulang */
const quicklinkCache = new Map<number, { data: ATQuicklink | null; expires: number }>();
const QUICKLINK_CACHE_TTL = 60 * 60 * 1000; // 1 jam

/** Dapat quicklink (affiliate link generator) untuk campaign tertentu */
export async function getQuicklink(campaignId: number): Promise<ATQuicklink | null> {
  // Cek cache
  const cached = quicklinkCache.get(campaignId);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  try {
    const creds = await getCreds();
    const path = `/v1/publishers/me/sites/${creds.SITE_ID}/campaigns/${campaignId}/creatives/quicklink?countryCode=${creds.COUNTRY_CODE}`;
    const result = await atFetch<ATQuicklink>(path);
    quicklinkCache.set(campaignId, { data: result, expires: Date.now() + QUICKLINK_CACHE_TTL });
    return result;
  } catch {
    quicklinkCache.set(campaignId, { data: null, expires: Date.now() + QUICKLINK_CACHE_TTL });
    return null;
  }
}

/** Map marketplace → campaign ID yang punya quicklink (di-cache saat first fetch) */
let shopeeCampaignId: number | null = null;

/** Cari campaign Shopee utama dari affiliated list, return ID-nya.
 *
 * Prioritas (dari listing AT user):
 * 1. "Shopee ID NON KOL" — campaign utama Shopee Indonesia (reward tertinggi, support custom link)
 * 2. Campaign yang name-nya START WITH "Shopee" (bukan "Dario CPS Shopee" dll yang itu sub-campaign merchant)
 * 3. Campaign dengan reward tertinggi yang marketplace=shopee
 *
 * Bug lama: find(c => name.includes("shopee")) → return "Dario CPS Shopee" (sub-campaign, reward 1)
 * → custom link API gagal karena bukan campaign utama.
 */
async function findShopeeCampaignId(): Promise<number | null> {
  if (shopeeCampaignId !== null) return shopeeCampaignId;
  try {
    const campaigns = await getAffiliatedCampaigns();
    const shopeeCampaigns = campaigns.filter(c => {
      const name = (c.name || "").toLowerCase();
      return name.includes("shopee");
    });

    if (shopeeCampaigns.length === 0) return null;

    // 1. Prefer "Shopee ID NON KOL" (campaign utama, exact match)
    let best = shopeeCampaigns.find(c => {
      const name = (c.name || "").toLowerCase();
      return name.includes("non kol") || name.includes("shopee id");
    });

    // 2. Prefer campaign yang name-nya START WITH "shopee" (bukan "Dario CPS Shopee")
    if (!best) {
      best = shopeeCampaigns.find(c => {
        const name = (c.name || "").toLowerCase().trim();
        return name.startsWith("shopee");
      });
    }

    // 3. Fallback: Shopee campaign dengan reward tertinggi
    if (!best) {
      best = shopeeCampaigns.sort((a, b) => {
        const ra = a.highestRewardSummaries?.[0]?.reward || 0;
        const rb = b.highestRewardSummaries?.[0]?.reward || 0;
        return rb - ra;
      })[0];
    }

    shopeeCampaignId = best?.id || null;
    return shopeeCampaignId;
  } catch {
    return null;
  }
}

/**
 * Generate affiliate URL AccessTrade untuk produk Shopee.
 *
 * Pattern: AT quicklink + `?url=<encoded shopee product url>`
 * AT akan redirect ke product URL dengan affiliate tracking otomatis.
 *
 * Contoh:
 *   Input:  https://shopee.co.id/product/123456
 *   Output: https://atid.me/00qynk002qa9?url=https%3A%2F%2Fshopee.co.id%2Fproduct%2F123456
 *
 * Kalau quicklink tidak tersedia atau URL bukan Shopee, return null.
 */
export async function generateShopeeAffiliateUrl(productUrl: string): Promise<string | null> {
  if (!productUrl) return null;

  // Validasi: harus URL Shopee
  const lowerUrl = productUrl.toLowerCase();
  const isShopeeUrl =
    lowerUrl.includes("shopee.co.id") ||
    lowerUrl.includes("shopee.com") ||
    lowerUrl.includes("shope.ee") ||
    lowerUrl.includes("atid.me"); // shortlink AT sendiri

  if (!isShopeeUrl) return null;

  // Kalau sudah punya affiliate URL AT (atid.me), skip — sudah ter-affiliate
  if (lowerUrl.includes("atid.me")) return productUrl;

  // Cari campaign Shopee
  const campaignId = await findShopeeCampaignId();
  if (!campaignId) return null;

  // Dapat quicklink base
  const quicklink = await getQuicklink(campaignId);
  if (!quicklink?.affiliateLink) return null;

  // Generate deep link: quicklink + ?url=<encoded product url>
  const baseAffiliateLink = quicklink.affiliateLink;
  const separator = baseAffiliateLink.includes("?") ? "&" : "?";
  return `${baseAffiliateLink}${separator}url=${encodeURIComponent(productUrl)}`;
}

/**
 * Generate affiliate URL untuk marketplace apa saja.
 * Untuk sekarang hanya Shopee yang supported (campaign approved + quicklink available).
 * Tokopedia, TikTok, dll — quicklink belum available di account ini.
 */
export async function generateAffiliateUrl(productUrl: string, marketplace: string): Promise<string | null> {
  if (marketplace === "shopee") {
    return generateShopeeAffiliateUrl(productUrl);
  }
  // Marketplace lain: return null (tidak ada quicklink available)
  return null;
}

// ═══════════════════════════════════════════════════════════════════
//  Create Custom Creative — AT API untuk bikin custom link (atid.me/go/xxx)
// ═══════════════════════════════════════════════════════════════════

export interface ATCustomCreative {
  id: number;
  name: string;
  affiliateLink: string;        // ← short link atid.me/go/xxx
  landingUrl: string;           // ← URL asli produk
  imageUrl: string | null;
  createdOn: string;
}

interface ATCustomCreativeResponse {
  totalItems?: number;
  content?: ATCustomCreative[];   // Format docs (array wrapper)
  // AT Indonesia return object langsung (bukan wrapper array):
  id?: number;
  name?: string;
  affiliateLink?: string;
  landingUrl?: string;
  imageUrl?: string | null;
  createdOn?: string;
}

/** Error message dari createCustomCreative call terakhir (untuk debugging API response) */
let lastCreateCustomError: string | null = null;

/** Dapat error message terakhir dari createCustomCreative (untuk API response yang lebih informatif) */
export function getLastCreateCustomError(): string | null {
  return lastCreateCustomError;
}

/**
 * Create Custom Creative di AccessTrade — bikin short link atid.me/go/xxx
 * untuk produk spesifik. Lebih baik dari quicklink karena:
 * - Tracking per produk (di AT dashboard kelihatan klik per custom link)
 * - URL pendek (atid.me/go/xxx) vs quicklink+?url= (panjang)
 * - Bisa kasih name untuk identify di AT dashboard
 *
 * API: POST /v1/publishers/me/sites/{siteId}/campaigns/{campaignId}/creatives/custom
 *
 * @param landingUrl  Full URL produk (WAJIB, cth: https://shopee.co.id/product-xxx)
 * @param name        Label untuk identify di AT dashboard (cth: "Dress Anak Frozen")
 * @param imageUrl    Optional — image produk untuk AT creative preview
 * @returns           Short link atid.me/go/xxx atau null kalau gagal
 */
export async function createCustomCreative(
  landingUrl: string,
  name: string,
  imageUrl?: string
): Promise<ATCustomCreative | null> {
  if (!landingUrl) return null;

  // Validasi: harus URL Shopee ( Accepted URL format di AT form )
  const lowerUrl = landingUrl.toLowerCase();
  const isShopeeUrl =
    lowerUrl.startsWith("https://shopee.co.id") ||
    lowerUrl.startsWith("https://mall.shopee.co.id") ||
    lowerUrl.startsWith("https://shope.ee") ||
    lowerUrl.startsWith("https://id.shp.ee") ||
    lowerUrl.startsWith("https://s.shopee.co.id");

  if (!isShopeeUrl) return null;

  // Kalau sudah atid.me, skip — sudah custom link
  if (lowerUrl.includes("atid.me")) return null;

  try {
    // Cari campaign Shopee
    const campaignId = await findShopeeCampaignId();
    if (!campaignId) {
      console.error("[AT createCustomCreative] Shopee campaign not found");
      return null;
    }

    const creds = await getCreds();
    const path = `/v1/publishers/me/sites/${creds.SITE_ID}/campaigns/${campaignId}/creatives/custom?countryCode=${creds.COUNTRY_CODE}`;

    // Name: max 50 char (AT form limit) — potong judul produk kalau kepanjangan
    const safeName = (name || "").trim().slice(0, 50) || "JB Product";

    const body: Record<string, unknown> = {
      landingUrl,
      name: safeName,
      anchorText: "",
      subIds: [
        { label: "source", value: "jb", name: "source" },
      ],
    };
    if (imageUrl) body.imageUrl = imageUrl;

    const result = await atPostFetch<ATCustomCreativeResponse>(path, body);

    // Parse response — handle 2 format:
    // 1. Format docs: { totalItems, content: [{ affiliateLink, ... }] }
    // 2. Format AT Indonesia: { id, name, affiliateLink, ... } (object langsung, tanpa wrapper)
    let creative: ATCustomCreative | null = null;
    if (result.content && Array.isArray(result.content) && result.content.length > 0) {
      creative = result.content[0];
    } else if (result.affiliateLink) {
      // AT Indonesia return object langsung
      creative = {
        id: result.id || 0,
        name: result.name || safeName,
        affiliateLink: result.affiliateLink,
        landingUrl: result.landingUrl || landingUrl,
        imageUrl: result.imageUrl ?? null,
        createdOn: result.createdOn || new Date().toISOString(),
      };
    }

    if (!creative?.affiliateLink) {
      const respStr = JSON.stringify(result).slice(0, 500);
      console.error("[AT createCustomCreative] No affiliateLink in response:", respStr);
      lastCreateCustomError = `AT response: ${respStr}`;
      return null;
    }
    lastCreateCustomError = null;
    return creative;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[AT createCustomCreative] Failed:", errMsg);
    lastCreateCustomError = errMsg;
    return null;
  }
}

/**
 * Batch generate custom creative untuk multiple produk sekaligus.
 * Rate limit AT: 0.5s per request → 30 produk ≈ 15 detik, 120 produk ≈ 60 detik.
 *
 * @param items  Array of { url, name, imageUrl? }
 * @param onProgress  Callback untuk update progress UI (optional)
 * @returns       Array of { index, url, name, success, affiliateUrl?, error? }
 */
export interface BatchCustomLinkItem {
  url: string;
  name: string;
  imageUrl?: string;
}

export interface BatchCustomLinkResult {
  index: number;
  url: string;
  name: string;
  success: boolean;
  affiliateUrl?: string;
  error?: string;
}

export async function batchCreateCustomCreative(
  items: BatchCustomLinkItem[],
  onProgress?: (done: number, total: number, lastResult: BatchCustomLinkResult) => void
): Promise<BatchCustomLinkResult[]> {
  const results: BatchCustomLinkResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result: BatchCustomLinkResult = {
      index: i,
      url: item.url,
      name: item.name,
      success: false,
    };

    try {
      const creative = await createCustomCreative(item.url, item.name, item.imageUrl);
      if (creative) {
        result.success = true;
        result.affiliateUrl = creative.affiliateLink;
      } else {
        result.error = "Gagal generate (URL tidak valid atau AT API error)";
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }

    results.push(result);
    onProgress?.(i + 1, items.length, result);
  }

  return results;
}
