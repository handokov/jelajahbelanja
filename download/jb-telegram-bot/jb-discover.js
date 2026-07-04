/**
 * jb-discover.js — AI-1: PRODUCT DISCOVERY (STANDALONE)
 *
 * Cari & tambah produk BARU dari Shopee berdasarkan kategori.
 * Pakai browser (Chrome/Edge) — baca langsung dari halaman yang dirender.
 *
 * Cara kayak manusia:
 *   - Buka halaman search Shopee di browser
 *   - Baca produk yang tampil di layar (DOM scraping)
 *   - Klik produk buat ambil detail
 *   - Delay random antar request
 *
 * Cara jalankan:
 *   node jb-discover.js              ← semua kategori (lama!)
 *   node jb-discover.js --cat Beauty ← cuma 1 kategori
 *   node jb-discover.js --top 5      ← top 5 per kategori (default 10)
 *   node jb-discover.js --dry-run    ← cek aja, gak simpan ke DB
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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
];

function randomUserAgent() {
  return USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)];
}

// ========== BROWSER SETUP ==========

function findBrowserPath() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
    "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

// ⭐ Folder buat simpan session Shopee (login persistent)
const USER_DATA_DIR = path.join(__dirname, "shopee-session");

async function launchBrowser() {
  let pp = null;
  try {
    pp = await import("puppeteer-core");
    console.log("  ✅ puppeteer-core tersedia");
  } catch {
    try {
      pp = await import("puppeteer");
      console.log("  ✅ puppeteer tersedia");
    } catch {
      console.log("  ❌ puppeteer-core/puppeteer gak ada");
      return null;
    }
  }

  const browserPath = findBrowserPath();
  if (!browserPath) {
    console.log("  ❌ Gak ketemu Chrome/Edge/Firefox di komputer!");
    return null;
  }

  const browserName = browserPath.includes("Edge") ? "Edge" :
                      browserPath.includes("Chrome") ? "Chrome" : "Browser";
  console.log(`  🌐 Pakai ${browserName}: ${browserPath}`);

  try {
    const browser = await (pp.default || pp).launch({
      executablePath: browserPath,
      headless: false,  // ⭐ FALSE biar keliatan = lebih stealth
      userDataDir: USER_DATA_DIR,  // ⭐ SIMPAN SESSION — login sekali!
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--window-size=1366,768",
        "--disable-infobars",
        "--disable-dev-shm-usage",
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
  
  await page.goto("https://shopee.co.id/", { waitUntil: "networkidle2", timeout: 30000 });
  await randomDelay(2, 4);
  
  const isLoggedIn = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const html = document.body.innerHTML;
    if (html.includes('navbar__username') || html.includes('user-info') || html.includes('account-name')) return true;
    if (html.includes('btn-login') || html.includes('button-login') || bodyText.includes('Log In') || bodyText.includes('Daftar')) return false;
    return false;
  });
  
  if (isLoggedIn) {
    console.log("  ✅ Sudah login Shopee!");
    return true;
  }
  
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
  
  await new Promise((resolve) => {
    process.stdin.once("data", () => resolve());
  });
  
  await page.goto("https://shopee.co.id/", { waitUntil: "networkidle2", timeout: 30000 });
  await randomDelay(2, 4);
  
  console.log("  ✅ Login berhasil! Session disimpan.");
  console.log("  💾 Next run gak perlu login lagi.");
  return true;
}

// ========== STEALTH INJECT ==========

function injectStealth() {
  return `
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] });
    
    // Override permissions query
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
  `;
}

// ========== SHOPEE SEARCH (DOM SCRAPING) ==========

/**
 * Cari produk di Shopee — baca langsung dari halaman!
 * Buka search page → tunggu load → baca produk dari DOM
 */
async function searchShopeeViaBrowser(page, keyword, limit = 20) {
  console.log(`\n🔍 Cari: "${keyword}" (limit: ${limit})`);

  try {
    // Set stealth
    await page.evaluateOnNewDocument(() => {
      eval(injectStealth());
    });
    await page.setUserAgent(randomUserAgent());

    // Buka halaman search Shopee
    const searchUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Tunggu halaman search selesai render
    console.log(`  ⏳ Tunggu halaman search load...`);
    try {
      await page.waitForSelector('[class*="shopee-search-item-result"], [class*="item-grid"], a[href*="-i."]', {
        timeout: 15000,
      });
    } catch {
      console.log(`  ⚠️ Selector search gak ketemu — coba scroll dulu...`);
    }

    // Tunggu extra biar semua card render
    await randomDelay(3, 5);

    // Scroll pelan-pelan buat trigger lazy loading
    for (let scroll = 0; scroll < 3; scroll++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await randomDelay(1, 3);
    }

    // ⭐ SCRAPE DARI DOM — baca produk yang tampil di layar
    const items = await page.evaluate((lim) => {
      const results = [];

      // Cari semua link produk di halaman search
      // Shopee pakai <a> dengan href yang ada -i.shopid.itemid
      const productLinks = document.querySelectorAll('a[href*="-i."]');

      for (const link of productLinks) {
        if (results.length >= lim) break;

        try {
          const href = link.getAttribute("href") || "";

          // Extract shopId dan itemId dari URL
          const urlMatch = href.match(/-i\.(\d+)\.(\d+)/);
          if (!urlMatch) continue;

          const shopId = urlMatch[1];
          const itemId = urlMatch[2];
          const fullUrl = href.startsWith("http") ? href : `https://shopee.co.id${href}`;

          // Cari elemen-elemen data di dalam card produk
          const card = link.closest('[class*="item"]') || link;

          // Title — cari di semua child element
          let title = "";
          const titleEl = card.querySelector('[class*="title"], [class*="name"], [class*="line-clamp"]')
            || card.querySelector('div > div > span');
          if (titleEl) title = titleEl.textContent.trim();

          // Image
          let image = "";
          const imgEl = card.querySelector("img");
          if (imgEl) {
            image = imgEl.getAttribute("src") || imgEl.getAttribute("data-src") || "";
            if (image && !image.startsWith("http")) {
              image = image.startsWith("//") ? `https:${image}` : `https://down-id.img.susercontent.com/file/${image}`;
            }
          }

          // Price
          let price = 0;
          const priceEls = card.querySelectorAll('[class*="price"], [class*="Price"]');
          for (const el of priceEls) {
            const match = el.textContent.match(/Rp([\d.]+)/);
            if (match) {
              price = parseInt(match[1].replace(/\./g, ""), 10);
              break;
            }
          }

          // Sold count
          let soldCount = 0;
          const allText = card.textContent;
          const soldMatch = allText.match(/([\d.]+)\s*terjual/i);
          if (soldMatch) {
            soldCount = parseInt(soldMatch[1].replace(/\./g, ""), 10);
          }

          // Rating
          let rating = 0;
          const ratingMatch = allText.match(/(\d+[\.,]\d+)/);
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1].replace(",", "."));
          }

          // Location
          let location = "";
          const locMatch = allText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)$/);
          if (locMatch) location = locMatch[1];

          // Skip kalau gak ada data penting
          if (!title && !price) continue;

          results.push({
            title: title || `Produk ${shopId}.${itemId}`,
            url: fullUrl,
            image,
            price,
            originalPrice: null,
            discountPercent: null,
            rating,
            reviewCount: 0,
            soldCount,
            location,
            shopId,
            itemId,
          });
        } catch (e) {
          // Skip card yang error
        }
      }

      return results;
    }, limit);

    console.log(`  ✅ Dapat ${items.length} produk dari halaman`);

    // Kalau DOM scraping dapet 0, coba intercept network request
    if (items.length === 0) {
      console.log(`  🔄 DOM kosong — coba tunggu lebih lama...`);
      await randomDelay(5, 8);

      // Scroll lebih banyak
      for (let scroll = 0; scroll < 5; scroll++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await randomDelay(1, 2);
      }

      // Coba lagi
      const items2 = await page.evaluate((lim) => {
        const results = [];
        const productLinks = document.querySelectorAll('a[href*="-i."]');
        for (const link of productLinks) {
          if (results.length >= lim) break;
          try {
            const href = link.getAttribute("href") || "";
            const urlMatch = href.match(/-i\.(\d+)\.(\d+)/);
            if (!urlMatch) continue;
            const shopId = urlMatch[1];
            const itemId = urlMatch[2];
            const fullUrl = href.startsWith("http") ? href : `https://shopee.co.id${href}`;

            const card = link.closest('[class*="item"]') || link;
            let title = "";
            const titleEl = card.querySelector('[class*="line-clamp"]') || card.querySelector("div > div > span");
            if (titleEl) title = titleEl.textContent.trim();

            let image = "";
            const imgEl = card.querySelector("img");
            if (imgEl) {
              image = imgEl.getAttribute("src") || "";
              if (image && !image.startsWith("http") && image.startsWith("//")) {
                image = `https:${image}`;
              }
            }

            let price = 0;
            const allText = card.textContent;
            const priceMatch = allText.match(/Rp([\d.]+)/);
            if (priceMatch) price = parseInt(priceMatch[1].replace(/\./g, ""), 10);

            let soldCount = 0;
            const soldMatch = allText.match(/([\d.]+)\s*terjual/i);
            if (soldMatch) soldCount = parseInt(soldMatch[1].replace(/\./g, ""), 10);

            let rating = 0;
            const ratingMatch = allText.match(/(\d+[\.,]\d+)/);
            if (ratingMatch) rating = parseFloat(ratingMatch[1].replace(",", "."));

            if (!title && !price) continue;

            results.push({
              title: title || `Produk ${shopId}.${itemId}`,
              url: fullUrl,
              image,
              price,
              originalPrice: null,
              discountPercent: null,
              rating,
              reviewCount: 0,
              soldCount,
              location: "",
              shopId,
              itemId,
            });
          } catch (e) {}
        }
        return results;
      }, limit);

      if (items2.length > 0) {
        console.log(`  ✅ Dapat ${items2.length} produk (retry)`);
        return items2;
      }

      // Kalau masih 0, coba ambil dari URL aja
      console.log(`  🔄 Masih kosong — ambil dari URL saja...`);
      const items3 = await page.evaluate(() => {
        const results = [];
        const links = document.querySelectorAll('a[href*="-i."]');
        const seen = new Set();
        for (const link of links) {
          const href = link.getAttribute("href") || "";
          const match = href.match(/-i\.(\d+)\.(\d+)/);
          if (!match) continue;
          const key = `${match[1]}.${match[2]}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            shopId: match[1],
            itemId: match[2],
            url: href.startsWith("http") ? href : `https://shopee.co.id${href}`,
          });
        }
        return results;
      });

      if (items3.length > 0) {
        console.log(`  ✅ Dapat ${items3.length} link produk — ambil detail satu-satu...`);
        const detailedItems = [];
        for (const linkItem of items3.slice(0, limit)) {
          const detail = await getProductDetailFromBrowser(page, linkItem.url, linkItem.shopId, linkItem.itemId);
          if (detail) {
            detailedItems.push(detail);
          }
          await randomDelay(2, 5);
        }
        return detailedItems;
      }
    }

    return items;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return [];
  }
}

/**
 * Ambil detail 1 produk dari halaman produk Shopee
 * (dipakai kalau search page gak bisa di-scrape)
 */
async function getProductDetailFromBrowser(page, productUrl, shopId, itemId) {
  try {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.goto(productUrl, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });

    await randomDelay(3, 5);

    // Scroll
    await page.evaluate(() => window.scrollBy(0, 300));
    await randomDelay(1, 2);
    await page.evaluate(() => window.scrollBy(0, 300));
    await randomDelay(1, 2);

    // Extract dari halaman produk
    const data = await page.evaluate(() => {
      const result = {};

      // Title
      const titleSelectors = [
        '[class*="qaNIZv"]', '[class*="WBVL_7"]',
        '[class*="_44qnta"]', '[class*="product-name"]',
        'span[class*="title"]', 'h1', 'h2',
      ];
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 3) {
          result.title = el.textContent.trim();
          break;
        }
      }

      // Price
      const bodyText = document.body.innerText;
      const priceMatch = bodyText.match(/Rp([\d.]+)/);
      if (priceMatch) {
        result.price = parseInt(priceMatch[1].replace(/\./g, ""), 10);
      }

      // Sold
      const soldMatch = bodyText.match(/([\d.]+)\s*terjual/i);
      if (soldMatch) {
        result.soldCount = parseInt(soldMatch[1].replace(/\./g, ""), 10);
      }

      // Rating
      const ratingMatch = bodyText.match(/(\d+[\.,]\d+)\s*(?:bintang|rating|★)/i);
      if (ratingMatch) {
        result.rating = parseFloat(ratingMatch[1].replace(",", "."));
      }

      // Image
      const imgEl = document.querySelector('img[class*="product"], img[src*="susercontent"]');
      if (imgEl) {
        result.image = imgEl.getAttribute("src") || "";
      }

      // Location
      const locMatch = bodyText.match(/(?:Dikirim dari|Lokasi)\s*[:\-]?\s*([A-Za-z\s]+)/i);
      if (locMatch) result.location = locMatch[1].trim();

      return result;
    });

    return {
      title: data.title || `Produk ${shopId}.${itemId}`,
      url: productUrl,
      image: data.image || "",
      price: data.price || 0,
      originalPrice: null,
      discountPercent: null,
      rating: data.rating || 0,
      reviewCount: 0,
      soldCount: data.soldCount || 0,
      location: data.location || "",
      shopId,
      itemId,
    };
  } catch (err) {
    console.error(`  ❌ Detail error: ${err.message}`);
    return null;
  }
}

// ========== PRODUCT FILTERS ==========

function isGoodProduct(product) {
  if (!product.title || product.title.length < 5) return false;
  if (!product.image) return false;
  if (product.price < 5000) return false;
  // Relax filter — dari DOM gak selalu dapet rating/sold
  if (product.rating > 0 && product.rating < 4.0) return false;
  if (product.soldCount > 0 && product.soldCount < 50) return false;
  return true;
}

// ========== DATABASE OPERATIONS ==========

async function productExists(product) {
  let result = await query(
    `SELECT id FROM "ShopeeProduct" WHERE url = $1`,
    [product.url]
  );
  if (result.rows.length > 0) return result.rows[0].id;

  if (product.shopId && product.itemId) {
    result = await query(
      `SELECT id FROM "ShopeeProduct" WHERE url LIKE $1`,
      [`%.${product.shopId}.${product.itemId}%`]
    );
    if (result.rows.length > 0) return result.rows[0].id;
  }

  return null;
}

async function insertProduct(product, categoryName) {
  const result = await query(
    `INSERT INTO "ShopeeProduct" 
      (id, title, url, image, price, "originalPrice", "discountPercent", 
       rating, "reviewCount", "soldCount", location, category, "isViral", 
       "isPinned", "isHidden", marketplace, enabled, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, false, 'shopee', true, NOW(), NOW())
     RETURNING id`,
    [
      product.title,
      product.url,
      product.image,
      product.price,
      product.originalPrice,
      product.discountPercent,
      product.rating,
      product.reviewCount,
      product.soldCount,
      product.location,
      categoryName,
    ]
  );
  return result.rows[0]?.id;
}

async function updateExistingProduct(existingId, product) {
  await query(
    `UPDATE "ShopeeProduct" SET 
       "soldCount" = $2, price = $3, rating = $4, "updatedAt" = NOW()
     WHERE id = $1`,
    [existingId, product.soldCount, product.price, product.rating]
  );
}

// ========== MAIN DISCOVERY ==========

async function discoverProducts() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const topIdx = args.indexOf("--top");
  const topN = topIdx !== -1 ? parseInt(args[topIdx + 1]) || 10 : 10;
  const catIdx = args.indexOf("--cat");
  const filterCat = catIdx !== -1 ? args[catIdx + 1] : null;

  console.log("🤖 AI-1 DISCOVER mulai...");
  console.log(`📡 Database: ${DATABASE_URL.substring(0, 30)}...`);
  console.log(`⚙️ Mode: ${isDryRun ? "DRY RUN (gak simpan)" : "LIVE"}`);
  console.log(`📦 Top N per keyword: ${topN}`);
  console.log(`📂 Filter kategori: ${filterCat || "Semua"}`);
  console.log("");

  // ⭐ LAUNCH BROWSER (headless: false = keliatan window-nya)
  console.log("🌐 Cari browser di komputer...");
  const browser = await launchBrowser();

  if (!browser) {
    const errorMsg =
      `❌ <b>Gak bisa mulai discover!</b>\n\n` +
      `Butuh browser (Chrome/Edge) + puppeteer-core.\n\n` +
      `Jalankan di CMD:\n` +
      `<code>cd C:\\jb-telegram-bot</code>\n` +
      `<code>npm install puppeteer-core</code>`;
    await sendTelegram(errorMsg);
    console.log("\n" + errorMsg.replace(/<[^>]+>/g, ""));
    await pool.end();
    return;
  }

  // Buat page dan init session
  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["id-ID", "id", "en-US", "en"] });
  });
  await page.setUserAgent(randomUserAgent());

  // ⭐ CEK LOGIN — kalau belum login, tunggu user login manual
  await ensureShopeeLogin(page);
  console.log("  ✅ Session siap!\n");

  // Ambil kategori dari DB
  let catSql = `SELECT name, emoji, keywords, "shopeeCat" FROM "Category" WHERE enabled = true`;
  const catParams = [];
  if (filterCat) {
    catSql += ` AND name ILIKE $1`;
    catParams.push(`%${filterCat}%`);
  }
  catSql += ` ORDER BY name`;

  const catResult = await query(catSql, catParams);
  const categories = catResult.rows;

  if (categories.length === 0) {
    console.log("❌ Gak ada kategori aktif!");
    await browser.close();
    await pool.end();
    return;
  }

  console.log(`📂 ${categories.length} kategori:\n`);
  for (const cat of categories) {
    console.log(`  ${cat.emoji} ${cat.name}: ${cat.keywords}`);
  }

  await sendTelegram(
    `🔍 <b>AI-1 DISCOVER mulai!</b>\n\n` +
    `📂 ${categories.length} kategori\n` +
    `📦 Top ${topN} per keyword\n` +
    `🌐 Mode: Browser (DOM scraping)\n` +
    `${isDryRun ? "🧪 DRY RUN (gak simpan)" : "✅ LIVE"}\n\n` +
    `Mulai cari produk baru...`
  );

  // Stats
  let totalFound = 0;
  let totalAdded = 0;
  let totalUpdated = 0;
  let totalFiltered = 0;
  const newProducts = [];

  for (const cat of categories) {
    const keywords = cat.keywords.split(",").map((k) => k.trim()).filter(Boolean);

    console.log(`\n${cat.emoji} ===== ${cat.name} =====`);

    const keywordsToScrape = keywords.slice(0, 2);

    for (const keyword of keywordsToScrape) {
      const items = await searchShopeeViaBrowser(page, keyword, topN);

      console.log(`  📊 Dapat ${items.length} produk untuk "${keyword}"`);

      for (const item of items) {
        totalFound++;

        if (!isGoodProduct(item)) {
          totalFiltered++;
          continue;
        }

        const existingId = await productExists(item);

        if (existingId) {
          if (!isDryRun) {
            await updateExistingProduct(existingId, item);
            totalUpdated++;
            console.log(`  🔄 Updated: ${item.title.substring(0, 45)}...`);
          }
        } else {
          totalAdded++;
          const shortTitle = item.title.length > 40 ? item.title.substring(0, 40) + "..." : item.title;
          console.log(`  🆕 BARU: ${shortTitle} | Rp ${item.price?.toLocaleString("id-ID")} | ${item.soldCount} terjual`);

          if (!isDryRun) {
            const newId = await insertProduct(item, cat.name);
            newProducts.push({
              id: newId,
              title: item.title,
              price: item.price,
              soldCount: item.soldCount,
              rating: item.rating,
              category: cat.name,
              emoji: cat.emoji,
            });
          }
        }
      }

      if (keywordsToScrape.indexOf(keyword) < keywordsToScrape.length - 1) {
        await randomDelay(30, 60);
      }
    }

    if (categories.indexOf(cat) < categories.length - 1) {
      console.log(`  ⏳ Istirahat antar kategori...`);
      await randomDelay(45, 90);
    }
  }

  await page.close();
  await browser.close();

  // ========== KIRIM RINGKASAN KE TELEGRAM ==========

  let summary = [
    `🏁 <b>AI-1 DISCOVER selesai!</b>`,
    ``,
    `🔍 Total ditemukan: ${totalFound}`,
    `🆕 Produk baru: ${totalAdded}`,
    `🔄 Diupdate: ${totalUpdated}`,
    `✅ Lolos filter: ${totalFound - totalFiltered}`,
    `❌ Difilter (kualitas rendah): ${totalFiltered}`,
    `${isDryRun ? "\n🧪 DRY RUN — gak ada yang disimpan" : ""}`,
  ].join("\n");

  if (newProducts.length > 0 && !isDryRun) {
    summary += `\n\n🆕 <b>Produk Baru Ditambahkan:</b>`;

    for (const p of newProducts.slice(0, 10)) {
      const shortTitle = p.title.length > 35 ? p.title.substring(0, 35) + "..." : p.title;
      summary += `\n${p.emoji} ${shortTitle}`;
      summary += `\n   💰 Rp ${p.price?.toLocaleString("id-ID")} | ⭐ ${p.rating} | 📦 ${p.soldCount} terjual`;
    }

    if (newProducts.length > 10) {
      summary += `\n\n...dan ${newProducts.length - 10} produk lainnya`;
    }

    for (const p of newProducts) {
      if (p.soldCount >= 1000) {
        const shortTitle = p.title.length > 45 ? p.title.substring(0, 45) + "..." : p.title;
        await sendTelegramWithButtons(
          [
            `🔥 <b>PRODUK VIRAL BARU!</b>`,
            ``,
            `📦 <b>${shortTitle}</b>`,
            `📊 ${p.soldCount.toLocaleString("id-ID")} terjual | ⭐ ${p.rating}`,
            `💰 Rp ${p.price?.toLocaleString("id-ID")}`,
            `📂 ${p.emoji} ${p.category}`,
            ``,
            `Tandai sebagai viral di JB?`,
          ].join("\n"),
          [
            { text: "✅ Approve", callback_data: `approve:${p.id}` },
            { text: "❌ Batal", callback_data: `reject:${p.id}` },
          ]
        );
        await randomDelay(3, 8);
      }
    }
  }

  await sendTelegram(summary);
  console.log("\n" + summary.replace(/<[^>]+>/g, ""));

  await pool.end();
  console.log("\n✅ AI-1 DISCOVER selesai.");
}

discoverProducts();
