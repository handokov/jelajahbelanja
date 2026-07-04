/**
 * jb-watch.js — AI-2 WATCH (STANDALONE)
 *
 * Cek produk viral dari database & kirim alert ke Telegram.
 * Alert dikirim dengan tombol Approve/Batal.
 *
 * Cara jalankan:
 *   node jb-watch.js
 *
 * GAK nyentuh web sama sekali — cuma baca DB + kirim Telegram
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== LOAD CONFIG ==========
const envPath = path.join(__dirname, "scripts", ".env.telegram");
if (!fs.existsSync(envPath)) {
  console.error("❌ File .env.telegram gak ketemu di scripts/");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [key, ...rest] = trimmed.split("=");
  const value = rest.join("=").trim();
  if (key && value) envVars[key.trim()] = value;
}

const BOT_TOKEN = envVars.TELEGRAM_BOT_TOKEN;
const CHAT_ID = envVars.TELEGRAM_CHAT_ID;
const DATABASE_URL = envVars.DATABASE_URL;

if (!BOT_TOKEN || !CHAT_ID || !DATABASE_URL) {
  console.error("❌ Isi TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DATABASE_URL di scripts/.env.telegram");
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const { Pool } = pg;

// ========== DATABASE ==========
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// ========== TELEGRAM ==========

async function sendTelegram(text) {
  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
    });
    const data = await res.json();
    if (!data.ok) console.error("❌ Telegram error:", data.description);
    return data.ok;
  } catch (err) {
    console.error("❌ Gagal kirim:", err.message);
    return false;
  }
}

async function sendTelegramWithButtons(text, buttons) {
  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [buttons] },
      }),
    });
    const data = await res.json();
    if (!data.ok) console.error("❌ Telegram error:", data.description);
    return data.ok;
  } catch (err) {
    console.error("❌ Gagal kirim:", err.message);
    return false;
  }
}

function sendInfo(message) {
  return sendTelegram(`ℹ️ ${message}`);
}

function sendError(message) {
  return sendTelegram(`❌ <b>Error:</b> ${message}`);
}

// ========== VIRAL DETECTION ==========

const VIRAL_THRESHOLD = 500;    // 500+/hari = VIRAL
const TRENDING_THRESHOLD = 200; // 200+/hari = TRENDING
const MIN_AGE_DAYS = 3;         // Minimal 3 hari di JB

async function checkViralProducts() {
  console.log("🔍 AI-2 WATCH: Cek produk viral...");

  try {
    const result = await query(
      `SELECT id, title, "soldCount", rating, price, "createdAt", "isViral"
       FROM "ShopeeProduct"
       WHERE "isHidden" = false AND enabled = true
       ORDER BY "soldCount" DESC`
    );

    const products = result.rows;

    if (products.length === 0) {
      await sendInfo("AI-2: Belum ada produk di database. Tambah produk dulu ya!");
      return;
    }

    let alertCount = 0;
    let skippedNew = 0;

    for (const product of products) {
      const created = new Date(product.createdAt);
      const ageDays = Math.max((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24), 0.5);

      if (ageDays < MIN_AGE_DAYS) {
        skippedNew++;
        continue;
      }

      const soldCount = Number(product.soldCount);
      const velocity = Math.round(soldCount / ageDays);

      if (velocity >= VIRAL_THRESHOLD && !product.isViral) {
        console.log(`🔥 VIRAL: ${product.title} - ~${velocity}/hari`);

        const shortTitle = product.title.length > 45
          ? product.title.substring(0, 45) + "..."
          : product.title;

        const text = [
          "🔔 <b>VIRAL ALERT!</b>",
          "",
          `📦 <b>${shortTitle}</b>`,
          `📊 +${soldCount.toLocaleString("id-ID")} terjual dalam ${Math.round(ageDays * 10) / 10} hari (~${velocity.toLocaleString("id-ID")}/hari)`,
          `⭐ Rating ${Number(product.rating).toFixed(1)} | 💰 Rp ${Number(product.price).toLocaleString("id-ID")}`,
          `📦 Total terjual: ${soldCount.toLocaleString("id-ID")}`,
          "",
          "Tandai sebagai viral di JB?",
        ].join("\n");

        const buttons = [
          { text: "✅ Approve", callback_data: `approve:${product.id}` },
          { text: "❌ Batal", callback_data: `reject:${product.id}` },
        ];

        await sendTelegramWithButtons(text, buttons);
        alertCount++;

      } else if (velocity >= TRENDING_THRESHOLD && !product.isViral) {
        console.log(`📈 TRENDING: ${product.title} - ~${velocity}/hari`);

        await sendInfo(
          `📈 <b>Trending:</b> ${product.title}\n` +
          `📊 ~${velocity} terjual/hari | Total: ${soldCount.toLocaleString("id-ID")}`
        );
        alertCount++;
      }
    }

    if (alertCount === 0) {
      const msg = skippedNew > 0
        ? `AI-2 WATCH: Semua produk stabil. ✅\n📦 ${products.length} produk dicek (${skippedNew} baru, belum cukup umur).`
        : `AI-2 WATCH: Semua produk stabil. ✅\n📦 ${products.length} produk dicek, gak ada yang perlu di-alert.`;
      await sendInfo(msg);
    } else {
      console.log(`✅ ${alertCount} alert terkirim`);
    }
  } catch (err) {
    console.error("Error:", err);
    await sendError(`AI-2 gagal cek viral: ${err.message}`);
  }
}

// ========== MAIN ==========

console.log("📡 Database: " + DATABASE_URL.substring(0, 30) + "...");
await sendInfo("🤖 AI-2 WATCH aktif! Lagi cek produk...");
await checkViralProducts();
await pool.end();
console.log("✅ AI-2 WATCH selesai.");
