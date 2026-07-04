#!/usr/bin/env node
/**
 * AI-2: WATCH — Monitor produk & kirim alert viral
 *
 * Fungsi:
 * 1. Baca data produk dari DB production (Neon PostgreSQL)
 * 2. Hitung velocity (estimasi: soldCount / umur_di_JB)
 * 3. Kirim alert ke Telegram kalau ada yang viral
 * 4. Kirim laporan harian
 *
 * Cara jalankan:
 *   npx tsx scripts/ai-watch.ts
 *   npx tsx scripts/ai-watch.ts --report   (laporan harian saja)
 *
 * GAK nyentuh web sama sekali — cuma baca DB + kirim Telegram
 */

// CRITICAL: Set DATABASE_URL SEBELUM import Prisma
// Karena Prisma baca env saat import, bukan saat new PrismaClient()
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
import { sendViralAlertWithButtons, sendReport, sendInfo, sendError } from "./telegram-helper";

console.log("📡 DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 30) + "...");

const prisma = new PrismaClient();

// ========== VIRAL DETECTION ==========
//
// NOTE: Tanpa prevSoldCount, velocity = soldCount / umur_di_JB
// Ini estimasi kasar karena soldCount = total terjual di Shopee (bukan di JB)
// Produk yang baru ditambahkan akan kelihatan "viral" padahal belum tentu
// Jadi kita pakai threshold yang lebih tinggi + minimum umur

const VIRAL_THRESHOLD = 500;    // 500+/hari = VIRAL (tinggi biar gak false alarm)
const TRENDING_THRESHOLD = 200; // 200+/hari = TRENDING
const MIN_AGE_DAYS = 3;         // Minimal 3 hari di JB baru bisa di-evaluasi

async function checkViralProducts() {
  console.log("🔍 AI-2 WATCH: Cek produk viral...");

  try {
    const products = await prisma.shopeeProduct.findMany({
      where: {
        isHidden: false,
        enabled: true,
      },
      orderBy: { soldCount: "desc" },
    });

    if (products.length === 0) {
      await sendInfo("AI-2: Belum ada produk di database. Tambah produk dulu ya!");
      return;
    }

    let alertCount = 0;
    let skippedNew = 0;

    for (const product of products) {
      const created = new Date(product.createdAt);
      const now = new Date();
      const ageMs = now.getTime() - created.getTime();
      const ageDays = Math.max(ageMs / (1000 * 60 * 60 * 24), 0.5);

      // Skip produk yang belum cukup umur di JB
      if (ageDays < MIN_AGE_DAYS) {
        skippedNew++;
        continue;
      }

      const estimatedVelocity = Math.round(product.soldCount / ageDays);

      if (estimatedVelocity >= VIRAL_THRESHOLD && !product.isViral) {
        console.log(`🔥 VIRAL: ${product.title} - ~${estimatedVelocity}/hari`);

        await sendViralAlertWithButtons({
          productId: product.id,
          title: product.title,
          velocity: estimatedVelocity,
          delta: product.soldCount,
          daysSinceLast: Math.round(ageDays * 10) / 10,
          rating: product.rating,
          price: product.price,
          soldCount: product.soldCount,
        });
        alertCount++;
      } else if (estimatedVelocity >= TRENDING_THRESHOLD && !product.isViral) {
        console.log(`📈 TRENDING: ${product.title} - ~${estimatedVelocity}/hari`);

        await sendInfo(
          `📈 <b>Trending:</b> ${product.title}\n` +
          `📊 ~${estimatedVelocity} terjual/hari | Total: ${product.soldCount.toLocaleString("id-ID")}`
        );
        alertCount++;
      }
    }

    if (alertCount === 0) {
      const msg = skippedNew > 0
        ? `AI-2 WATCH: Semua produk stabil. ✅\n📦 ${products.length} produk dicek (${skippedNew} baru, belum cukup umur buat evaluasi).`
        : `AI-2 WATCH: Semua produk stabil. ✅\n📦 ${products.length} produk dicek, gak ada yang perlu di-alert.`;
      await sendInfo(msg);
    } else {
      console.log(`✅ ${alertCount} alert terkirim`);
    }
  } catch (err) {
    console.error("Error:", err);
    await sendError(`AI-2 gagal cek viral: ${err}`);
  }
}

async function sendDailyReport() {
  console.log("📊 AI-2 WATCH: Kirim laporan harian...");

  try {
    const totalProducts = await prisma.shopeeProduct.count({
      where: { isHidden: false },
    });

    const viralCount = await prisma.shopeeProduct.count({
      where: { isHidden: false, isViral: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newProducts = await prisma.shopeeProduct.count({
      where: {
        isHidden: false,
        createdAt: { gte: today },
      },
    });

    const allProducts = await prisma.shopeeProduct.findMany({
      where: { isHidden: false, enabled: true },
      orderBy: { soldCount: "desc" },
      take: 30,
    });

    const topVelocity = allProducts
      .filter((p) => {
        // Hanya produk yang udah cukup umur
        const ageDays = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return ageDays >= MIN_AGE_DAYS;
      })
      .map((p) => {
        const ageDays = Math.max(
          (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24),
          MIN_AGE_DAYS
        );
        return {
          title: p.title.length > 35 ? p.title.substring(0, 35) + "..." : p.title,
          velocity: Math.round(p.soldCount / ageDays),
        };
      })
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 5);

    await sendReport({
      totalProducts,
      viralCount,
      newProducts,
      topVelocity,
      clicksYesterday: 0,
    });
  } catch (err) {
    console.error("Error:", err);
    await sendError(`AI-2 gagal kirim laporan: ${err}`);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  console.log("🤖 AI-2 WATCH mulai...");
  await sendInfo("🤖 AI-2 WATCH aktif! Lagi cek produk...");

  if (args.includes("--report")) {
    await sendDailyReport();
  } else {
    await checkViralProducts();
  }

  await prisma.$disconnect();
  console.log("✅ AI-2 WATCH selesai.");
}

main();
