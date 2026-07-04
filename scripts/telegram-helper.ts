/**
 * telegram-helper.ts — Shared Telegram functions buat semua AI agent
 *
 * Cara pakai:
 *   import { sendTelegram, sendViralAlert, sendReport } from "./telegram-helper";
 *   await sendTelegram("Pesan biasa");
 *   await sendViralAlert({ ... });
 */

import * as fs from "fs";
import * as path from "path";

// Load .env.telegram
function loadEnv() {
  const envPath = path.join(__dirname, ".env.telegram");
  if (!fs.existsSync(envPath)) {
    console.error("❌ File .env.telegram gak ketemu di scripts/");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    vars[key.trim()] = rest.join("=").trim();
  }
  return vars;
}

const env = loadEnv();
const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("❌ TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID kosong di .env.telegram");
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Kirim pesan teks biasa ke Telegram
 */
export async function sendTelegram(text: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("❌ Telegram error:", data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error("❌ Gagal kirim Telegram:", err);
    return false;
  }
}

/**
 * Kirim pesan dengan inline keyboard (tombol)
 */
export async function sendTelegramWithButtons(
  text: string,
  buttons: Array<{ text: string; callback_data: string }>
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [buttons],
        },
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("❌ Telegram error:", data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error("❌ Gagal kirim Telegram:", err);
    return false;
  }
}

/**
 * Kirim viral alert dengan text command (fallback tanpa tombol)
 */
export async function sendViralAlert(params: {
  productId: string;
  title: string;
  velocity: number;
  delta: number;
  daysSinceLast: number;
  rating: number;
  price: number;
  soldCount: number;
}): Promise<boolean> {
  const { productId, title, velocity, delta, daysSinceLast, rating, price, soldCount } = params;

  const shortTitle = title.length > 45 ? title.substring(0, 45) + "..." : title;

  const text = [
    "🔔 <b>VIRAL ALERT!</b>",
    "",
    `📦 <b>${shortTitle}</b>`,
    `📊 ~${velocity.toLocaleString("id-ID")}/hari (${delta.toLocaleString("id-ID")} terjual / ${daysSinceLast} hari)`,
    `⭐ Rating ${rating.toFixed(1)} | 💰 Rp ${price.toLocaleString("id-ID")}`,
    `📦 Total terjual: ${soldCount.toLocaleString("id-ID")}`,
    "",
    "Ketik perintah:",
    `<code>/viral ${productId}</code> → ✅ Tandai viral`,
    `<code>/reject ${productId}</code> → ❌ Tolak`,
  ].join("\n");

  return sendTelegram(text);
}

/**
 * Kirim viral alert dengan tombol Approve/Batal (inline keyboard)
 * Tombol callback_data format: "approve:{productId}" atau "reject:{productId}"
 * Bot poller (ai-bot.ts) yang handle callback-nya
 */
export async function sendViralAlertWithButtons(params: {
  productId: string;
  title: string;
  velocity: number;
  delta: number;
  daysSinceLast: number;
  rating: number;
  price: number;
  soldCount: number;
}): Promise<boolean> {
  const { productId, title, velocity, delta, daysSinceLast, rating, price, soldCount } = params;

  const shortTitle = title.length > 45 ? title.substring(0, 45) + "..." : title;

  const text = [
    "🔔 <b>VIRAL ALERT!</b>",
    "",
    `📦 <b>${shortTitle}</b>`,
    `📊 +${delta.toLocaleString("id-ID")} terjual dalam ${daysSinceLast} hari (~${velocity.toLocaleString("id-ID")}/hari)`,
    `⭐ Rating ${rating.toFixed(1)} | 💰 Rp ${price.toLocaleString("id-ID")}`,
    `📦 Total terjual: ${soldCount.toLocaleString("id-ID")}`,
    "",
    "Tandai sebagai viral di JB?",
  ].join("\n");

  const buttons = [
    { text: "✅ Approve", callback_data: `approve:${productId}` },
    { text: "❌ Batal", callback_data: `reject:${productId}` },
  ];

  return sendTelegramWithButtons(text, buttons);
}

/**
 * Kirim laporan harian
 */
export async function sendReport(params: {
  totalProducts: number;
  viralCount: number;
  newProducts: number;
  topVelocity: Array<{ title: string; velocity: number }>;
  clicksYesterday: number;
}): Promise<boolean> {
  const { totalProducts, viralCount, newProducts, topVelocity, clicksYesterday } = params;

  const topList = topVelocity
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.title} (${p.velocity.toLocaleString("id-ID")}/hari)`)
    .join("\n");

  const text = [
    "📊 <b>Laporan JB Hari Ini</b>",
    "",
    `📦 Total produk: ${totalProducts}`,
    `🔥 Viral aktif: ${viralCount}`,
    `🆕 Produk baru: ${newProducts}`,
    `👆 Klik kemarin: ${clicksYesterday}`,
    "",
    "📈 <b>Top Velocity:</b>",
    topList || "Belum ada data",
  ].join("\n");

  return sendTelegram(text);
}

/**
 * Kirim pesan info biasa (log, status, dll)
 */
export async function sendInfo(message: string): Promise<boolean> {
  return sendTelegram(`ℹ️ ${message}`);
}

/**
 * Kirim pesan error
 */
export async function sendError(message: string): Promise<boolean> {
  return sendTelegram(`❌ <b>Error:</b> ${message}`);
}
