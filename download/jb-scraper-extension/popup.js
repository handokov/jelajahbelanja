/**
 * JB Shopee Scraper + Accesstrade Converter — v6
 *
 * FIX v6:
 * - Fix: deteksi URL format /product/shopId/itemId (bukan cuma -i.shopId.itemId)
 * - Fix: tombol "Ambil 1 Produk" aktif di kedua format URL
 * - Fix: shopId/itemId di-extract dari kedua format URL
 *
 * FIX v5:
 * - Fix: gambar ambil dari meta og:image (paling reliable)
 * - Fix: rating/reviewCount/soldCount diambil dari Shopee API v4 langsung
 * - Fix: selector gambar diperbaiki supaya nggak ambil logo Shopee
 *
 * 2 Tab:
 * 1. Scrape Shopee — ambil produk langsung dari halaman Shopee
 * 2. Convert Accesstrade — convert CSV Accesstrade ke format JB
 *
 * GAK butuh server. GAK butuh bot. GAK butuh Node.js.
 */

// CSV headers — sesuai template JB Bulk Upload
const CSV_HEADERS = 'title,url,image,price,originalPrice,discountPercent,rating,reviewCount,soldCount,location,category,marketplace,affiliateUrl,notes';

// Produk yang udah dikumpul dari Scrape Shopee
let collected = [];

// Produk dari Accesstrade CSV
let accesstradeProducts = [];

// Load dari localStorage
try {
  const saved = localStorage.getItem('jb_collected');
  if (saved) collected = JSON.parse(saved);
} catch {}

function saveCollected() {
  localStorage.setItem('jb_collected', JSON.stringify(collected));
  updateUI();
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function csvField(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildCSV(products) {
  const lines = [CSV_HEADERS];
  for (const p of products) {
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
  return lines.join('\r\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== ACCESSTRADE CSV PARSER ==========

function parseAccesstradeCSV(text) {
  const products = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    // Accesstrade CSV pakai koma sebagai separator
    // Tapi ada field yang mengandung koma di dalam kutip
    const fields = parseCSVLine(line);

    if (fields.length < 10) continue;

    try {
      const productId = (fields[0] || '').replace('?', '').trim();
      const title = (fields[1] || '').trim();
      const image = (fields[2] || '').trim();
      // fields[3] biasanya kosong
      const affiliateLink1 = (fields[4] || '').trim(); // s.shopee.co.id link
      const affiliateLink2 = (fields[5] || '').trim(); // atid.me link (LEBIH BAIK)
      const description = (fields[6] || '').trim();
      const price = parseInt((fields[7] || '0').replace(/[^\d]/g, ''), 10);
      const originalPrice = parseInt((fields[8] || '0').replace(/[^\d]/g, ''), 10);
      // fields[9] = stock/flag
      const category = (fields[14] || '').trim(); // Kategori utama
      const subCategory = (fields[16] || '').trim();
      const subSubCategory = (fields[18] || '').trim();
      const currency = (fields[19] || '').trim();
      const brand = (fields[20] || '').trim();

      // Skip kalau gak ada data penting
      if (!productId || !title || !price) continue;
      if (currency && currency !== 'IDR') continue;

      // Extract shopId dan itemId dari affiliate link
      let shopId = '', itemId = productId;
      const urlMatch = affiliateLink1.match(/product%2F(\d+)%2F(\d+)/) ||
                       affiliateLink1.match(/product\/(\d+)\/(\d+)/);
      if (urlMatch) {
        shopId = urlMatch[1];
        itemId = urlMatch[2];
      }

      // Buat URL Shopee
      const shopeeUrl = shopId && itemId
        ? `https://shopee.co.id/universal-link/product/${shopId}/${itemId}`
        : `https://shopee.co.id/product-${productId}`;

      // Pilih affiliate link terbaik (atid.me lebih trackable)
      const affiliateUrl = affiliateLink2 || affiliateLink1 || '';

      // Bersihin deskripsi (hapus HTML tags)
      const cleanDesc = description
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);

      // Map kategori Accesstrade ke JB
      const jbCategory = mapCategory(category, subCategory, subSubCategory);

      // Hitung diskon
      let discountPercent = null;
      if (originalPrice > 0 && price > 0 && originalPrice > price) {
        discountPercent = Math.round((1 - price / originalPrice) * 100);
      }

      products.push({
        title: title.substring(0, 200),
        url: shopeeUrl,
        image: image,
        price: price,
        originalPrice: originalPrice > price ? originalPrice : null,
        discountPercent: discountPercent,
        rating: null, // Accesstrade gak kasih rating
        reviewCount: null,
        soldCount: null,
        location: null,
        category: jbCategory,
        marketplace: 'shopee',
        affiliateUrl: decodeURIComponent(affiliateUrl),
        notes: brand && brand !== 'NoBrand' ? `Brand: ${brand}` : '',
      });
    } catch {}
  }

  return products;
}

// Parse CSV line yang handle kutip dua
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// Map kategori Accesstrade ke JB
function mapCategory(cat, subCat, subSubCat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('fashion') || c.includes('muslim fashion')) return 'Fashion';
  if (c.includes('beauty') || c.includes('health')) return 'Beauty';
  if (c.includes('home') || c.includes('living')) return 'Home & Living';
  if (c.includes('gadget') || c.includes('electronic') || c.includes('computer') || c.includes('mobile')) return 'Electronics';
  if (c.includes('sport') || c.includes('outdoor')) return 'Sports';
  if (c.includes('food') || c.includes('beverage')) return 'Food & Beverage';
  if (c.includes('baby') || c.includes('mom') || c.includes('kid')) return 'Kids & Baby';
  if (c.includes('automotive') || c.includes('motor') || c.includes('car')) return 'Automotive';
  if (c.includes('book') || c.includes('stationery')) return 'Books & Stationery';
  if (c.includes('pet')) return 'Pets';
  return 'Fashion'; // default
}

// ========== UI ==========

function updateUI() {
  const countBadge = document.getElementById('countBadge');
  const collectedList = document.getElementById('collectedList');
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');

  if (countBadge) {
    countBadge.textContent = collected.length;
  }

  if (collectedList) {
    if (collected.length === 0) {
      collectedList.innerHTML = '<div style="color:#666">Belum ada produk</div>';
    } else {
      collectedList.innerHTML = collected.map((p, i) =>
        `<div>${i + 1}. ${esc(p.title.substring(0, 45))}${p.title.length > 45 ? '...' : ''} <span style="color:#4caf50">${p.rating ? '⭐' + p.rating.toFixed(1) : '⏳'}</span></div>`
      ).join('');
    }
  }

  if (downloadCsvBtn) {
    downloadCsvBtn.disabled = collected.length === 0;
  }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ===== TAB 1: SCRAPE SHOPEE =====
  const pageStatus = document.getElementById('pageStatus');
  const scrapePageBtn = document.getElementById('scrapePageBtn');
  const scrapeDetailBtn = document.getElementById('scrapeDetailBtn');
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');
  const clearBtn = document.getElementById('clearBtn');
  const categorySelect = document.getElementById('categorySelect');

  let currentTab = null;
  let isShopee = false;
  let isDetail = false;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    if (tab.url && tab.url.includes('shopee.co.id')) {
      isShopee = true;
      // Deteksi halaman detail — 2 format URL:
      // 1. https://shopee.co.id/nama-produk-i.123.456  (format lama)
      // 2. https://shopee.co.id/product/123/456        (format baru)
      const urlMatch1 = tab.url.match(/-i\.(\d+)\.(\d+)/);
      const urlMatch2 = tab.url.match(/\/product\/(\d+)\/(\d+)/);
      isDetail = !!(urlMatch1 || urlMatch2);
      if (isDetail) {
        pageStatus.textContent = '📄 Halaman produk detail';
        pageStatus.className = 'page-status ok';
      } else {
        pageStatus.textContent = '🔍 Halaman Shopee — siap ambil!';
        pageStatus.className = 'page-status ok';
      }
    }
  } catch {}

  if (scrapePageBtn) scrapePageBtn.disabled = !isShopee;
  if (scrapeDetailBtn) scrapeDetailBtn.disabled = !(isShopee && isDetail);

  // Scrape halaman
  if (scrapePageBtn) {
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
      } catch {
        scrapePageBtn.textContent = '❌ Error';
      }

      setTimeout(() => {
        scrapePageBtn.textContent = '📦 Ambil Semua Produk di Halaman Ini';
        scrapePageBtn.disabled = !isShopee;
      }, 2000);
    });
  }

  // Scrape detail — v5: pakai Shopee API + meta tags
  if (scrapeDetailBtn) {
    scrapeDetailBtn.addEventListener('click', async () => {
      scrapeDetailBtn.disabled = true;
      scrapeDetailBtn.textContent = '⏳ Membaca...';

      const category = categorySelect.value;

      try {
        // Step 1: Scrape basic data dari DOM
        const domResults = await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: scrapeProductDetail,
          args: [category],
        });

        const product = domResults?.[0]?.result;

        if (!product || !product.title) {
          scrapeDetailBtn.textContent = '❌ Gak bisa baca';
          setTimeout(() => {
            scrapeDetailBtn.textContent = '🔍 Ambil 1 Produk (Halaman Detail)';
            scrapeDetailBtn.disabled = !(isShopee && isDetail);
          }, 2000);
          return;
        }

        // Step 2: Ambil data lengkap dari Shopee API v4
        const url = currentTab.url;
        // Support 2 format URL:
        // 1. -i.shopId.itemId  (format lama)
        // 2. /product/shopId/itemId  (format baru)
        const idMatch = url.match(/-i\.(\d+)\.(\d+)/) || url.match(/\/product\/(\d+)\/(\d+)/);
        if (idMatch) {
          const shopId = idMatch[1];
          const itemId = idMatch[2];

          try {
            const apiResults = await chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: fetchShopeeApiInPage,
              args: [shopId, itemId],
            });

            const apiData = apiResults?.[0]?.result;
            if (apiData) {
              // Override dengan data API (lebih akurat)
              if (apiData.image) product.image = apiData.image;
              if (apiData.rating) product.rating = apiData.rating;
              if (apiData.reviewCount) product.reviewCount = apiData.reviewCount;
              if (apiData.soldCount) product.soldCount = apiData.soldCount;
              if (apiData.price && apiData.price > 0) product.price = apiData.price;
              if (apiData.originalPrice && apiData.originalPrice > 0) product.originalPrice = apiData.originalPrice;
              if (apiData.location) product.location = apiData.location;
              if (apiData.title) product.title = apiData.title;
              if (apiData.discountPercent) product.discountPercent = apiData.discountPercent;
            }
          } catch (e) {
            console.log('Shopee API fallback to DOM data:', e);
          }
        }

        const existingUrls = new Set(collected.map(p => p.url));
        if (existingUrls.has(product.url)) {
          scrapeDetailBtn.textContent = '⚠️ Udah ada!';
        } else {
          collected.push(product);
          saveCollected();
          scrapeDetailBtn.textContent = `✅ Ditambah! ⭐${product.rating?.toFixed(1) || '?'} 📦${product.soldCount || 0} (total ${collected.length})`;
        }
      } catch {
        scrapeDetailBtn.textContent = '❌ Error';
      }

      setTimeout(() => {
        scrapeDetailBtn.textContent = '🔍 Ambil 1 Produk (Halaman Detail)';
        scrapeDetailBtn.disabled = !(isShopee && isDetail);
      }, 2000);
    });
  }

  // Download CSV
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', () => {
      const csv = buildCSV(collected);
      downloadCSV(csv, `jb-upload-${collected.length}produk.csv`);
      downloadCsvBtn.textContent = `✅ File terdownload! (${collected.length} produk)`;
      setTimeout(() => { downloadCsvBtn.textContent = '💾 Download File CSV (Format JB)'; }, 3000);
    });
  }

  // Clear
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (collected.length === 0) return;
      collected = [];
      saveCollected();
    });
  }

  // ===== TAB 2: CONVERT ACCESSTRADE =====
  const selectFileBtn = document.getElementById('selectFileBtn');
  const fileInput = document.getElementById('fileInput');
  const convertBtn = document.getElementById('convertBtn');
  const convertStatus = document.getElementById('convertStatus');

  if (selectFileBtn) {
    selectFileBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      selectFileBtn.textContent = '⏳ Membaca file...';

      try {
        const text = await file.text();

        convertStatus.style.display = 'block';
        convertStatus.textContent = '⏳ Parsing CSV Accesstrade...';
        convertStatus.className = 'page-status info';

        // Parse CSV
        accesstradeProducts = parseAccesstradeCSV(text);

        convertStatus.textContent = `✅ Ditemukan ${accesstradeProducts.length} produk! Atur filter lalu klik Convert.`;
        convertStatus.className = 'page-status ok';

        selectFileBtn.textContent = `📂 ${file.name} (${accesstradeProducts.length} produk)`;
        convertBtn.disabled = false;

      } catch (err) {
        convertStatus.textContent = `❌ Error: ${err.message}`;
        convertStatus.className = 'page-status no';
        selectFileBtn.textContent = '📂 Pilih File CSV Accesstrade';
      }
    });
  }

  if (convertBtn) {
    convertBtn.addEventListener('click', () => {
      const minPrice = parseInt(document.getElementById('minPrice')?.value || '0', 10);
      const maxPrice = parseInt(document.getElementById('maxPrice')?.value || '999999999', 10);
      const maxProducts = parseInt(document.getElementById('maxProducts')?.value || '200', 10);
      const catFilter = (document.getElementById('catFilter')?.value || '').toLowerCase().trim();

      convertBtn.disabled = true;
      convertBtn.textContent = '⏳ Converting...';

      // Filter produk
      let filtered = accesstradeProducts.filter(p => {
        if (p.price < minPrice) return false;
        if (maxPrice && p.price > maxPrice) return false;
        if (catFilter && !(p.category || '').toLowerCase().includes(catFilter)) return false;
        return true;
      });

      // Limit jumlah
      filtered = filtered.slice(0, maxProducts);

      if (filtered.length === 0) {
        convertStatus.textContent = '❌ Gak ada produk yang lolos filter. Coba ubah filter.';
        convertStatus.className = 'page-status no';
        convertBtn.disabled = false;
        convertBtn.textContent = '💾 Convert & Download CSV (Format JB)';
        return;
      }

      // Build & download CSV
      const csv = buildCSV(filtered);
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      downloadCSV(csv, `jb-accesstrade-${dateStr}-${filtered.length}produk.csv`);

      convertStatus.textContent = `✅ Done! ${filtered.length} produk di-download (dari ${accesstradeProducts.length} total).`;
      convertStatus.className = 'page-status ok';

      convertBtn.disabled = false;
      convertBtn.textContent = '💾 Convert & Download CSV (Format JB)';
    });
  }

  updateUI();

  // ===== TAB 2: PASTE LINK =====
  const linkInput = document.getElementById('linkInput');
  const fetchLinkBtn = document.getElementById('fetchLinkBtn');
  const linkStatus = document.getElementById('linkStatus');
  const linkCategorySelect = document.getElementById('linkCategorySelect');
  const linkDownloadBtn = document.getElementById('linkDownloadBtn');
  const linkClearBtn = document.getElementById('linkClearBtn');
  const linkCountBadge = document.getElementById('linkCountBadge');
  const linkCollectedList = document.getElementById('linkCollectedList');

  // Shared collected array — same as scrape tab
  function updateLinkUI() {
    if (linkCountBadge) linkCountBadge.textContent = collected.length;
    if (linkCollectedList) {
      if (collected.length === 0) {
        linkCollectedList.innerHTML = '<div style="color:#666">Belum ada produk</div>';
      } else {
        linkCollectedList.innerHTML = collected.map((p, i) =>
          `<div>${i + 1}. ${esc(p.title.substring(0, 45))}${p.title.length > 45 ? '...' : ''} <span style="color:#4caf50">${p.rating ? '⭐' + p.rating.toFixed(1) : '⏳'}</span></div>`
        ).join('');
      }
    }
    if (linkDownloadBtn) linkDownloadBtn.disabled = collected.length === 0;
  }

  // Parse shopId & itemId from various Shopee URL formats
  function parseShopeeUrl(url) {
    // Format 1: https://shopee.co.id/nama-produk-i.1291923399.28837840128
    let m = url.match(/-i\.(\d+)\.(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2] };

    // Format 2: https://shopee.co.id/product/1291923399/28837840128
    m = url.match(/\/product\/(\d+)\/(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2] };

    return null;
  }

  // Fetch product data via Shopee API v4 (runs in background script context)
  async function fetchProductFromLink(shopId, itemId, category, affiliateUrl) {
    try {
      // We need to fetch from Shopee API — use background fetch
      const apiUrl = `https://shopee.co.id/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;

      const resp = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Shopee-Language': 'id',
          'X-API-SOURCE': 'pc',
        },
      });

      const data = await resp.json();
      if (!data.data) return null;

      const item = data.data;
      const product = {
        category,
        marketplace: 'shopee',
        url: `https://shopee.co.id/product/${shopId}/${itemId}`,
        affiliateUrl: affiliateUrl || '',
      };

      if (item.name) product.title = item.name;

      // Gambar
      if (item.image) {
        product.image = `https://down-id.img.susercontent.com/file/${item.image}`;
      } else if (item.images && item.images.length > 0) {
        product.image = `https://down-id.img.susercontent.com/file/${item.images[0]}`;
      }

      // Harga
      const priceMin = item.price_min || item.price;
      if (priceMin) {
        const priceVal = Array.isArray(priceMin) ? priceMin[0] : priceMin;
        product.price = typeof priceVal === 'number' ? priceVal : parseInt(String(priceVal), 10);
      }

      const priceBeforeDiscount = item.price_min_before_discount || item.price_before_discount;
      if (priceBeforeDiscount) {
        const origVal = Array.isArray(priceBeforeDiscount) ? priceBeforeDiscount[0] : priceBeforeDiscount;
        const origPrice = typeof origVal === 'number' ? origVal : parseInt(String(origVal), 10);
        if (origPrice > 0) {
          product.originalPrice = origPrice;
          const p = product.price || 0;
          if (origPrice > p) {
            product.discountPercent = Math.round(((origPrice - p) / origPrice) * 100);
          }
        }
      }

      // Rating & Review
      if (item.item_rating) {
        product.rating = item.item_rating.rating_star || 0;
        const ratingCount = item.item_rating.rating_count || [];
        product.reviewCount = Array.isArray(ratingCount)
          ? ratingCount.reduce((sum, c) => sum + (c || 0), 0)
          : 0;
      }

      // Terjual
      if (item.historical_sold !== undefined && item.historical_sold !== null) {
        product.soldCount = item.historical_sold;
      } else if (item.sold !== undefined && item.sold !== null) {
        product.soldCount = item.sold;
      }

      // Lokasi
      if (item.shop_location) product.location = item.shop_location;

      return product;
    } catch (e) {
      console.error('fetchProductFromLink error:', e);
      return null;
    }
  }

  // Resolve short link (s.shopee.co.id) to get the real URL
  async function resolveShortLink(shortUrl) {
    try {
      const resp = await fetch(shortUrl, {
        method: 'GET',
        redirect: 'follow',
        credentials: 'include',
      });
      // The final URL after redirects
      return resp.url || shortUrl;
    } catch {
      // Fallback: try HEAD request
      try {
        const resp = await fetch(shortUrl, { method: 'HEAD', redirect: 'follow' });
        return resp.url || shortUrl;
      } catch {
        return shortUrl;
      }
    }
  }

  if (fetchLinkBtn) {
    fetchLinkBtn.addEventListener('click', async () => {
      const rawText = (linkInput?.value || '').trim();
      if (!rawText) {
        linkStatus.style.display = 'block';
        linkStatus.textContent = '❌ Paste link dulu!';
        linkStatus.className = 'page-status no';
        return;
      }

      const category = linkCategorySelect?.value || 'Fashion';
      const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 5);

      fetchLinkBtn.disabled = true;
      fetchLinkBtn.textContent = '⏳ Memproses...';
      linkStatus.style.display = 'block';
      linkStatus.textContent = `⏳ Memproses ${lines.length} link...`;
      linkStatus.className = 'page-status info';

      let addedCount = 0;
      let errorCount = 0;
      const existingUrls = new Set(collected.map(p => p.url));

      for (let i = 0; i < lines.length; i++) {
        let url = lines[i];
        let affiliateUrl = '';

        // Check if it's a short link (s.shopee.co.id, shope.ee, etc.)
        if (url.match(/s\.shopee\.co\.id|shope\.ee|shp\.ee/i)) {
          affiliateUrl = url; // Simpan affiliate URL asli
          linkStatus.textContent = `⏳ Resolve link ${i + 1}/${lines.length}...`;
          const resolved = await resolveShortLink(url);
          url = resolved;
        }

        // Also check for atid.me links (Accesstrade)
        if (url.match(/atid\.me/i)) {
          affiliateUrl = url;
          linkStatus.textContent = `⏳ Resolve link ${i + 1}/${lines.length}...`;
          const resolved = await resolveShortLink(url);
          url = resolved;
        }

        // Extract shopId & itemId
        const ids = parseShopeeUrl(url);
        if (!ids) {
          errorCount++;
          continue;
        }

        linkStatus.textContent = `⏳ Ambil data produk ${i + 1}/${lines.length}...`;

        const product = await fetchProductFromLink(ids.shopId, ids.itemId, category, affiliateUrl);
        if (product && product.title) {
          if (!existingUrls.has(product.url)) {
            collected.push(product);
            existingUrls.add(product.url);
            addedCount++;
          }
        } else {
          errorCount++;
        }
      }

      saveCollected();
      updateLinkUI();

      if (addedCount > 0) {
        linkStatus.textContent = `✅ +${addedCount} produk ditambah!${errorCount > 0 ? ` (${errorCount} gagal)` : ''} — Total: ${collected.length}`;
        linkStatus.className = 'page-status ok';
        fetchLinkBtn.textContent = `✅ +${addedCount} ditambah!`;
      } else {
        linkStatus.textContent = `❌ Gak ada produk yang berhasil diambil.${errorCount > 0 ? ` ${errorCount} link gagal.` : ''} Coba cek format link.`;
        linkStatus.className = 'page-status no';
        fetchLinkBtn.textContent = '❌ Gagal';
      }

      setTimeout(() => {
        fetchLinkBtn.disabled = false;
        fetchLinkBtn.textContent = '🔗 Ambil Data dari Link';
      }, 2500);
    });
  }

  if (linkDownloadBtn) {
    linkDownloadBtn.addEventListener('click', () => {
      const csv = buildCSV(collected);
      downloadCSV(csv, `jb-upload-${collected.length}produk.csv`);
      linkDownloadBtn.textContent = `✅ File terdownload! (${collected.length} produk)`;
      setTimeout(() => { linkDownloadBtn.textContent = '💾 Download File CSV (Format JB)'; }, 3000);
    });
  }

  if (linkClearBtn) {
    linkClearBtn.addEventListener('click', () => {
      if (collected.length === 0) return;
      collected = [];
      saveCollected();
      updateLinkUI();
    });
  }

  updateLinkUI();
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

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      if (lines.length > 0) product.title = lines[0];
      if (!product.title || product.title.length < 3) continue;

      const priceMatch = text.match(/Rp([\d.]+)/);
      if (priceMatch) product.price = parseInt(priceMatch[1].replace(/\./g, ''), 10);

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

      const soldMatch = text.match(/([\d.]+)\s*terjual/i);
      if (soldMatch) {
        product.soldCount = parseInt(soldMatch[1].replace(/\./g, ''), 10);
      } else {
        const rbMatch = text.match(/([\d,]+)\s*rb\s*terjual/i);
        if (rbMatch) product.soldCount = Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);
      }

      // Rating: cari pola "4.9" atau "4,9" yang dekat dengan bintang atau setelah terjual
      const ratingPatterns = [
        /(\d+[.,]\d+)\s*(?:bintang|⭐|🌟)/i,
        /terjual[\s\S]*?(\d+[.,]\d+)/i,
        /(\d+[.,]\d+)\s*\((\d[\d.]*)\s*(?:rating|review|evaluasi)/i,
      ];
      for (const pat of ratingPatterns) {
        const m = text.match(pat);
        if (m) {
          product.rating = parseFloat(m[1].replace(',', '.'));
          break;
        }
      }

      // Gambar: prioritas yang pasti produk, bukan logo
      const img = link.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        // Skip logo/icon kecil dan data URI
        if (src && !src.startsWith('data:') && !src.includes('icon') && !src.includes('logo') && src.includes('susercontent')) {
          product.image = src;
        }
      }

      if (product.title && product.price) {
        products.push(product);
      }
    } catch {}
  }

  const seen = new Set();
  return products.filter(p => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
}

// v5: Scrape detail — diperbaiki supaya gambar, rating, review, terjual benar
function scrapeProductDetail(category) {
  const url = window.location.href;
  const product = { category, marketplace: 'shopee', url };

  // ── Title ──
  const titleSelectors = [
    'h1',
    '[class*="qaNIZv"]',
    '[class*="WBVL_7"]',
    '[class*="_44qnta"]',
    'span[class*="title"]',
    '[data-testid="product-name"]',
  ];
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 3) {
      product.title = el.textContent.trim();
      break;
    }
  }

  // ── Gambar: prioritaskan og:image dari meta tag ──
  // og:image paling reliable, bukan logo Shopee
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    const imgContent = ogImage.getAttribute('content');
    if (imgContent && imgContent.includes('susercontent')) {
      product.image = imgContent;
    }
  }

  // Fallback: cari gambar produk yang benar
  if (!product.image) {
    const imgSelectors = [
      'img[src*="down-id.img.susercontent.com"]',
      'img[src*="susercontent.com/file/sg-"]',
      'img[class*="product-image"]',
      '[class*="product-img"] img',
      '[class*="MIVED"] img',
      '[class*="ZPN9su"] img',
    ];
    for (const sel of imgSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
        // Pastikan bukan logo dan bukan data URI
        if (src && !src.startsWith('data:') && !src.includes('icon') && !src.includes('logo')) {
          product.image = src;
          break;
        }
      }
    }
  }

  // ── Harga ──
  const bodyText = document.body.innerText;
  const priceMatch = bodyText.match(/Rp([\d.]+)/);
  if (priceMatch) product.price = parseInt(priceMatch[1].replace(/\./g, ''), 10);

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

  // ── Terjual ──
  const soldMatch = bodyText.match(/([\d.]+)\s*terjual/i);
  if (soldMatch) {
    product.soldCount = parseInt(soldMatch[1].replace(/\./g, ''), 10);
  } else {
    const rbMatch = bodyText.match(/([\d,]+)\s*rb\s*terjual/i);
    if (rbMatch) product.soldCount = Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);
  }

  // ── Rating & Review Count ──
  // Cari pola "4.9 (1.2rb rating)" atau "4.9 • 1.2rb rating"
  const ratingReviewMatch = bodyText.match(/(\d+[.,]\d+)\s*(?:\(([\d.,]+)\s*(?:rb|ribu)?\s*(?:rating|evaluasi|review)\)|[•|]\s*([\d.,]+)\s*(?:rb|ribu)?\s*(?:rating|evaluasi|review))/i);
  if (ratingReviewMatch) {
    product.rating = parseFloat(ratingReviewMatch[1].replace(',', '.'));
    const reviewStr = ratingReviewMatch[2] || ratingReviewMatch[3] || '';
    if (reviewStr.includes('rb') || reviewStr.includes('ribu')) {
      product.reviewCount = Math.round(parseFloat(reviewStr.replace(/[rbibu\s,]/g, '').replace(',', '.')) * 1000);
    } else {
      product.reviewCount = parseInt(reviewStr.replace(/\./g, '').replace(',', ''), 10);
    }
  }

  // Fallback: cari rating saja
  if (!product.rating) {
    // Cari di area rating — biasa di dekat bintang
    const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
    if (ratingEl) {
      const rText = ratingEl.textContent;
      const rMatch = rText.match(/(\d+[.,]\d+)/);
      if (rMatch) product.rating = parseFloat(rMatch[1].replace(',', '.'));
    }
  }

  // ── Lokasi ──
  const locMatch = bodyText.match(/Dikirim dari\s*([^\n,]+)/i);
  if (locMatch) product.location = locMatch[1].trim();

  return product;
}

// v5: Fetch Shopee API v4 dari dalam halaman (paling akurat!)
function fetchShopeeApiInPage(shopId, itemId) {
  const apiUrl = `https://shopee.co.id/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;

  return fetch(apiUrl, {
    credentials: 'include', // Pakai cookies dari halaman Shopee yang sedang dibuka
    headers: {
      'Accept': 'application/json',
      'X-Shopee-Language': 'id',
      'X-API-SOURCE': 'pc',
    },
  })
    .then(res => res.json())
    .then(data => {
      if (!data.data) return null;
      const item = data.data;
      const result = {};

      if (item.name) result.title = item.name;

      // Gambar — paling reliable dari API
      if (item.image) {
        result.image = `https://down-id.img.susercontent.com/file/${item.image}`;
      } else if (item.images && item.images.length > 0) {
        result.image = `https://down-id.img.susercontent.com/file/${item.images[0]}`;
      }

      // Harga
      const priceMin = item.price_min || item.price;
      if (priceMin) {
        const priceVal = Array.isArray(priceMin) ? priceMin[0] : priceMin;
        result.price = typeof priceVal === 'number' ? priceVal : parseInt(String(priceVal), 10);
      }

      const priceBeforeDiscount = item.price_min_before_discount || item.price_before_discount;
      if (priceBeforeDiscount) {
        const origVal = Array.isArray(priceBeforeDiscount) ? priceBeforeDiscount[0] : priceBeforeDiscount;
        const origPrice = typeof origVal === 'number' ? origVal : parseInt(String(origVal), 10);
        if (origPrice > 0) {
          result.originalPrice = origPrice;
          const p = result.price || 0;
          if (origPrice > p) {
            result.discountPercent = Math.round(((origPrice - p) / origPrice) * 100);
          }
        }
      }

      // Rating & Review
      if (item.item_rating) {
        result.rating = item.item_rating.rating_star || 0;
        const ratingCount = item.item_rating.rating_count || [];
        result.reviewCount = Array.isArray(ratingCount)
          ? ratingCount.reduce((sum, c) => sum + (c || 0), 0)
          : 0;
      }

      // Terjual
      if (item.historical_sold !== undefined && item.historical_sold !== null) {
        result.soldCount = item.historical_sold;
      } else if (item.sold !== undefined && item.sold !== null) {
        result.soldCount = item.sold;
      }

      // Lokasi
      if (item.shop_location) result.location = item.shop_location;

      return result;
    })
    .catch(() => null);
}
