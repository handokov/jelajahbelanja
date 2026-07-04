#!/usr/bin/env node
/**
 * AI-2: BOT — Telegram bot listener
 *
 * Bot yang dengarkan perintah kamu di Telegram:
 *   /viral [id]     → tandai produk sebagai viral
 *   /reject [id]    → tolak viral
 *   /status         → lihat ringkasan
 *   /report         → laporan harian
 *   /help           → daftar perintah
 *
 * Cara jalankan:
 *   bash scripts/bot.sh
 *
 * GAK nyentuh web sama sekali — cuma baca/tulis DB + Telegram
 */

// Set DATABASE_URL SEBELUM import Prisma
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(__dirname, ".env.telegram");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim();
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  }
}

import { PrismaClient } from "@prisma/client";
import { sendTelegram, sendInfo } from "./telegram-helper";

const prisma = new PrismaClient();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

let lastUpdateId = 0;

// ========== COMMAND HANDLERS ==========

async function handleViral(productId: string) {
  try {
    const product = await prisma.shopeeProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      await sendTelegram(`❌ Produk dengan ID <code>${productId}</code> gak ketemu di database.`);
      return;
    }

    await prisma.shopeeProduct.update({
      where: { id: productId },
      data: { isViral: true },
    });

    await sendTelegram(
      `✅ <b>Ditandai VIRAL!</b>\n\n` +
      `📦 ${product.title}\n` +
      `⭐ ${product.rating} | 💰 Rp ${product.price.toLocaleString("id-ID")}\n` +
      `📊 ${product.soldCount.toLocaleString("id-ID")} terjual\n\n` +
      `Produk ini sekarang muncul dengan badge VIRAL di JB 🔥`
    );
  } catch (err) {
    await sendTelegram(`❌ Gagal update: ${err}`);
  }
}

async function handleReject(productId: string) {
  try {
    const product = await prisma.shopeeProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      await sendTelegram(`❌ Produk dengan ID <code>${productId}</code> gak ketemu di database.`);
      return;
    }

    await prisma.shopeeProduct.update({
      where: { id: productId },
      data: { isViral: false },
    });

    await sendTelegram(
      `❌ <b>Viral dicabut.</b>\n\n` +
      `📦 ${product.title}\n` +
      `Badge VIRAL dihapus dari produk ini.`
    );
  } catch (err) {
    await sendTelegram(`❌ Gagal update: ${err}`);
  }
}

async function handleStatus() {
  try {
    const totalProducts = await prisma.shopeeProduct.count({
      where: { isHidden: false },
    });

    const viralCount = await prisma.shopeeProduct.count({
      where: { isHidden: false, isViral: true },
    });

    const topProduct = await prisma.shopeeProduct.findFirst({
      where: { isHidden: false, enabled: true },
      orderBy: { soldCount: "desc" },
    });

    const topTitle = topProduct
      ? `${topProduct.title.substring(0, 40)}... (${topProduct.soldCount.toLocaleString("id-ID")} terjual)`
      : "Belum ada";

    await sendTelegram(
      `📊 <b>Status JB</b>\n\n` +
      `📦 Total produk: ${totalProducts}\n` +
      `🔥 Viral aktif: ${viralCount}\n` +
      `🏆 Top produk: ${topTitle}`
    );
  } catch (err) {
    await sendTelegram(`❌ Gagal ambil status: ${err}`);
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
    `💡 Contoh: <code>/viral cmr39udsb000hl204pse9ms21</code>`
  );
}

// ========== CALLBACK QUERY HANDLER (TOMBOL) ==========

async function handleCallbackQuery(callbackQuery: any) {
  const callbackData = callbackQuery.data as string;
  const chatId = callbackQuery.message?.chat?.id?.toString();
  const messageId = callbackQuery.message?.message_id;
  const fromUser = callbackQuery.from?.first_name || "User";

  console.log(`🔘 Button: ${callbackData} (dari ${fromUser})`);

  // Hanya terima dari chat ID kamu
  if (chatId !== CHAT_ID) {
    await answerCallback(callbackQuery.id, "❌ Gak diizinkan");
    return;
  }

  // Parse callback_data: "approve:{productId}" atau "reject:{productId}"
  const [action, productId] = callbackData.split(":");

  if (action === "approve" && productId) {
    // Jawab callback dulu (hapus loading spinner)
    await answerCallback(callbackQuery.id, "✅ Ditandai viral!");

    // Update database
    await handleViral(productId);

    // Update pesan alert: ganti tombol jadi status
    await editMessageText(
      chatId,
      messageId,
      `✅ <b>APPROVED — Viral!</b>\n\n` +
      `Produk <code>${productId}</code> ditandai viral oleh ${fromUser}.\n` +
      `Badge 🔥 muncul di JB web sekarang.`
    );
  } else if (action === "reject" && productId) {
    await answerCallback(callbackQuery.id, "❌ Ditolak");

    await handleReject(productId);

    await editMessageText(
      chatId,
      messageId,
      `❌ <b>DITOLAK</b>\n\n` +
      `Produk <code>${productId}</code> gak ditandai viral.`
    );
  } else {
    await answerCallback(callbackQuery.id, "❓ Perintah gak dikenali");
  }
}

/**
 * Jawab callback query (hapus loading spinner di tombol)
 */
async function answerCallback(callbackQueryId: string, text?: string) {
  try {
    await fetch(`${API_BASE}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || "",
      }),
    });
  } catch (err) {
    console.error("answerCallback error:", err);
  }
}

/**
 * Edit pesan yang udah terkirim (update setelah tombol ditekan)
 */
async function editMessageText(chatId: string, messageId: number, text: string) {
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
    console.error("editMessageText error:", err);
  }
}

// ========== POLLING LOOP ==========

async function poll() {
  try {
    const res = await fetch(
      `${API_BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=["message","callback_query"]`
    );
    const data = await res.json();

    if (!data.ok || !data.result) return;

    for (const update of data.result) {
      lastUpdateId = update.update_id;

      // Handle tombol inline keyboard (callback_query)
      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
        continue;
      }

      // Handle pesan teks biasa
      const message = update.message;
      if (!message) continue;

      // Hanya terima dari chat ID kamu
      if (message.chat.id.toString() !== CHAT_ID) continue;

      const text = message.text?.trim();
      if (!text) continue;

      console.log(`📩 ${text}`);

      // Parse perintah
      const [command, ...args] = text.split(" ");
      const cmd = command.toLowerCase();

      if (cmd === "/viral" && args[0]) {
        await handleViral(args[0]);
      } else if (cmd === "/reject" && args[0]) {
        await handleReject(args[0]);
      } else if (cmd === "/status") {
        await handleStatus();
      } else if (cmd === "/report") {
        await handleStatus(); // ringkas dulu
      } else if (cmd === "/help" || cmd === "/start") {
        await handleHelp();
      }
    }
  } catch (err) {
    console.error("Poll error:", err);
  }
}

// ========== MAIN ==========

async function main() {
  console.log("🤖 JB Bot mulai dengarkan perintah...");
  console.log("📡 DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 30) + "...");
  await sendInfo("🤖 JB Bot online! Ketik /help buat lihat perintah.");

  // Polling loop — cek pesan baru tiap 2 detik
  while (true) {
    await poll();
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main();
