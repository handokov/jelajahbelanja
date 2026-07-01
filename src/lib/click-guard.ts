/**
 * Click Fraud Protection — JelajahBelanja
 *
 * Proteksi terhadap:
 * 1. Bot/autoclick — deteksi dari user-agent & headers
 * 2. Rate limit per IP — max klik per menit
 * 3. Click throttling per IP+produk — 1 IP cuma bisa klik produk yang sama sekali per jam
 * 4. Suspicious pattern detection — burst klik dari IP yang sama
 *
 * Semua data disimpan in-memory (Map), reset kalau server restart.
 * Untuk production besar, bisa diganti Redis — tapi untuk skala JelajahBelanja ini cukup.
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Configuration ───
const CONFIG = {
  // Max clicks per IP per minute (global)
  MAX_CLICKS_PER_MINUTE: 15,
  // Max clicks per IP per product per hour
  MAX_CLICKS_PER_PRODUCT_PER_HOUR: 3,
  // Window for rate limiting
  RATE_WINDOW_MS: 60 * 1000, // 1 minute
  // Window for per-product throttling
  PRODUCT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  // Block duration
  BLOCK_DURATION_MS: 30 * 60 * 1000, // 30 minutes
};

// ─── Known bot user-agent patterns ───
const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scrapy/i, /selenium/i,
  /puppeteer/i, /playwright/i, /headless/i, /phantomjs/i,
  /python/i, /curl/i, /wget/i, /httpclient/i, /okhttp/i,
  /java\//i, /go-http/i, /axios/i, /node-fetch/i,
  /autoclick/i, /clicker/i, /macro/i, /autoit/i,
];

// ─── In-memory stores ───

// Global rate limit: IP → { count, resetAt }
const globalClicks = new Map<string, { count: number; resetAt: number }>();

// Per-product throttle: "IP:productId" → { count, resetAt }
const productClicks = new Map<string, { count: number; resetAt: number }>();

// Blocked IPs: IP → unblockAt
const blockedIPs = new Map<string, number>();

// Click log for analytics (last 1000 entries)
const clickLog: Array<{
  ip: string;
  productId: string;
  timestamp: number;
  blocked: boolean;
  reason?: string;
}> = [];
const MAX_LOG_ENTRIES = 1000;

// ─── Cleanup old entries (run occasionally) ───
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return; // Every 5 min
  lastCleanup = now;

  // Clean global clicks
  for (const [ip, entry] of globalClicks) {
    if (now > entry.resetAt) globalClicks.delete(ip);
  }
  // Clean per-product clicks
  for (const [key, entry] of productClicks) {
    if (now > entry.resetAt) productClicks.delete(key);
  }
  // Clean blocked IPs
  for (const [ip, unblockAt] of blockedIPs) {
    if (now > unblockAt) blockedIPs.delete(ip);
  }
}

// ─── Helper: get client IP ───
function getClientIP(req: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  return "unknown";
}

// ─── Helper: detect bots ───
function isBot(req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") || "";

  // No user-agent = suspicious
  if (!ua || ua.length < 10) return true;

  // Check known bot patterns
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) return true;
  }

  // Headless Chrome detection
  if (ua.includes("Chrome") && !ua.includes("Safari") && !ua.includes("Edg")) {
    // Chrome without Safari = likely headless
    return true;
  }

  return false;
}

// ─── Log click ───
function logClick(ip: string, productId: string, blocked: boolean, reason?: string) {
  clickLog.push({ ip, productId, timestamp: Date.now(), blocked, reason });
  // Trim log
  while (clickLog.length > MAX_LOG_ENTRIES) {
    clickLog.shift();
  }
}

// ─── Main guard function ───
// Returns null if OK, or NextResponse if blocked

export interface ClickGuardResult {
  allowed: boolean;
  reason?: string;
  ip: string;
}

export function clickGuard(req: NextRequest, productId: string): ClickGuardResult {
  cleanup();

  const ip = getClientIP(req);

  // 1. Check if IP is blocked
  const unblockAt = blockedIPs.get(ip);
  if (unblockAt && Date.now() < unblockAt) {
    logClick(ip, productId, true, "IP blocked");
    return { allowed: false, reason: "IP blocked — terlalu banyak klik", ip };
  }
  if (unblockAt) {
    blockedIPs.delete(ip); // Unblock expired
  }

  // 2. Bot detection
  if (isBot(req)) {
    logClick(ip, productId, true, "Bot detected");
    return { allowed: false, reason: "Bot/autoclick terdeteksi", ip };
  }

  // 3. Global rate limit (per IP per minute)
  const now = Date.now();
  const globalEntry = globalClicks.get(ip);
  if (!globalEntry || now > globalEntry.resetAt) {
    globalClicks.set(ip, { count: 1, resetAt: now + CONFIG.RATE_WINDOW_MS });
  } else {
    globalEntry.count++;
    if (globalEntry.count > CONFIG.MAX_CLICKS_PER_MINUTE) {
      // Block this IP
      blockedIPs.set(ip, now + CONFIG.BLOCK_DURATION_MS);
      logClick(ip, productId, true, "Rate limit exceeded (global)");
      return { allowed: false, reason: "Terlalu banyak klik — rate limit exceeded", ip };
    }
  }

  // 4. Per-product throttle (per IP per product per hour)
  const productKey = `${ip}:${productId}`;
  const productEntry = productClicks.get(productKey);
  if (!productEntry || now > productEntry.resetAt) {
    productClicks.set(productKey, { count: 1, resetAt: now + CONFIG.PRODUCT_WINDOW_MS });
  } else {
    productEntry.count++;
    if (productEntry.count > CONFIG.MAX_CLICKS_PER_PRODUCT_PER_HOUR) {
      logClick(ip, productId, true, "Product throttle exceeded");
      return { allowed: false, reason: "Klik berulang pada produk yang sama", ip };
    }
  }

  // All checks passed
  logClick(ip, productId, false);
  return { allowed: true, ip };
}

// ─── Get click stats (for admin API) ───
export function getClickStats() {
  const now = Date.now();
  const totalClicks = clickLog.length;
  const blockedClicks = clickLog.filter((e) => e.blocked).length;
  const uniqueIPs = new Set(clickLog.map((e) => e.ip)).size;
  const recentClicks = clickLog.filter((e) => now - e.timestamp < 60 * 1000).length;
  const recentBlocked = clickLog.filter((e) => e.blocked && now - e.timestamp < 60 * 1000).length;
  const currentlyBlocked = blockedIPs.size;

  // Top IPs by click count (potential abusers)
  const ipCounts = new Map<string, number>();
  for (const entry of clickLog) {
    ipCounts.set(entry.ip, (ipCounts.get(entry.ip) || 0) + 1);
  }
  const topIPs = Array.from(ipCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, clicks: count }));

  return {
    totalClicks,
    blockedClicks,
    blockRate: totalClicks > 0 ? ((blockedClicks / totalClicks) * 100).toFixed(1) : "0",
    uniqueIPs,
    recentClicks,
    recentBlocked,
    currentlyBlocked,
    topIPs,
    recentLogs: clickLog.slice(-50).reverse(),
  };
}
