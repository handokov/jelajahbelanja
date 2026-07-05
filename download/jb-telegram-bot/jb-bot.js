/**
 * jb-bot.js — JB Telegram Bot + Local Server (STANDALONE)
 *
 * Bot yang dengarkan perintah & tombol Approve/Batal di Telegram.
 * PLUS server HTTP lokal buat terima data dari Chrome Extension.
 *
 * GAK nyentuh web sama sekali — cuma baca/tulis DB + Telegram API.
 *
 * Cara jalankan:
 *   node jb-bot.js
 *
 * Perintah di Telegram:
 *   /help       — Daftar perintah
 *   /status     — Status JB sekarang
 *   /viral ID   — Tandai produk viral
 *   /reject ID  — Cabut viral
 *
 * Chrome Extension:
 *   Extension kirim data ke http://localhost:3456/api/scrape
 *   dan http://localhost:3456/api/discover
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import http from "http";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== LOAD CONFIG ==========
// Cari .env.telegram di: 1) folder yang sama dengan bot, 2) subfolder scripts/
const envPaths = [
  path.join(__dirname, ".env.telegram"),
  path.join(__dirname, "scripts", ".env.telegram"),
];
let envPath = null;
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    envPath = p;
    break;
  }
}

if (!envPath) {
  console.error("");
  console.error("❌ File .env.telegram gak ketemu!");
  console.error("   Taruh file di: " + __dirname + "\\.env.telegram");
  console.error("   Isi dengan: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DATABASE_URL");
  console.error("");
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

// ========== GENERATE ID ==========
function generateId() {
  // Format mirip cuid2: 24 karakter alfanumerik
  return crypto.randomBytes(16).toString("hex").substring(0, 24);
}

// ========== TELEGRAM API ==========

async function sendTelegram(text) {
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
    if (!data.ok) console.error("❌ Telegram error:", data.description);
    return data.ok;
  } catch (err) {
    console.error("❌ Gagal kirim Telegram:", err.message);
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
        reply_markup: { inline_keyboard: buttons },
      }),
    });
    const data = await res.json();
    if (!data.ok) console.error("❌ Telegram error:", data.description);
    return data.ok;
  } catch (err) {
    console.error("❌ Gagal kirim Telegram:", err.message);
    return false;
  }
}

async function answerCallback(callbackQueryId, text = "") {
  try {
    await fetch(`${API_BASE}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (err) {
    console.error("answerCallback error:", err.message);
  }
}

async function editMessageText(chatId, messageId, text) {
  try {
    await fetch(`${API_BASE}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("editMessageText error:", err.message);
  }
}

// ========== COMMAND HANDLERS ==========

async function handleViral(productId) {
  try {
    const result = await query("SELECT * FROM \"ShopeeProduct\" WHERE id = $1", [productId]);
    if (result.rows.length === 0) {
      await sendTelegram(`❌ Produk dengan ID <code>${productId}</code> gak ketemu di database.`);
      return;
    }

    const product = result.rows[0];
    await query("UPDATE \"ShopeeProduct\" SET \"isViral\" = true WHERE id = $1", [productId]);

    await sendTelegram(
      `✅ <b>Ditandai VIRAL!</b>\n\n` +
      `📦 ${product.title}\n` +
      `⭐ ${product.rating} | 💰 Rp ${Number(product.price).toLocaleString("id-ID")}\n` +
      `📊 ${Number(product.soldCount).toLocaleString("id-ID")} terjual\n\n` +
      `Produk ini sekarang muncul dengan badge VIRAL di JB 🔥`
    );
  } catch (err) {
    await sendTelegram(`❌ Gagal update: ${err.message}`);
  }
}

async function handleReject(productId) {
  try {
    const result = await query("SELECT * FROM \"ShopeeProduct\" WHERE id = $1", [productId]);
    if (result.rows.length === 0) {
      await sendTelegram(`❌ Produk dengan ID <code>${productId}</code> gak ketemu di database.`);
      return;
    }

    const product = result.rows[0];
    await query("UPDATE \"ShopeeProduct\" SET \"isViral\" = false WHERE id = $1", [productId]);

    await sendTelegram(
      `❌ <b>Viral dicabut.</b>\n\n` +
      `📦 ${product.title}\n` +
      `Badge VIRAL dihapus dari produk ini.`
    );
  } catch (err) {
    await sendTelegram(`❌ Gagal update: ${err.message}`);
  }
}

async function handleStatus() {
  try {
    const totalResult = await query("SELECT COUNT(*) FROM \"ShopeeProduct\" WHERE \"isHidden\" = false");
    const viralResult = await query("SELECT COUNT(*) FROM \"ShopeeProduct\" WHERE \"isHidden\" = false AND \"isViral\" = true");
    const topResult = await query("SELECT title, \"soldCount\" FROM \"ShopeeProduct\" WHERE \"isHidden\" = false AND enabled = true ORDER BY \"soldCount\" DESC LIMIT 1");

    const totalProducts = Number(totalResult.rows[0].count);
    const viralCount = Number(viralResult.rows[0].count);
    const topProduct = topResult.rows[0];

    const topTitle = topProduct
      ? `${topProduct.title.substring(0, 40)}... (${Number(topProduct.soldCount).toLocaleString("id-ID")} terjual)`
      : "Belum ada";

    await sendTelegram(
      `📊 <b>Status JB</b>\n\n` +
      `📦 Total produk: ${totalProducts}\n` +
      `🔥 Viral aktif: ${viralCount}\n` +
      `🏆 Top produk: ${topTitle}`
    );
  } catch (err) {
    await sendTelegram(`❌ Gagal ambil status: ${err.message}`);
  }
}

async function handleHelp() {
  await sendTelegram(
    `🤖 <b>JB Assistant — Perintah</b>\n\n` +
    `<code>/viral [id]</code> — Tandai produk viral\n` +
    `<code>/reject [id]</code> — Cabut viral\n` +
    `<code>/status</code> — Status JB sekarang\n` +
    `<code>/report</code> — Laporan harian\n` +
    `<code>/help</code> — Daftar perintah\n\n` +
    `💡 Contoh: <code>/viral cmr39udsb000hl204pse9ms21</code>\n\n` +
    `🧩 <b>Chrome Extension</b> juga bisa kirim data produk langsung dari browser!`
  );
}

// ========== CALLBACK HANDLER (TOMBOL) ==========

async function handleCallbackQuery(callbackQuery) {
  const callbackData = callbackQuery.data;
  const chatId = callbackQuery.message?.chat?.id?.toString();
  const messageId = callbackQuery.message?.message_id;
  const fromUser = callbackQuery.from?.first_name || "User";

  console.log(`🔘 Button: ${callbackData} (dari ${fromUser})`);

  if (chatId !== CHAT_ID) {
    await answerCallback(callbackQuery.id, "❌ Gak diizinkan");
    return;
  }

  const [action, productId] = callbackData.split(":");

  if (action === "approve" && productId) {
    await answerCallback(callbackQuery.id, "✅ Ditandai viral!");

    await handleViral(productId);

    await editMessageText(
      chatId,
      messageId,
      `✅ <b>APPROVED — Viral!</b>\n\n` +
      `Produk ditandai viral oleh ${fromUser}.\n` +
      `Badge 🔥 muncul di JB web sekarang.`
    );
  } else if (action === "reject" && productId) {
    await answerCallback(callbackQuery.id, "❌ Ditolak");

    await handleReject(productId);

    await editMessageText(
      chatId,
      messageId,
      `❌ <b>DITOLAK</b>\n\n` +
      `Produk gak ditandai viral.`
    );
  } else if (action === "enable" && productId) {
    // Tombol dari Extension: aktifkan produk baru
    await answerCallback(callbackQuery.id, "✅ Diaktifkan!");

    try {
      await query("UPDATE \"ShopeeProduct\" SET enabled = true WHERE id = $1", [productId]);
      const result = await query("SELECT title FROM \"ShopeeProduct\" WHERE id = $1", [productId]);
      const title = result.rows[0]?.title || "Produk";

      await editMessageText(
        chatId,
        messageId,
        `✅ <b>PRODUK DIAKTIFKAN!</b>\n\n` +
        `📦 ${title}\n\n` +
        `Produk sekarang muncul di JB web.\n` +
        `Diaktifkan oleh ${fromUser}.`
      );
    } catch (err) {
      await editMessageText(chatId, messageId, `❌ Gagal aktifkan: ${err.message}`);
    }
  } else if (action === "disable" && productId) {
    // Tombol dari Extension: tolak produk baru
    await answerCallback(callbackQuery.id, "❌ Ditolak");

    try {
      await query("DELETE FROM \"ShopeeProduct\" WHERE id = $1", [productId]);

      await editMessageText(
        chatId,
        messageId,
        `🗑️ <b>PRODUK DIHAPUS</b>\n\n` +
        `Produk ditolak dan dihapus dari database.\n` +
        `Oleh ${fromUser}.`
      );
    } catch (err) {
      await editMessageText(chatId, messageId, `❌ Gagal hapus: ${err.message}`);
    }
  } else {
    await answerCallback(callbackQuery.id, "❓ Perintah gak dikenali");
  }
}

// ========== LOCAL HTTP SERVER (BUAT CHROME EXTENSION) ==========

const SERVER_PORT = 3456;

/**
 * Handle data dari Extension: SCRAPE (update produk yang sudah ada)
 */
async function handleScrapeRequest(data) {
  const products = data.products || [];
  let updatedCount = 0;
  let newCount = 0;
  const newProducts = [];

  for (const product of products) {
    try {
      // Cek apakah produk sudah ada
      let existing = null;

      if (product.shopId && product.itemId) {
        const result = await query(
          `SELECT id, title FROM "ShopeeProduct" WHERE "shopId" = $1 AND "itemId" = $2`,
          [product.shopId, product.itemId]
        );
        existing = result.rows[0] || null;
      }

      if (existing) {
        // UPDATE produk yang sudah ada
        const updates = [];
        const values = [existing.id];
        let paramIdx = 2;

        if (product.soldCount != null) { updates.push(`"soldCount" = $${paramIdx}`); values.push(product.soldCount); paramIdx++; }
        if (product.price != null) { updates.push(`"price" = $${paramIdx}`); values.push(product.price); paramIdx++; }
        if (product.rating != null) { updates.push(`"rating" = $${paramIdx}`); values.push(product.rating); paramIdx++; }
        if (product.originalPrice != null) { updates.push(`"originalPrice" = $${paramIdx}`); values.push(product.originalPrice); paramIdx++; }
        if (product.discountPercent != null) { updates.push(`"discountPercent" = $${paramIdx}`); values.push(product.discountPercent); paramIdx++; }
        if (product.location != null) { updates.push(`"location" = $${paramIdx}`); values.push(product.location); paramIdx++; }
        if (product.image != null) { updates.push(`"image" = $${paramIdx}`); values.push(product.image); paramIdx++; }

        if (updates.length > 0) {
          await query(`UPDATE "ShopeeProduct" SET ${updates.join(", ")} WHERE id = $1`, values);
          updatedCount++;
          console.log(`  🔄 Update: ${existing.title?.substring(0, 40)}...`);
        }
      } else {
        // PRODUK BARU — insert dengan enabled=false
        const newId = generateId();
        const title = product.title || "Produk tanpa judul";
        const url = product.url || (product.shopId && product.itemId ? `https://shopee.co.id/product-${product.shopId}-${product.itemId}` : "");

        await query(
          `INSERT INTO "ShopeeProduct" 
           (id, title, url, price, "originalPrice", "discountPercent", rating, "soldCount", "reviewCount", location, image, "isHidden", "isViral", enabled, "shopId", "itemId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, false, $12, $13, NOW(), NOW())`,
          [
            newId,
            title,
            url,
            product.price || 0,
            product.originalPrice || null,
            product.discountPercent || null,
            product.rating || null,
            product.soldCount || 0,
            product.reviewCount || null,
            product.location || null,
            product.image || null,
            product.shopId || null,
            product.itemId || null,
          ]
        );

        newCount++;
        newProducts.push({ id: newId, title, price: product.price, soldCount: product.soldCount, rating: product.rating, url });
        console.log(`  🆕 Baru: ${title.substring(0, 40)}...`);
      }
    } catch (err) {
      console.error(`  ❌ Error proses produk: ${err.message}`);
    }
  }

  // Kirim Telegram alert buat produk baru
  for (const p of newProducts) {
    const shortTitle = p.title.length > 50 ? p.title.substring(0, 50) + "..." : p.title;
    await sendTelegramWithButtons(
      `🆕 <b>Produk Baru dari Extension!</b>\n\n` +
      `📦 ${shortTitle}\n` +
      `💰 Rp ${(p.price || 0).toLocaleString("id-ID")}\n` +
      `⭐ ${p.rating || "-"} | 📊 ${(p.soldCount || 0).toLocaleString("id-ID")} terjual\n\n` +
      `<code>${p.id}</code>`,
      [
        [
          { text: "✅ Aktifkan", callback_data: `enable:${p.id}` },
          { text: "❌ Tolak", callback_data: `disable:${p.id}` },
        ]
      ]
    );
  }

  return {
    ok: true,
    totalFound: products.length,
    updatedCount,
    newCount,
    skippedCount: products.length - updatedCount - newCount,
    message: `✅ Selesai! ${updatedCount} diperbarui, ${newCount} produk baru${newCount > 0 ? " — cek Telegram!" : ""}`,
  };
}

/**
 * Handle data dari Extension: DISCOVER (cari produk baru dari halaman search)
 */
async function handleDiscoverRequest(data) {
  // Logic sama dengan handleScrapeRequest tapi fokus ke produk baru
  return await handleScrapeRequest(data);
}

/**
 * Handle data dari Extension: UPDATE PRODUK EXISTING
 */
async function handleUpdateRequest(data) {
  const products = data.products || [];
  let updatedCount = 0;

  for (const product of products) {
    try {
      // Cari produk yang sudah ada
      let existing = null;

      if (product.shopId && product.itemId) {
        const result = await query(
          `SELECT id, title, "soldCount" as old_sold FROM "ShopeeProduct" WHERE "shopId" = $1 AND "itemId" = $2`,
          [product.shopId, product.itemId]
        );
        existing = result.rows[0] || null;
      }

      if (existing) {
        const oldSold = Number(existing.old_sold);
        const newSold = product.soldCount;

        const updates = [];
        const values = [existing.id];
        let paramIdx = 2;

        if (product.soldCount != null) { updates.push(`"soldCount" = $${paramIdx}`); values.push(product.soldCount); paramIdx++; }
        if (product.price != null) { updates.push(`"price" = $${paramIdx}`); values.push(product.price); paramIdx++; }
        if (product.rating != null) { updates.push(`"rating" = $${paramIdx}`); values.push(product.rating); paramIdx++; }
        if (product.originalPrice != null) { updates.push(`"originalPrice" = $${paramIdx}`); values.push(product.originalPrice); paramIdx++; }
        if (product.discountPercent != null) { updates.push(`"discountPercent" = $${paramIdx}`); values.push(product.discountPercent); paramIdx++; }
        if (product.location != null) { updates.push(`"location" = $${paramIdx}`); values.push(product.location); paramIdx++; }
        if (product.image != null) { updates.push(`"image" = $${paramIdx}`); values.push(product.image); paramIdx++; }

        if (updates.length > 0) {
          await query(`UPDATE "ShopeeProduct" SET ${updates.join(", ")} WHERE id = $1`, values);
          updatedCount++;

          // Cek viral candidate
          if (newSold && oldSold > 0) {
            const delta = newSold - oldSold;
            if (delta >= 100) {
              await sendTelegram(
                `🔥 <b>Kandidat Viral!</b>\n\n` +
                `📦 ${existing.title?.substring(0, 50)}...\n` +
                `📈 +${delta.toLocaleString("id-ID")} terjual (${oldSold.toLocaleString("id-ID")} → ${newSold.toLocaleString("id-ID")})\n\n` +
                `<code>/viral ${existing.id}</code> buat aktifkan.`
              );
            }
          }

          console.log(`  🔄 ${existing.title?.substring(0, 40)}... | ${oldSold} → ${newSold || "?"} terjual`);
        }
      } else {
        // Produk baru — insert
        const newId = generateId();
        const title = product.title || "Produk tanpa judul";
        const url = product.url || "";

        await query(
          `INSERT INTO "ShopeeProduct" 
           (id, title, url, price, "originalPrice", "discountPercent", rating, "soldCount", "reviewCount", location, image, "isHidden", "isViral", enabled, "shopId", "itemId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, true, $12, $13, NOW(), NOW())`,
          [
            newId, title, url,
            product.price || 0, product.originalPrice || null, product.discountPercent || null,
            product.rating || null, product.soldCount || 0, product.reviewCount || null,
            product.location || null, product.image || null,
            product.shopId || null, product.itemId || null,
          ]
        );
        updatedCount++;
        console.log(`  🆕 Baru: ${title.substring(0, 40)}...`);
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  const isNewProduct = products.length === 1 && updatedCount === 1;
  const product = products[0];

  return {
    ok: true,
    isNew: isNewProduct && !!product,
    updatedCount,
    totalFound: products.length,
    message: isNewProduct && product
      ? `✅ ${product.title?.substring(0, 40) || "Produk"} — data diperbarui!`
      : `✅ ${updatedCount} produk diperbarui!`,
  };
}

// ========== HTTP SERVER ==========

const httpServer = http.createServer(async (req, res) => {
  // CORS headers — biar Chrome Extension bisa akses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // STATUS endpoint
  if (req.method === "GET" && req.url === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, message: "JB Server online", version: "3.0.0" }));
    return;
  }

  // PRODUCTS endpoint — ambil daftar produk dari DB
  if (req.method === "GET" && req.url === "/api/products") {
    try {
      const result = await query(
        `SELECT id, title, url, price, rating, "soldCount", "shopId", "itemId", enabled, "isViral" 
         FROM "ShopeeProduct" WHERE "isHidden" = false ORDER BY "soldCount" DESC LIMIT 100`
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, products: result.rows }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // SCRAPE endpoint — update data produk (dari detail page)
  if (req.method === "POST" && req.url === "/api/scrape") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        console.log(`\n📥 Extension → SCRAPE: ${data.products?.length || 0} produk dari ${data.pageType || "?"} page`);
        const result = await handleUpdateRequest(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("❌ Scrape error:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // DISCOVER endpoint — cari produk baru (dari search/category page)
  if (req.method === "POST" && req.url === "/api/discover") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        console.log(`\n📥 Extension → DISCOVER: ${data.products?.length || 0} produk dari ${data.pageType || "?"} page`);
        const result = await handleDiscoverRequest(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("❌ Discover error:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // 404 — endpoint gak dikenali
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Endpoint gak dikenali" }));
});

// ========== POLLING LOOP ==========

let lastUpdateId = 0;
let pollErrors = 0;
const MAX_POLL_ERRORS = 5;

async function poll() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000); // 35 detik (30s long-poll + 5s buffer)

  try {
    const res = await fetch(
      `${API_BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=["message","callback_query"]`,
      { signal: controller.signal }
    );
    const data = await res.json();

    // Reset error counter kalau sukses
    pollErrors = 0;

    if (!data.ok || !data.result) return;

    for (const update of data.result) {
      lastUpdateId = update.update_id;

      // Handle tombol (callback_query)
      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
        continue;
      }

      // Handle pesan teks
      const message = update.message;
      if (!message) continue;
      if (message.chat.id.toString() !== CHAT_ID) continue;

      const text = message.text?.trim();
      if (!text) continue;

      console.log(`📩 ${text}`);

      const [command, ...args] = text.split(" ");
      const cmd = command.toLowerCase();

      if (cmd === "/viral" && args[0]) {
        await handleViral(args[0]);
      } else if (cmd === "/reject" && args[0]) {
        await handleReject(args[0]);
      } else if (cmd === "/status") {
        await handleStatus();
      } else if (cmd === "/report") {
        await handleStatus();
      } else if (cmd === "/help" || cmd === "/start") {
        await handleHelp();
      }
    }
  } catch (err) {
    if (err.name === "AbortError") {
      // Timeout — ini normal, coba lagi
      console.log("⏳ Poll timeout, coba lagi...");
    } else {
      pollErrors++;
      console.error(`❌ Poll error (${pollErrors}/${MAX_POLL_ERRORS}): ${err.message}`);

      if (pollErrors >= MAX_POLL_ERRORS) {
        console.error("🚨 Terlalu banyak error! Tunggu 30 detik...");
        await new Promise((r) => setTimeout(r, 30000));
        pollErrors = 0;
      } else {
        // Tunggu sebentar sebelum retry
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ========== MAIN ==========

console.log("🤖 JB Telegram Bot + Extension Server v3.0");
console.log("📡 Database: " + DATABASE_URL.substring(0, 30) + "...");
console.log("📡 Telegram: " + API_BASE.substring(0, 40) + "...");

// Test koneksi dulu
try {
  const testRes = await fetch(`${API_BASE}/getMe`);
  const testData = await testRes.json();
  if (testData.ok) {
    console.log(`✅ Bot terhubung: @${testData.result.username}`);
  } else {
    console.error("❌ Token bot gak valid!");
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Gak bisa konek ke Telegram:", err.message);
  console.error("   Cek jaringan internet kamu!");
  process.exit(1);
}

// Start HTTP server
httpServer.listen(SERVER_PORT, () => {
  console.log(`🖥️ Extension server: http://localhost:${SERVER_PORT}`);
  console.log(`   GET  /api/status    — Cek server`);
  console.log(`   GET  /api/products  — Daftar produk`);
  console.log(`   POST /api/scrape    — Update produk (detail page)`);
  console.log(`   POST /api/discover  — Cari produk baru (search page)`);
});

await sendTelegram(
  `🤖 JB Bot online! v3.0\n\n` +
  `🧩 Extension server: http://localhost:${SERVER_PORT}\n\n` +
  `Ketik /help buat lihat perintah.`
);

// Loop terus — cek pesan baru
console.log("🔄 Mulai polling...\n");
while (true) {
  await poll();
}
