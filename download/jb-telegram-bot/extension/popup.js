/**
 * JB Shopee Scraper — v3 DOWNLOAD CSV FILE
 *
 * Cara pakai:
 * 1. Buka Shopee, browsing produk kayak biasa
 * 2. Klik icon extension → "Ambil Semua Produk di Halaman Ini"
 * 3. Buka halaman lain → klik lagi → data nyimpel
 * 4. Klik "💾 Download File CSV" → file .csv ke-download
 * 5. Buka JB admin → Bulk Upload → drag & drop file CSV → upload!
 *
 * GAK butuh server. GAK butuh bot. GAK butuh Node.js.
 * Murni Chrome Extension aja.
 */

// CSV headers — sesuai template JB Bulk Upload
const CSV_HEADERS = 'title,url,image,price,originalPrice,discountPercent,rating,reviewCount,soldCount,location,category,marketplace,affiliateUrl,notes';

// Produk yang udah dikumpul
let collected = [];

// Load dari localStorage (gak hilang kalau popup ditutup)
try {
  const saved = localStorage.getItem('jb_collected');
  if (saved) collected = JSON.parse(saved);
} catch {}

function saveCollected() {
  localStorage.setItem('jb_collected', JSON.stringify(collected));
  updateUI();
}

function updateUI() {
  const countBadge = document.getElementById('countBadge');
  const collectedList = document.getElementById('collectedList');
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');

  countBadge.textContent = collected.length;

  if (collected.length === 0) {
    collectedList.innerHTML = '<div style="color:#666">Belum ada produk</div>';
    downloadCsvBtn.disabled = true;
  } else {
    collectedList.innerHTML = collected.map((p, i) =>
      `<div>${i + 1}. ${esc(p.title.substring(0, 45))}${p.title.length > 45 ? '...' : ''}</div>`
    ).join('');
    downloadCsvBtn.disabled = false;
  }
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// Escape CSV field
function csvField(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildCSV() {
  const lines = [CSV_HEADERS];
  for (const p of collected) {
    lines.push([
      csvField(p.title),
      csvField(p.url),
      csvField(p.image),
      csvField(p.price),
      csvField(p.originalPrice),
      csvField(p.discountPercent),
      csvField(p.rating),
      csvField(p.reviewCount),
      csvField(p.soldCount),
      csvField(p.location),
      csvField(p.category),
      csvField(p.marketplace || 'shopee'),
      csvField(p.affiliateUrl),
      csvField(p.notes),
    ].join(','));
  }
  return lines.join('\r\n'); // Windows line endings
}

// ========== DOWNLOAD CSV FILE ==========
function downloadCSV() {
  const csv = buildCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  a.href = url;
  a.download = `jb-upload-${dateStr}-${collected.length}produk.csv`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  const pageStatus = document.getElementById('pageStatus');
  const scrapePageBtn = document.getElementById('scrapePageBtn');
  const scrapeDetailBtn = document.getElementById('scrapeDetailBtn');
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');
  const clearBtn = document.getElementById('clearBtn');
  const categorySelect = document.getElementById('categorySelect');

  let currentTab = null;
  let isShopee = false;
  let isDetail = false;

  // Cek halaman aktif
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    if (tab.url && tab.url.includes('shopee.co.id')) {
      isShopee = true;
      isDetail = !!tab.url.match(/-i\.\d+\.\d+/);
      if (isDetail) {
        pageStatus.textContent = '📄 Halaman produk detail';
        pageStatus.className = 'page-status ok';
      } else {
        pageStatus.textContent = '🔍 Halaman Shopee — siap ambil!';
        pageStatus.className = 'page-status ok';
      }
    }
  } catch {}

  scrapePageBtn.disabled = !isShopee;
  scrapeDetailBtn.disabled = !(isShopee && isDetail);

  // ====== AMBIL SEMUA PRODUK DI HALAMAN ======
  scrapePageBtn.addEventListener('click', async () => {
    scrapePageBtn.disabled = true;
    scrapePageBtn.textContent = '⏳ Membaca...';

    const category = categorySelect.value;

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: scrapeSearchPage,
        args: [category],
      });

      if (results?.[0]?.result) {
        const products = results[0].result;
        const existingUrls = new Set(collected.map(p => p.url));
        let newCount = 0;
        for (const p of products) {
          if (!existingUrls.has(p.url)) {
            collected.push(p);
            existingUrls.add(p.url);
            newCount++;
          }
        }
        saveCollected();
        scrapePageBtn.textContent = `✅ +${newCount} baru (total ${collected.length})`;
      } else {
        scrapePageBtn.textContent = '❌ Gak bisa baca — scroll dulu?';
      }
    } catch (err) {
      scrapePageBtn.textContent = '❌ Error';
    }

    setTimeout(() => {
      scrapePageBtn.textContent = '📦 Ambil Semua Produk di Halaman Ini';
      scrapePageBtn.disabled = !isShopee;
    }, 2000);
  });

  // ====== AMBIL 1 PRODUK (DETAIL) ======
  scrapeDetailBtn.addEventListener('click', async () => {
    scrapeDetailBtn.disabled = true;
    scrapeDetailBtn.textContent = '⏳ Membaca...';

    const category = categorySelect.value;

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: scrapeProductDetail,
        args: [category],
      });

      if (results?.[0]?.result) {
        const product = results[0].result;
        const existingUrls = new Set(collected.map(p => p.url));

        if (existingUrls.has(product.url)) {
          scrapeDetailBtn.textContent = '⚠️ Udah ada!';
        } else {
          collected.push(product);
          saveCollected();
          scrapeDetailBtn.textContent = `✅ Ditambah! (total ${collected.length})`;
        }
      } else {
        scrapeDetailBtn.textContent = '❌ Gak bisa baca';
      }
    } catch {
      scrapeDetailBtn.textContent = '❌ Error';
    }

    setTimeout(() => {
      scrapeDetailBtn.textContent = '🔍 Ambil 1 Produk (Halaman Detail)';
      scrapeDetailBtn.disabled = !(isShopee && isDetail);
    }, 2000);
  });

  // ====== DOWNLOAD CSV FILE ======
  downloadCsvBtn.addEventListener('click', () => {
    downloadCSV();
    downloadCsvBtn.textContent = `✅ File terdownload! (${collected.length} produk)`;
    setTimeout(() => {
      downloadCsvBtn.textContent = '💾 Download File CSV';
    }, 3000);
  });

  // ====== HAPUS ======
  clearBtn.addEventListener('click', () => {
    if (collected.length === 0) return;
    collected = [];
    saveCollected();
  });

  updateUI();
});


// ================================================================
//  SCRAPING — jalan DI DALAM halaman Shopee
// ================================================================

function scrapeSearchPage(category) {
  const products = [];
  const links = document.querySelectorAll('a[href*="-i."]');

  for (const link of links) {
    try {
      const product = { category, marketplace: 'shopee' };
      const text = link.innerText || '';
      const href = link.getAttribute('href') || '';

      product.url = href.startsWith('/') ? 'https://shopee.co.id' + href : href;

      const idMatch = href.match(/-i\.(\d+)\.(\d+)/);
      if (!idMatch) continue;

      // Judul
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      if (lines.length > 0) product.title = lines[0];
      if (!product.title || product.title.length < 3) continue;

      // Harga
      const priceMatch = text.match(/Rp([\d.]+)/);
      if (priceMatch) product.price = parseInt(priceMatch[1].replace(/\./g, ''), 10);

      // Diskon
      const allPrices = [...text.matchAll(/Rp([\d.]+)/g)];
      if (allPrices.length > 1) {
        const firstPrice = parseInt(allPrices[0][1].replace(/\./g, ''), 10);
        const secondPrice = parseInt(allPrices[1][1].replace(/\./g, ''), 10);
        if (secondPrice > firstPrice) {
          product.originalPrice = secondPrice;
          if (product.originalPrice > 0 && product.price > 0) {
            product.discountPercent = Math.round((1 - product.price / product.originalPrice) * 100);
          }
        }
      }

      // Terjual
      const soldMatch = text.match(/([\d.]+)\s*terjual/i);
      if (soldMatch) {
        product.soldCount = parseInt(soldMatch[1].replace(/\./g, ''), 10);
      } else {
        const rbMatch = text.match(/([\d,]+)\s*rb\s*terjual/i);
        if (rbMatch) product.soldCount = Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);
      }

      // Rating
      const ratingMatch = text.match(/(\d+[,.]\d+)/);
      if (ratingMatch) product.rating = parseFloat(ratingMatch[1].replace(',', '.'));

      // Gambar
      const img = link.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (src && !src.startsWith('data:')) product.image = src;
      }

      if (product.title && product.price) {
        products.push(product);
      }
    } catch {}
  }

  // Hilangkan duplikat
  const seen = new Set();
  return products.filter(p => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
}

function scrapeProductDetail(category) {
  const bodyText = document.body.innerText;
  const url = window.location.href;
  const product = { category, marketplace: 'shopee', url };

  // Judul
  const titleSelectors = ['h1', '[class*="qaNIZv"]', '[class*="WBVL_7"]', '[class*="_44qnta"]', 'span[class*="title"]'];
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 3) {
      product.title = el.textContent.trim();
      break;
    }
  }

  // Harga
  const priceMatch = bodyText.match(/Rp([\d.]+)/);
  if (priceMatch) product.price = parseInt(priceMatch[1].replace(/\./g, ''), 10);

  // Diskon
  const allPrices = [...bodyText.matchAll(/Rp([\d.]+)/g)];
  if (allPrices.length > 1) {
    const secondPrice = parseInt(allPrices[1][1].replace(/\./g, ''), 10);
    if (secondPrice > (product.price || 0)) {
      product.originalPrice = secondPrice;
      if (product.originalPrice > 0 && product.price > 0) {
        product.discountPercent = Math.round((1 - product.price / product.originalPrice) * 100);
      }
    }
  }

  // Terjual
  const soldMatch = bodyText.match(/([\d.]+)\s*terjual/i);
  if (soldMatch) {
    product.soldCount = parseInt(soldMatch[1].replace(/\./g, ''), 10);
  } else {
    const rbMatch = bodyText.match(/([\d,]+)\s*rb\s*terjual/i);
    if (rbMatch) product.soldCount = Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);
  }

  // Rating
  const ratingMatch = bodyText.match(/(\d+[,.]\d+)/);
  if (ratingMatch) product.rating = parseFloat(ratingMatch[1].replace(',', '.'));

  // Lokasi
  const locMatch = bodyText.match(/Dikirim dari\s*([^\n,]+)/i);
  if (locMatch) product.location = locMatch[1].trim();

  // Gambar
  const imgSelectors = ['img[class*="product"]', 'img[src*="susercontent"]', 'img[src*="down-id"]'];
  for (const sel of imgSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      product.image = el.getAttribute('src') || null;
      break;
    }
  }

  return product;
}
