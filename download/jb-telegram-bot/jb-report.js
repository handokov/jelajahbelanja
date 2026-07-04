/**
 * jb-report.js — Laporan Harian JB (STANDALONE)
 *
 * Kirim laporan harian ke Telegram.
 *
 * Cara jalankan:
 *   node jb-report.js
 *
 * GAK nyentuh web sama sekali
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

// ========== REPORT ==========

const MIN_AGE_DAYS = 3;

async function sendDailyReport() {
  console.log("📊 Kirim laporan harian...");

  try {
    const totalResult = await query("SELECT COUNT(*) FROM \"ShopeeProduct\" WHERE \"isHidden\" = false");
    const viralResult = await query("SELECT COUNT(*) FROM \"ShopeeProduct\" WHERE \"isHidden\" = false AND \"isViral\" = true");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newResult = await query(
      "SELECT COUNT(*) FROM \"ShopeeProduct\" WHERE \"isHidden\" = false AND \"createdAt\" >= $1",
      [today.toISOString()]
    );

    const topResult = await query(
      `SELECT title, "soldCount", "createdAt"
       FROM "ShopeeProduct"
       WHERE "isHidden" = false AND enabled = true
       ORDER BY "soldCount" DESC
       LIMIT 30`
    );

    const totalProducts = Number(totalResult.rows[0].count);
    const viralCount = Number(viralResult.rows[0].count);
    const newProducts = Number(newResult.rows[0].count);

    const topVelocity = topResult.rows
      .filter(p => {
        const ageDays = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return ageDays >= MIN_AGE_DAYS;
      })
      .map(p => {
        const ageDays = Math.max(
          (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24),
          MIN_AGE_DAYS
        );
        return {
          title: p.title.length > 35 ? p.title.substring(0, 35) + "..." : p.title,
          velocity: Math.round(Number(p.soldCount) / ageDays),
        };
      })
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 5);

    const topList = topVelocity
      .map((p, i) => `${i + 1}. ${p.title} (${p.velocity.toLocaleString("id-ID")}/hari)`)
      .join("\n");

    const text = [
      "📊 <b>Laporan JB Hari Ini</b>",
      "",
      `📦 Total produk: ${totalProducts}`,
      `🔥 Viral aktif: ${viralCount}`,
      `🆕 Produk baru: ${newProducts}`,
      "",
      "📈 <b>Top Velocity:</b>",
      topList || "Belum ada data",
    ].join("\n");

    await sendTelegram(text);
  } catch (err) {
    console.error("Error:", err);
    await sendTelegram(`❌ <b>Error:</b> Gagal kirim laporan: ${err.message}`);
  }
}

// ========== MAIN ==========

await sendDailyReport();
await pool.end();
console.log("✅ Laporan terkirim.");
