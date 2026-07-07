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
