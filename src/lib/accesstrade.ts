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

const API_BASE = process.env.ACCESSTRADE_API_BASE || "https://gurkha.accesstrade.global";
const USER_UID = process.env.ACCESSTRADE_USER_UID || "";
const SECRET_KEY = process.env.ACCESSTRADE_SECRET_KEY || "";
const COUNTRY_CODE = process.env.ACCESSTRADE_COUNTRY_CODE || "id";
const SITE_ID = process.env.ACCESSTRADE_SITE_ID || "127377";

// ─── JWT Generation ───
function base64Url(obj: object): string {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function generateJwt(): string {
  if (!USER_UID || !SECRET_KEY) {
    throw new Error("ACCESSTRADE_USER_UID or ACCESSTRADE_SECRET_KEY not set");
  }
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: USER_UID, iat: Math.floor(Date.now() / 1000) };
  const data = base64Url(header) + "." + base64Url(payload);
  const sig = crypto
    .createHmac("sha256", SECRET_KEY)
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
  const url = API_BASE + path;
  const jwt = generateJwt();

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
  const path = `/v1/publishers/me/sites/${SITE_ID}/campaigns/affiliated?limit=50&page=1&countryCode=${COUNTRY_CODE}`;
  return atFetch<ATCampaign[]>(path);
}

/** Dapat URL product feed untuk campaign tertentu */
export async function getProductFeedUrl(campaignId: number): Promise<string | null> {
  try {
    const path = `/v1/publishers/me/sites/${SITE_ID}/campaigns/${campaignId}/productfeed/url?countryCode=${COUNTRY_CODE}`;
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

/** Cek apakah AT credentials sudah dikonfigurasi */
export function isAtConfigured(): boolean {
  return !!(USER_UID && SECRET_KEY);
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
    const path = `/v1/publishers/me/sites/${SITE_ID}/campaigns/${campaignId}/creatives/quicklink?countryCode=${COUNTRY_CODE}`;
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

/** Cari campaign Shopee dari affiliated list, return ID-nya */
async function findShopeeCampaignId(): Promise<number | null> {
  if (shopeeCampaignId !== null) return shopeeCampaignId;
  try {
    const campaigns = await getAffiliatedCampaigns();
    const shopeeCampaign = campaigns.find(c => {
      const name = (c.name || "").toLowerCase();
      return name.includes("shopee");
    });
    shopeeCampaignId = shopeeCampaign?.id || null;
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
