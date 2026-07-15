/**
 * jb-scrape.js — AI-1: SCRAPER (STANDALONE)
 *
 * Scrape data produk Shopee kayak manusia:
 *   - Pakai browser (Chrome/Edge) yang sudah ada di Windows
 *   - Puppeteer-core (ringan, gak download Chrome)
 *   - Delay random antar request (15-45 detik)
 *   - User agent random + stealth mode
 *
 * Cara jalankan:
 *   node jb-scrape.js            ← scrape semua produk aktif
 *   node jb-scrape.js --quick    ← cuma top 10 produk
 *   node jb-scrape.js --id XYZ   ← scrape 1 produk tertentu
 *
 * GAK nyentuh web sama sekali — cuma baca/tulis DB
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
    return data.ok;
  } catch (err) {
    console.error("❌ Gagal kirim:", err.message);
    return false;
  }
}

// ========== HUMAN-LIKE HELPERS ==========

function randomDelay(minSec, maxSec) {
  const sec = minSec + Math.random() * (maxSec - minSec);
  console.log(`  ⏳ Tunggu ${sec.toFixed(1)} detik...`);
  return new Promise((r) => setTimeout(r, sec * 1000));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
];

function randomUserAgent() {
  return USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)];
}

// ========== BROWSER SETUP ==========

/**
 * Cari browser yang tersedia di Windows
 * Urutan prioritas: Chrome → Edge → Firefox
 */
function findBrowserPath() {
  const candidates = [
    // Chrome
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    // Edge (pasti ada di Windows 10/11!)
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    // Firefox
    "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
    "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Launch browser dengan Puppeteer-core
 * Pakai Chrome/Edge yang sudah ada di komputer
 */
// ⭐ Folder buat simpan session Shopee (login persistent)
const USER_DATA_DIR = path.join(__dirname, "shopee-session");

async function launchBrowser() {
  let puppeteerCore = null;
  let puppeteer = null;

  // Coba puppeteer-core dulu (ringan, gak download Chrome)
  try {
    puppeteerCore = await import("puppeteer-core");
    console.log("  ✅ puppeteer-core tersedia");
  } catch {
    console.log("  ℹ️ puppeteer-core gak ada");
  }

  // Kalau gak ada puppeteer-core, coba puppeteer
  if (!puppeteerCore) {
    try {
      puppeteer = await import("puppeteer");
      console.log("  ✅ puppeteer tersedia");
    } catch {
      console.log("  ❌ puppeteer juga gak ada");
    }
  }

  const pp = puppeteerCore || puppeteer;
  if (!pp) {
    return null;
  }

  const browserPath = findBrowserPath();
  if (!browserPath) {
    console.log("  ❌ Gak ketemu Chrome/Edge/Firefox di komputer!");
    console.log("     Install Chrome: https://www.google.com/chrome/");
    return null;
  }

  const browserName = browserPath.includes("Edge") ? "Edge" :
                      browserPath.includes("Chrome") ? "Chrome" :
                      browserPath.includes("Firefox") ? "Firefox" : "Browser";

  console.log(`  🌐 Pakai ${browserName}: ${browserPath}`);

  try {
    const browser = await (pp.default || pp).launch({
      executablePath: browserPath,
      headless: false,  // ⭐ FALSE biar keliatan = lebih stealth
      userDataDir: USER_DATA_DIR,  // ⭐ SIMPAN SESSION — login sekali, pakai terus!
      ignoreDefaultArgs: ['--enable-automation'],  // ⭐ HAPUS flag yang bikin Shopee deteksi bot!
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-automation",  // ⭐ Tambahan anti-deteksi
        "--disable-infobars",
        "--disable-dev-shm-usage",
        "--window-size=1366,768",
        "--disable-extensions",
        "--disable-component-extensions-with-background-pages",
      ],
    });
    return browser;
  } catch (err) {
    console.log(`  ❌ Gagal launch browser: ${err.message}`);
    return null;
  }
}

/**
 * Cek apakah sudah login Shopee
 * Kalau belum, tunggu user login manual
 */
async function ensureShopeeLogin(page) {
  console.log("🔍 Cek login Shopee...");
  
  // ⭐ Inject stealth SEBELUM navigasi — harus sebelum page load!
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] });
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
    window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
  });
  
  // Buka Shopee
  await page.goto("https://shopee.co.id/", { waitUntil: "networkidle2", timeout: 30000 });
  await randomDelay(3, 5);
  
  // ⭐ Cek login — pakai cookie SPC_EC yang lebih reliable
  const isLoggedIn = await page.evaluate(() => {
    const cookies = document.cookie;
    if (cookies.includes('SPC_EC') || cookies.includes('SPC_R_T_ID')) return true;
    const html = document.body.innerHTML;
    if (html.includes('navbar__username') || html.includes('user-info') || html.includes('account-name')) return true;
    if (html.includes('btn-login') || html.includes('button-login')) return false;
    return false;
  });
  
  if (isLoggedIn) {
    console.log("  ✅ Sudah login Shopee!");
    return true;
  }
  
  // ⭐ BELUM LOGIN — tunggu user login manual
  console.log("");
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  ⚠️  BELUM LOGIN SHOPEE!                ║");
  console.log("║                                          ║");
  console.log("║  Browser sudah terbuka.                  ║");
  console.log("║  Silakan LOGIN SHOPEE di browser:        ║");
  console.log("║  → Klik tombol Log In                    ║");
  console.log("║  → Login pakai HP / email / FB           ║");
  console.log("║                                          ║");
  console.log("║  Setelah login, tekan ENTER di sini...   ║");
  console.log("║                                          ║");
  console.log("║  (Session disimpan, cuma login sekali!)  ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log("");
  
  // Tunggu user tekan ENTER
  await new Promise((resolve) => {
    process.stdin.once("data", () => resolve());
  });
  
  // ⭐ Re-inject stealth sebelum reload
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] });
    window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
  });
  
  await page.goto("https://shopee.co.id/", { waitUntil: "networkidle2", timeout: 30000 });
  await randomDelay(3, 5);
  
  // Reload buat pastiin login
  await page.goto("https://shopee.co.id/", { waitUntil: "networkidle2", timeout: 30000 });
  await randomDelay(2, 4);
  
  console.log("  ✅ Login berhasil! Session disimpan.");
  console.log("  💾 Next run gak perlu login lagi.");
  return true;
}

// ========== SCRAPE SHOPEE (BROWSER MODE) ==========

/**
 * Scrape 1 produk pakai browser
 * Ini cara PALING reliabel — kayak manusia beneran buka Shopee
 */
async function scrapeProductWithBrowser(page, product) {
  try {
    // Stealth: hilangkan webdriver flag + chrome runtime
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["id-ID", "id", "en-US", "en"] });
      window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
    });

    await page.setUserAgent(randomUserAgent());
    await page.setViewport({ width: 1366, height: 768 });

    // Buka halaman produk
    await page.goto(product.url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Tunggu data load — Shopee butuh beberapa detik
    await randomDelay(3, 6);

    // Scroll pelan-pelan kayak manusia baca
    await page.evaluate(() => window.scrollBy(0, 300));
    await randomDelay(1, 3);
    await page.evaluate(() => window.scrollBy(0, 300));
    await randomDelay(1, 2);

    // ⭐ DOM SCRAPING — baca langsung dari halaman yang dirender
    const scraped = await page.evaluate(() => {
      const result = {};
      const bodyText = document.body.innerText;

      // Title — coba berbagai selector
      const titleSelectors = [
        '[class*="qaNIZv"]', '[class*="WBVL_7"]',
        '[class*="_44qnta"]', '[class*="product-name"]',
        'span[class*="title"]', 'h1',
      ];
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 3) {
          result.title = el.textContent.trim();
          break;
        }
      }

      // Price
      const priceMatch = bodyText.match(/Rp([\d.]+)/);
      if (priceMatch) {
        result.price = parseInt(priceMatch[1].replace(/\./g, ""), 10);
      }

      // Sold count
      const soldMatch = bodyText.match(/([\d.]+)\s*terjual/i);
      if (soldMatch) {
        result.soldCount = parseInt(soldMatch[1].replace(/\./g, ""), 10);
      }

      // Rating
      const ratingMatch = bodyText.match(/(\d+[\.,]\d+)/);
      if (ratingMatch) {
        result.rating = parseFloat(ratingMatch[1].replace(",", "."));
      }

      // Location
      const locMatch = bodyText.match(/(?:Dikirim dari|Lokasi)\s*[:\-]?\s*([A-Za-z\s]+)/i);
      if (locMatch) result.location = locMatch[1].trim();

      // Image
      const imgEl = document.querySelector('img[class*="product"], img[src*="susercontent"]');
      if (imgEl) {
        result.image = imgEl.getAttribute("src") || null;
      }

      return result;
    });

    // Kalau DOM scraping kurang, coba fetch API dari dalam browser
    if (!scraped.soldCount || !scraped.price) {
      console.log(`  🔄 DOM kurang — coba API dari browser...`);
      const browserFetchData = await page.evaluate(async (productUrl) => {
        try {
          const match = productUrl.match(/-i\.(\d+)\.(\d+)/) || productUrl.match(/\/product\/(\d+)\/(\d+)/);
          if (!match) return null;

          const shopId = match[1] || match[0];
          const itemId = match[2] || match[1];

          const res = await fetch(`/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`, {
            credentials: "include",
            headers: {
              "Accept": "application/json",
              "x-api-source": "pc",
              "x-shopee-language": "id",
              "afc-access": "1",
            },
          });

          if (!res.ok) return null;
          const data = await res.json();
          if (!data?.data?.item) return null;

          const item = data.data.item;
          return {
            title: item.name,
            price: item.price ? Math.round(item.price / 100000) : null,
            originalPrice: item.price_before_discount ? Math.round(item.price_before_discount / 100000) : null,
            discountPercent: item.raw_discount,
            rating: item.item_rating?.rating_star,
            reviewCount: item.item_rating?.rating_count?.[0],
            soldCount: item.historical_sold || item.sold,
            location: item.shop_location,
            image: item.image ? `https://down-id.img.susercontent.com/file/${item.image}` : null,
          };
        } catch (e) {
          return null;
        }
      }, product.url);

      if (browserFetchData) {
        // Merge: API data lebih lengkap, override DOM data
        Object.assign(scraped, browserFetchData);
      }
    }

    if (scraped.soldCount || scraped.price || scraped.rating) {
      console.log(`  ✅ ${scraped.title?.substring(0, 40)}... | Rp ${scraped.price?.toLocaleString("id-ID")} | ${scraped.soldCount} terjual`);
      return scraped;
    } else {
      console.log(`  ⚠️ Gak bisa extract data`);
      return null;
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return null;
  }
}

// ========== UPDATE DATABASE ==========

async function updateProduct(productId, scraped) {
  const updates = [];
  const values = [productId];
  let paramIdx = 2;

  if (scraped.soldCount !== null && scraped.soldCount !== undefined) {
    updates.push(`"soldCount" = $${paramIdx}`);
    values.push(scraped.soldCount);
    paramIdx++;
  }
  if (scraped.price !== null && scraped.price !== undefined) {
    updates.push(`"price" = $${paramIdx}`);
    values.push(scraped.price);
    paramIdx++;
  }
  if (scraped.rating !== null && scraped.rating !== undefined) {
    updates.push(`"rating" = $${paramIdx}`);
    values.push(scraped.rating);
    paramIdx++;
  }
  if (scraped.originalPrice !== null && scraped.originalPrice !== undefined) {
    updates.push(`"originalPrice" = $${paramIdx}`);
    values.push(scraped.originalPrice);
    paramIdx++;
  }
  if (scraped.discountPercent !== null && scraped.discountPercent !== undefined) {
    updates.push(`"discountPercent" = $${paramIdx}`);
    values.push(scraped.discountPercent);
    paramIdx++;
  }
  if (scraped.reviewCount !== null && scraped.reviewCount !== undefined) {
    updates.push(`"reviewCount" = $${paramIdx}`);
    values.push(scraped.reviewCount);
    paramIdx++;
  }
  if (scraped.location !== null && scraped.location !== undefined) {
    updates.push(`"location" = $${paramIdx}`);
    values.push(scraped.location);
    paramIdx++;
  }

  if (updates.length === 0) return;

  const sql = `UPDATE "ShopeeProduct" SET ${updates.join(", ")} WHERE id = $1`;
  await query(sql, values);
}

// ========== MAIN SCRAPER ==========

async function main() {
  const args = process.argv.slice(2);
  const isQuick = args.includes("--quick");
  const idIdx = args.indexOf("--id");

  console.log("🤖 AI-1 SCRAPER mulai...");
  console.log("📡 Database: " + DATABASE_URL.substring(0, 30) + "...");
  console.log("");

  // ⭐ LAUNCH BROWSER — pakai Chrome/Edge yang sudah ada
  console.log("🌐 Cari browser di komputer...");
  const browser = await launchBrowser();

  if (!browser) {
    const errorMsg =
      `❌ <b>Gak bisa mulai scraper!</b>\n\n` +
      `Butuh browser (Chrome/Edge) + puppeteer-core.\n\n` +
      `Jalankan di CMD:\n` +
      `<code>cd C:\\jb-telegram-bot</code>\n` +
      `<code>npm install puppeteer-core</code>\n\n` +
      `Edge pasti ada di Windows 10/11!`;
    await sendTelegram(errorMsg);
    console.log("\n" + errorMsg.replace(/<[^>]+>/g, ""));
    console.log("\n📌 Cara install puppeteer-core:");
    console.log("   cd C:\\jb-telegram-bot");
    console.log("   npm install puppeteer-core");
    console.log("   (Ringan, cuma ~2MB, gak download Chrome)");
    await pool.end();
    return;
  }

  // Kirim notifikasi ke Telegram
  await sendTelegram(
    `🤖 <b>AI-1 SCRAPER mulai!</b>\n\n` +
    `Mode: Browser (headless)\n` +
    `${isQuick ? "Quick: Top 10 produk" : "Semua produk aktif"}\n\n` +
    `Mulai scrape...`
  );

  // Ambil produk dari DB
  let sql = `SELECT id, title, url, "soldCount" as old_sold FROM "ShopeeProduct" WHERE "isHidden" = false AND enabled = true`;
  const params = [];

  if (idIdx !== -1 && args[idIdx + 1]) {
    sql += ` AND id = $1`;
    params.push(args[idIdx + 1]);
  } else {
    sql += ` ORDER BY "soldCount" DESC`;
  }

  if (isQuick && idIdx === -1) {
    sql += ` LIMIT 10`;
  }

  const result = await query(sql, params);
  const products = result.rows;

  if (products.length === 0) {
    await sendTelegram("⚠️ AI-1: Gak ada produk buat di-scrape.");
    await browser.close();
    await pool.end();
    return;
  }

  console.log(`📦 ${products.length} produk buat di-scrape\n`);

  let successCount = 0;
  let failCount = 0;
  let updatedCount = 0;
  const viralCandidates = [];

  // Buat 1 page, reuse buat semua produk
  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["id-ID", "id", "en-US", "en"] });
    window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
  });
  await page.setUserAgent(randomUserAgent());

  // ⭐ CEK LOGIN — kalau belum login, tunggu user login manual
  await ensureShopeeLogin(page);
  console.log("  ✅ Session siap!\n");

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`\n[${i + 1}/${products.length}] ${product.title.substring(0, 50)}...`);

    const scraped = await scrapeProductWithBrowser(page, product);

    if (scraped) {
      successCount++;

      const oldSold = Number(product.old_sold);
      const newSold = scraped.soldCount;

      if (newSold !== null && oldSold > 0) {
        const delta = newSold - oldSold;
        if (delta > 0) {
          updatedCount++;
          console.log(`  📈 +${delta} terjual sejak terakhir! (${oldSold} → ${newSold})`);

          if (delta >= 100) {
            viralCandidates.push({
              title: product.title,
              delta,
              oldSold,
              newSold,
            });
          }
        }
      }

      await updateProduct(product.id, scraped);
    } else {
      failCount++;
    }

    // Delay random antar produk (15-45 detik)
    if (i < products.length - 1) {
      await randomDelay(15, 45);
    }
  }

  await page.close();
  await browser.close();

  // ========== KIRIM RINGKASAN ==========

  let summary = [
    `🏁 <b>AI-1 SCRAPER selesai!</b>`,
    ``,
    `📦 Total: ${products.length} produk`,
    `✅ Berhasil: ${successCount}`,
    `❌ Gagal: ${failCount}`,
    `📈 Ada perubahan: ${updatedCount}`,
  ].join("\n");

  if (viralCandidates.length > 0) {
    summary += `\n\n🔥 <b>Kandidat Viral:</b>`;
    for (const v of viralCandidates.slice(0, 5)) {
      const shortTitle = v.title.length > 35 ? v.title.substring(0, 35) + "..." : v.title;
      summary += `\n  • ${shortTitle} (+${v.delta.toLocaleString("id-ID")} terjual)`;
    }
    summary += `\n\nJalankan <code>node jb-watch.js</code> buat cek viral alert!`;
  }

  await sendTelegram(summary);
  console.log("\n" + summary.replace(/<[^>]+>/g, ""));

  await pool.end();
  console.log("\n✅ AI-1 SCRAPER selesai.");
}

main();
