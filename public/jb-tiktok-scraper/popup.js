/**
 * JB Scraper v1.2 — Koleksi multi-produk + batch upload
 *
 * Fitur:
 * - Scrape produk → masuk ke koleksi (localStorage)
 * - Koleksi banyak produk (10, 20, 30, dst)
 * - Upload semua sekaligus (batch)
 * - Auto-detect marketplace (TikTok / Tokopedia)
 * - Skip duplikat (URL sama)
 * - Remove per produk
 */

// State
let config = {
  adminSecret: '',
  apiBase: 'https://jelajahbelanja.com'
};

// Load config
chrome.storage.local.get(['jbConfig', 'jbCollection'], (result) => {
  if (result.jbConfig) {
    config = { ...config, ...result.jbConfig };
    document.getElementById('adminSecret').value = config.adminSecret || '';
    document.getElementById('apiBase').value = config.apiBase || 'https://jelajahbelanja.com';
  }
  renderCollection();
});

// Save config
document.getElementById('saveConfig').addEventListener('click', () => {
  config.adminSecret = document.getElementById('adminSecret').value.trim();
  config.apiBase = document.getElementById('apiBase').value.trim().replace(/\/$/, '');
  chrome.storage.local.set({ jbConfig: config }, () => {
    showStatus('✅ Config disimpan!', 'success');
    setTimeout(() => hideStatus(), 2000);
  });
});

// Detect marketplace dari URL
function detectMarketplace(url) {
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com') || lower.includes('shop.tiktok.com')) return 'tiktok';
  if (lower.includes('tokopedia.com') || lower.includes('ta.tokopedia.com') ||
      lower.includes('tokopedia.link') || lower.includes('toko.link') ||
      lower.includes('shop-id.tokopedia.com')) return 'tokopedia';
  if (lower.includes('shopee.co.id') || lower.includes('shopee.com') || lower.includes('shope.ee') || lower.includes('shp.ee')) return 'shopee';
  if (lower.includes('blibli.com')) return 'blibli';
  if (lower.includes('lazada.co.id')) return 'lazada';
  if (lower.includes('bukalapak.com')) return 'bukalapak';
  if (lower.includes('zalora.co.id')) return 'zalora';
  if (lower.includes('sociolla.com')) return 'sociolla';
  return null;
}

// === KOLEKSI MANAGEMENT ===

function getCollection() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['jbCollection'], (result) => {
      resolve(result.jbCollection || []);
    });
  });
}

function saveCollection(collection) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ jbCollection: collection }, resolve);
  });
}

async function addToCollection(product) {
  const collection = await getCollection();

  // Cek duplikat by URL
  const exists = collection.find(p => p.url === product.url);
  if (exists) {
    showStatus('⚠️ Produk sudah ada di koleksi (URL sama), di-skip.', 'error');
    return false;
  }

  collection.push(product);
  await saveCollection(collection);
  renderCollection();
  return true;
}

async function removeFromCollection(index) {
  const collection = await getCollection();
  collection.splice(index, 1);
  await saveCollection(collection);
  renderCollection();
}

async function clearCollection() {
  await saveCollection([]);
  renderCollection();
}

async function renderCollection() {
  const collection = await getCollection();
  const listEl = document.getElementById('productList');
  const countBadge = document.getElementById('countBadge');
  const uploadAllBtn = document.getElementById('uploadAllBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');

  if (collection.length === 0) {
    listEl.innerHTML = '<div class="empty-list">Belum ada produk terkumpul.<br>Scrape beberapa produk dulu.</div>';
    countBadge.style.display = 'none';
    uploadAllBtn.disabled = true;
    clearAllBtn.disabled = true;
  } else {
    countBadge.style.display = 'inline-block';
    countBadge.textContent = collection.length;
    uploadAllBtn.disabled = false;
    clearAllBtn.disabled = false;

    listEl.innerHTML = collection.map((p, i) => `
      <div class="product-item" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="${p.image || ''}" alt="" class="product-thumb" data-index="${i}">
          <div class="info" style="flex:1;">
            <div class="info-title">${escapeHtml(p.title.slice(0, 40))}${p.title.length > 40 ? '...' : ''}</div>
            <div class="info-price">${formatRupiah(p.price)}</div>
            <div class="info-mp">${p.marketplace}${p.affiliateUrl ? ' ✅' : ' ⚠️ no aff'}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <button class="copy-img-btn" data-index="${i}" data-url="${escapeHtml(p.image || '')}" title="Copy Image URL" style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:4px;padding:3px 6px;font-size:9px;cursor:pointer;color:#71717a;">📋 Copy Img</button>
            <button class="remove" data-index="${i}" title="Hapus" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:0 4px;">✕</button>
          </div>
        </div>
        <input type="text" class="aff-input" data-index="${i}" placeholder="Paste affiliate URL di sini..." value="${p.affiliateUrl || ''}" style="width:100%;margin-top:4px;padding:4px 6px;font-size:10px;border:1px solid #e4e4e7;border-radius:4px;background:#f9fafb;">
        <input type="text" class="img-input" data-index="${i}" placeholder="Image URL (bisa diubah / paste Cloudinary URL)" value="${p.image || ''}" style="width:100%;margin-top:2px;padding:4px 6px;font-size:10px;border:1px solid #e4e4e7;border-radius:4px;background:#f9fafb;">
      </div>
    `).join('');

    // Fix CSP: pakai event listener, bukan inline onerror
    listEl.querySelectorAll('.product-thumb').forEach(img => {
      img.addEventListener('error', function() {
        this.style.background = '#f4f4f5';
        this.src = '';
        this.alt = 'no image';
      });
    });

    // Copy image URL handlers
    listEl.querySelectorAll('.copy-img-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const url = e.target.dataset.url;
        if (!url) return;
        try {
          await navigator.clipboard.writeText(url);
          e.target.textContent = '✅ Copied!';
          e.target.style.background = '#dcfce7';
          e.target.style.color = '#166534';
          setTimeout(() => {
            e.target.textContent = '📋 Copy Img';
            e.target.style.background = '#f4f4f5';
            e.target.style.color = '#71717a';
          }, 1500);
        } catch {
          // Fallback
          const tempInput = document.createElement('input');
          tempInput.value = url;
          document.body.appendChild(tempInput);
          tempInput.select();
          try { document.execCommand('copy'); } catch {}
          document.body.removeChild(tempInput);
          e.target.textContent = '✅ Copied!';
          setTimeout(() => { e.target.textContent = '📋 Copy Img'; }, 1500);
        }
      });
    });

    // Image URL input handlers (bisa diubah / paste Cloudinary URL)
    listEl.querySelectorAll('.img-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const url = e.target.value.trim();
        const coll = await getCollection();
        if (coll[idx]) {
          coll[idx].image = url;
          await saveCollection(coll);
          // Update thumbnail
          const thumb = e.target.parentElement.querySelector('.product-thumb');
          if (thumb) { thumb.src = url; thumb.style.display = url ? '' : 'none'; }
          // Update copy button data
          const copyBtn = e.target.parentElement.querySelector('.copy-img-btn');
          if (copyBtn) copyBtn.dataset.url = url;
        }
      });
    });

    // Affiliate URL input handlers
    listEl.querySelectorAll('.aff-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const url = e.target.value.trim();
        const coll = await getCollection();
        if (coll[idx]) {
          coll[idx].affiliateUrl = url || null;
          await saveCollection(coll);
          // Update indicator
          const mpEl = e.target.parentElement.querySelector('.info-mp');
          if (mpEl) mpEl.textContent = `${coll[idx].marketplace}${url ? ' ✅' : ' ⚠️ no aff'}`;
        }
      });
    });

    // Add remove handlers
    listEl.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        removeFromCollection(idx);
      });
    });
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// === SCRAPE BUTTON ===

document.getElementById('scrapeBtn').addEventListener('click', async () => {
  showStatus('⏳ Scrapping...', 'loading');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const marketplace = detectMarketplace(tab.url);

    if (!marketplace) {
      showStatus('❌ Buka halaman produk di marketplace yang didukung (Shopee/Tokopedia/TikTok/Blibli/Lazada/Bukalapak/Zalora/Sociolla)!', 'error');
      return;
    }

    let scraperFunc;
    if (marketplace === 'tiktok') scraperFunc = scrapeTikTokProduct;
    else if (marketplace === 'tokopedia') scraperFunc = scrapeTokopediaProduct;
    else if (marketplace === 'shopee') scraperFunc = scrapeShopeeProduct;
    else if (marketplace === 'blibli') scraperFunc = scrapeBlibliProduct;
    else if (marketplace === 'lazada') scraperFunc = scrapeLazadaProduct;
    else if (marketplace === 'bukalapak') scraperFunc = scrapeBukalapakProduct;
    else if (marketplace === 'zalora') scraperFunc = scrapeZaloraProduct;
    else if (marketplace === 'sociolla') scraperFunc = scrapeSociollaProduct;
    else {
      showStatus(`❌ Marketplace ${marketplace} belum didukung.`, 'error');
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scraperFunc,
    });

    const product = results[0]?.result;

    if (!product || !product.title) {
      showStatus('❌ Gagal scrape. Pastikan di halaman produk tunggal.', 'error');
      return;
    }

    product.marketplace = marketplace;

    // Validate required fields — show which ones missing
    const missing = [];
    if (!product.title) missing.push('title');
    if (!product.image) missing.push('image');
    if (!product.price || product.price === 0) missing.push('price');
    if (!product.category) missing.push('category');
    if (!product.url) missing.push('url');

    if (missing.length > 0) {
      showStatus(`❌ Field kosong: ${missing.join(', ')}. Tunggu page fully loaded lalu coba lagi.`, 'error');
      return;
    }

    const added = await addToCollection(product);
    if (added) {
      showStatus(`✅ Ditambahkan! (${await getCollectionLength()} produk di koleksi)`, 'success');
    }
  } catch (err) {
    showStatus('❌ Error: ' + err.message, 'error');
  }
});

async function getCollectionLength() {
  const c = await getCollection();
  return c.length;
}

// === UPLOAD ALL BUTTON ===

document.getElementById('uploadAllBtn').addEventListener('click', async () => {
  const collection = await getCollection();

  if (collection.length === 0) {
    showUploadStatus('❌ Koleksi kosong.', 'error');
    return;
  }

  if (!config.adminSecret) {
    showUploadStatus('❌ Isi Admin Secret dulu di Konfigurasi!', 'error');
    return;
  }

  showUploadStatus(`⏳ Uploading ${collection.length} produk...`, 'loading');

  // Cek marketplace override + category override
  const overrideMarketplace = document.getElementById('marketplaceOverride').value;
  const useOverride = overrideMarketplace !== 'auto';
  const overrideCategory = document.getElementById('categoryOverride').value;
  const useCategoryOverride = overrideCategory !== '';

  let success = 0;
  let failed = 0;
  const errors = [];

  // Upload satu per satu (lebih reliable daripada batch API)
  for (let i = 0; i < collection.length; i++) {
    const product = collection[i];

    // Apply marketplace override kalau dipilih
    const effectiveMarketplace = useOverride ? overrideMarketplace : product.marketplace;

    // Apply category override kalau dipilih
    const effectiveCategory = useCategoryOverride ? overrideCategory : (product.category || 'Lainnya');

    showUploadStatus(`⏳ Uploading ${i + 1}/${collection.length}: ${product.title.slice(0, 30)}... [${effectiveMarketplace}] [${effectiveCategory}]`, 'loading');

    try {
      const payload = {
        title: product.title,
        url: product.url,
        image: product.image,
        price: product.price,
        originalPrice: product.originalPrice || null,
        discountPercent: product.discountPercent || null,
        rating: product.rating || 4.5,
        reviewCount: product.reviewCount || 0,
        soldCount: product.soldCount || 0,
        location: product.location || null,
        category: effectiveCategory,
        marketplace: effectiveMarketplace,
        affiliateUrl: product.affiliateUrl || null,
        enabled: true,
        isViral: false,
      };

      const response = await fetch(`${config.apiBase}/api/shopee-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.adminSecret}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        success++;
      } else if (response.status === 401) {
        failed++;
        errors.push('Admin Secret salah! Cek password di Config.');
        break; // Stop kalau auth gagal, tidak perlu lanjut
      } else {
        failed++;
        const data = await response.json().catch(() => ({}));
        errors.push(`${product.title.slice(0, 20)}: ${data.error || response.status}`);
      }
    } catch (err) {
      failed++;
      if (err.message.includes('Failed to fetch')) {
        errors.push('Network error — cek koneksi internet atau API URL');
        break; // Stop kalau network error, tidak perlu lanjut
      } else {
        errors.push(`${product.title.slice(0, 20)}: ${err.message}`);
      }
    }

    // Small delay antar upload (supaya tidak overload server)
    await new Promise(r => setTimeout(r, 300));
  }

  if (failed === 0) {
    showUploadStatus(`✅ Semua ${success} produk berhasil upload!`, 'success');
    await clearCollection();
  } else {
    showUploadStatus(`✅ ${success} berhasil, ❌ ${failed} gagal. ${errors.slice(0, 2).join('; ')}`, 'error');
  }
});

// Clear button
document.getElementById('clearAllBtn').addEventListener('click', async () => {
  if (confirm('Hapus semua produk dari koleksi?')) {
    await clearCollection();
    showStatus('✅ Koleksi dikosongkan.', 'success');
    setTimeout(() => hideStatus(), 2000);
  }
});

// === Helpers ===

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
}

function showUploadStatus(message, type) {
  const status = document.getElementById('uploadStatus');
  status.textContent = message;
  status.className = `status ${type}`;
}

function hideStatus() {
  document.getElementById('status').className = 'status';
}

function formatRupiah(n) {
  if (!n) return '-';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// === TIKTOK SHOP SCRAPER ===
function scrapeTikTokProduct() {
  let title = '';
  const titleEl = document.querySelector('h1[data-e2e="product-title"]')
    || document.querySelector('h1')
    || document.querySelector('[data-e2e="product-title"]')
    || document.querySelector('.product-title');
  if (titleEl) title = titleEl.textContent.trim();

  let price = 0;
  let originalPrice = null;
  let discountPercent = null;

  const priceEls = document.querySelectorAll('[data-e2e="product-price"], .price-current, span');
  for (const el of priceEls) {
    const text = el.textContent.trim();
    const match = text.match(/Rp\s*([\d.]+)/i);
    if (match) {
      const num = parseInt(match[1].replace(/\./g, ''), 10);
      if (num > 0) {
        if (price === 0) price = num;
        else if (num > price && !originalPrice) originalPrice = num;
      }
    }
  }

  const discountEl = document.querySelector('[data-e2e="product-discount"], .discount-percent');
  if (discountEl) {
    const match = discountEl.textContent.match(/(\d+)%/);
    if (match) discountPercent = parseInt(match[1], 10);
  }

  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round((1 - price / originalPrice) * 100);
  }

  let image = '';
  const imgEl = document.querySelector('[data-e2e="product-image"] img')
    || document.querySelector('.product-image img')
    || document.querySelector('.slider-image img')
    || document.querySelector('main img');
  if (imgEl) image = imgEl.src || imgEl.dataset.src || '';

  let rating = 4.5;
  const ratingEl = document.querySelector('[data-e2e="product-rating"], .rating-value');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
    if (match) rating = parseFloat(match[1]);
  }

  let reviewCount = 0;
  const reviewEl = document.querySelector('[data-e2e="product-review-count"], .review-count');
  if (reviewEl) {
    const match = reviewEl.textContent.match(/(\d+)/);
    if (match) reviewCount = parseInt(match[1], 10);
  }

  let soldCount = 0;
  const soldEl = document.querySelector('[data-e2e="product-sold"], .sold-count');
  if (soldEl) {
    const text = soldEl.textContent;
    if (text.includes('rb') || text.includes('k')) {
      const match = text.match(/(\d+\.?\d*)/);
      if (match) soldCount = Math.round(parseFloat(match[1]) * 1000);
    } else {
      const match = text.match(/(\d+)/);
      if (match) soldCount = parseInt(match[1], 10);
    }
  }

  let location = null;
  const locEl = document.querySelector('[data-e2e="product-location"], .seller-location');
  if (locEl) location = locEl.textContent.trim();

  const url = window.location.href;

  let category = 'Lainnya';
  const breadcrumbEl = document.querySelector('[data-e2e="breadcrumb-category"], .breadcrumb li:nth-child(2)');
  if (breadcrumbEl) {
    const cat = breadcrumbEl.textContent.trim();
    if (cat) category = cat;
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating, reviewCount, soldCount, location, url, category,
    affiliateUrl: null,
  };
}

// === TOKOPEDIA SCRAPER ===
function scrapeTokopediaProduct() {
  // === TITLE ===
  let title = '';
  const titleEl = document.querySelector('h1[data-testid="lblPDPDetailProductName"]')
    || document.querySelector('h1.css-1whll3a')
    || document.querySelector('[data-testid="pdpTileProductName"]')
    || document.querySelector('h1')
    || document.querySelector('[data-testid="pdpProductName"]')
    || document.querySelector('.product-title')
    || document.querySelector('[class*="ProductName"]');
  if (titleEl) title = titleEl.textContent.trim();

  // === PRICE ===
  let price = 0;
  let originalPrice = null;
  let discountPercent = null;

  // Coba multiple selectors untuk price
  const priceSelectors = [
    '[data-testid="lblPDPDetailProductPrice"]',
    '[data-testid="pdpTileProductPrice"]',
    '[data-testid="pdpNormalPrice"]',
    '[data-testid="pdpDiscountPrice"]',
    '.price',
    '[class*="price"][class*="current"]',
    '[class*="Price"][class*="Current"]',
    'span[class*="price"]',
    'div[class*="price"]',
  ];

  for (const sel of priceSelectors) {
    if (price > 0) break;
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.replace(/\s/g, '');
      const match = text.match(/Rp([\d.]+)/i);
      if (match) {
        price = parseInt(match[1].replace(/\./g, ''), 10);
      }
    }
  }

  // Fallback: cari semua elemen dengan "Rp" di teks
  if (price === 0) {
    const allEls = document.querySelectorAll('span, div, p');
    for (const el of allEls) {
      const text = el.textContent.trim();
      if (text.length < 30 && text.match(/^Rp\s*[\d.]+$/)) {
        const match = text.match(/Rp\s*([\d.]+)/i);
        if (match) {
          const num = parseInt(match[1].replace(/\./g, ''), 10);
          if (num > 1000) { // filter harga valid (>1000)
            price = num;
            break;
          }
        }
      }
    }
  }

  // Original price (harga coret)
  const originalSelectors = [
    '[data-testid="lblPDPDetailProductPriceStrikeout"]',
    '[data-testid="pdpTileProductPriceOriginal"]',
    '.price-strikeout',
    '[class*="price"][class*="strike"]',
    '[class*="Price"][class*="Strike"]',
  ];
  for (const sel of originalSelectors) {
    if (originalPrice) break;
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.replace(/\s/g, '');
      const match = text.match(/Rp([\d.]+)/i);
      if (match) originalPrice = parseInt(match[1].replace(/\./g, ''), 10);
    }
  }

  // Discount
  const discountEl = document.querySelector('[data-testid="lblPDPDetailProductDiscountPercentage"]')
    || document.querySelector('[data-testid="pdpTileProductDiscount"]');
  if (discountEl) {
    const match = discountEl.textContent.match(/(\d+)%/);
    if (match) discountPercent = parseInt(match[1], 10);
  }

  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round((1 - price / originalPrice) * 100);
  }

  // === IMAGE ===
  let image = '';
  const imgSelectors = [
    '[data-testid="PDPMainImage"] img',
    '[data-testid="pdpTileProductImage"] img',
    '[data-testid="pdpMainImage"] img',
    '.product-image img',
    'main img[src*="tokopedia"]',
    'img[src*="images.tokopedia"]',
    'img[src*="ecs7"]',
    'picture img',
    'main img',
  ];
  for (const sel of imgSelectors) {
    if (image) break;
    const el = document.querySelector(sel);
    if (el) image = el.src || el.dataset.src || '';
  }

  // === RATING ===
  let rating = 4.5;
  const ratingEl = document.querySelector('[data-testid="lblPDPDetailProductRatingNumber"]')
    || document.querySelector('[data-testid="pdpTileProductRating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
    if (match) rating = parseFloat(match[1]);
  }

  // === REVIEW COUNT ===
  let reviewCount = 0;
  const reviewEl = document.querySelector('[data-testid="lblPDPDetailProductRatingCounter"]')
    || document.querySelector('[data-testid="pdpTileProductReviewCount"]');
  if (reviewEl) {
    const match = reviewEl.textContent.match(/(\d+)/);
    if (match) reviewCount = parseInt(match[1], 10);
  }

  // === SOLD COUNT ===
  let soldCount = 0;
  const soldEl = document.querySelector('[data-testid="lblPDPDetailProductSoldCount"]')
    || document.querySelector('[data-testid="pdpTileProductSold"]');
  if (soldEl) {
    const text = soldEl.textContent;
    if (text.includes('rb') || text.includes('k')) {
      const match = text.match(/(\d+\.?\d*)/);
      if (match) soldCount = Math.round(parseFloat(match[1]) * 1000);
    } else {
      const match = text.match(/(\d+)/);
      if (match) soldCount = parseInt(match[1], 10);
    }
  }

  // === LOCATION ===
  let location = null;
  const locSelectors = [
    '[data-testid="lblPDPDetailProductShopLocation"]',
    '[data-testid="pdpTileShopLocation"]',
    '[data-testid="pdpShopLocation"]',
    'a[href*="shop-location"]',
    '[class*="shop-location"]',
    '[class*="ShopLocation"]',
    '[class*="seller-location"]',
    '[class*="SellerLocation"]',
  ];
  for (const sel of locSelectors) {
    if (location) break;
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      const text = el.textContent.trim();
      // Skip "Jakarta Barat" kalau muncul di banyak elemen (kemungkinan default/placeholder)
      // Hanya ambil kalau teks pendek (lokasi biasanya < 30 char) dan bukan "Jakarta Barat" default
      if (text && text.length > 2 && text.length < 50 && !text.includes('Lokasi') && !text.includes('Dikirim')) {
        location = text;
        break;
      }
    }
  }

  // === URL ===
  const url = window.location.href;

  // === CATEGORY (dengan fallback ke 'Lainnya') ===
  let category = 'Lainnya'; // default, supaya tidak kosong
  const breadcrumbEls = document.querySelectorAll('[data-testid="blPDPBreadCrumbItem"] a, .breadcrumb a, nav a');
  if (breadcrumbEls.length >= 2) {
    const cat = breadcrumbEls[breadcrumbEls.length - 1].textContent.trim();
    if (cat && cat.length > 1 && cat.length < 50) category = cat;
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating, reviewCount, soldCount, location,
    url, category,
    affiliateUrl: null,
  };
}

// === SHOPEE SCRAPER ===
function scrapeShopeeProduct() {
  let title = '';
  const titleEl = document.querySelector('div.qaNIZv')
    || document.querySelector('[data-sqe="name"]')
    || document.querySelector('h1')
    || document.querySelector('.qaNIZv');
  if (titleEl) title = titleEl.textContent.trim();

  let price = 0;
  let originalPrice = null;
  let discountPercent = null;

  const priceSelectors = [
    '.pqMkme', '.YE0TBc',
    '[data-sqe="price"]',
    'div[class*="price"][class*="current"]',
    'span[class*="price"]',
  ];
  for (const sel of priceSelectors) {
    if (price > 0) break;
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.replace(/\s/g, '');
      const match = text.match(/Rp([\d.]+)/i);
      if (match) price = parseInt(match[1].replace(/\./g, ''), 10);
    }
  }

  // Fallback: scan semua elemen
  if (price === 0) {
    const allEls = document.querySelectorAll('span, div');
    for (const el of allEls) {
      const text = el.textContent.trim();
      if (text.length < 30 && text.match(/^Rp\s*[\d.]+$/)) {
        const match = text.match(/Rp\s*([\d.]+)/i);
        if (match) {
          const num = parseInt(match[1].replace(/\./g, ''), 10);
          if (num > 1000) { price = num; break; }
        }
      }
    }
  }

  // Original price
  const origEl = document.querySelector('.JagmaB, [data-sqe="original-price"]');
  if (origEl) {
    const text = origEl.textContent.replace(/\s/g, '');
    const match = text.match(/Rp([\d.]+)/i);
    if (match) originalPrice = parseInt(match[1].replace(/\./g, ''), 10);
  }

  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round((1 - price / originalPrice) * 100);
  }

  let image = '';
  const imgSelectors = [
    'img.QCAZEL',
    '[data-sqe="image"] img',
    '.product-image img',
    'main img[src*="shopee"]',
    'main img',
    'picture img',
  ];
  for (const sel of imgSelectors) {
    if (image) break;
    const el = document.querySelector(sel);
    if (el) image = el.src || el.dataset.src || '';
  }

  let rating = 4.5;
  const ratingEl = document.querySelector('.AcLMBa, [data-sqe="rating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
    if (match) rating = parseFloat(match[1]);
  }

  let soldCount = 0;
  const soldEl = document.querySelector('.Hmzvb5, [data-sqe="sold"]');
  if (soldEl) {
    const text = soldEl.textContent;
    if (text.includes('rb') || text.includes('k')) {
      const match = text.match(/(\d+\.?\d*)/);
      if (match) soldCount = Math.round(parseFloat(match[1]) * 1000);
    } else {
      const match = text.match(/(\d+)/);
      if (match) soldCount = parseInt(match[1], 10);
    }
  }

  let location = null;
  const locEl = document.querySelector('.X0Dc5j, [data-sqe="location"]');
  if (locEl) location = locEl.textContent.trim();

  let category = 'Lainnya';
  const breadcrumbEls = document.querySelectorAll('a[data-sqe="category"], .breadcrumb a');
  if (breadcrumbEls.length >= 1) {
    const cat = breadcrumbEls[breadcrumbEls.length - 1].textContent.trim();
    if (cat && cat.length > 1 && cat.length < 50) category = cat;
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating, reviewCount: 0, soldCount, location,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}

// === BLIBLI SCRAPER ===
function scrapeBlibliProduct() {
  let title = '';
  const titleEl = document.querySelector('h1.product-name, h1, [class*="product-name"]');
  if (titleEl) title = titleEl.textContent.trim();

  let price = 0;
  let originalPrice = null;
  let discountPercent = null;

  const priceSelectors = [
    '.new-price-badge',
    '[class*="price"][class*="current"]',
    '[class*="Price"][class*="Current"]',
    'span[class*="price"]',
    'div[class*="price"]',
  ];
  for (const sel of priceSelectors) {
    if (price > 0) break;
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.replace(/\s/g, '');
      const match = text.match(/Rp([\d.]+)/i);
      if (match) price = parseInt(match[1].replace(/\./g, ''), 10);
    }
  }

  if (price === 0) {
    const allEls = document.querySelectorAll('span, div');
    for (const el of allEls) {
      const text = el.textContent.trim();
      if (text.length < 30 && text.match(/^Rp\s*[\d.]+$/)) {
        const match = text.match(/Rp\s*([\d.]+)/i);
        if (match) {
          const num = parseInt(match[1].replace(/\./g, ''), 10);
          if (num > 1000) { price = num; break; }
        }
      }
    }
  }

  const origEl = document.querySelector('[class*="price"][class*="strike"], [class*="Price"][class*="Strike"]');
  if (origEl) {
    const text = origEl.textContent.replace(/\s/g, '');
    const match = text.match(/Rp([\d.]+)/i);
    if (match) originalPrice = parseInt(match[1].replace(/\./g, ''), 10);
  }

  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round((1 - price / originalPrice) * 100);
  }

  let image = '';
  const imgSelectors = [
    'img[class*="product-image"]',
    'main img[src*="blibli"]',
    'main img[src*="static-src"]',
    'main img',
    'picture img',
  ];
  for (const sel of imgSelectors) {
    if (image) break;
    const el = document.querySelector(sel);
    if (el) image = el.src || el.dataset.src || '';
  }

  let rating = 4.5;
  const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
    if (match) rating = parseFloat(match[1]);
  }

  let soldCount = 0;
  const soldEl = document.querySelector('[class*="sold"], [class*="Sold"]');
  if (soldEl) {
    const text = soldEl.textContent;
    const match = text.match(/(\d+)/);
    if (match) soldCount = parseInt(match[1], 10);
  }

  let location = null;
  const locEl = document.querySelector('[class*="location"], [class*="Location"]');
  if (locEl) location = locEl.textContent.trim();

  let category = 'Lainnya';
  const breadcrumbEls = document.querySelectorAll('a[class*="breadcrumb"], .breadcrumb a');
  if (breadcrumbEls.length >= 1) {
    const cat = breadcrumbEls[breadcrumbEls.length - 1].textContent.trim();
    if (cat && cat.length > 1 && cat.length < 50) category = cat;
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating, reviewCount: 0, soldCount, location,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}

// === LAZADA SCRAPER ===
function scrapeLazadaProduct() {
  let title = '';
  const titleEl = document.querySelector('h1.pdp-product-title, h1, [class*="pdp-mod-product-title"]');
  if (titleEl) title = titleEl.textContent.trim();

  let price = 0;
  let originalPrice = null;
  let discountPercent = null;

  const priceSelectors = [
    '.pdp-price.pdp-price_type_normal',
    '[class*="pdp-price"]',
    'span[class*="price"]',
    'div[class*="price"]',
  ];
  for (const sel of priceSelectors) {
    if (price > 0) break;
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.replace(/\s/g, '');
      const match = text.match(/Rp([\d.]+)/i);
      if (match) price = parseInt(match[1].replace(/\./g, ''), 10);
    }
  }

  if (price === 0) {
    const allEls = document.querySelectorAll('span, div');
    for (const el of allEls) {
      const text = el.textContent.trim();
      if (text.length < 30 && text.match(/^Rp\s*[\d.]+$/)) {
        const match = text.match(/Rp\s*([\d.]+)/i);
        if (match) {
          const num = parseInt(match[1].replace(/\./g, ''), 10);
          if (num > 1000) { price = num; break; }
        }
      }
    }
  }

  const origEl = document.querySelector('[class*="pdp-price-type-original"], [class*="original"][class*="price"]');
  if (origEl) {
    const text = origEl.textContent.replace(/\s/g, '');
    const match = text.match(/Rp([\d.]+)/i);
    if (match) originalPrice = parseInt(match[1].replace(/\./g, ''), 10);
  }

  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round((1 - price / originalPrice) * 100);
  }

  let image = '';
  const imgSelectors = [
    'img[class*="pdp-mod-common-image"]',
    'img[class*="gallery"]',
    'main img[src*="lazada"]',
    'main img',
    'picture img',
  ];
  for (const sel of imgSelectors) {
    if (image) break;
    const el = document.querySelector(sel);
    if (el) image = el.src || el.dataset.src || '';
  }

  let rating = 4.5;
  const ratingEl = document.querySelector('[class*="pdp-mod-review-rating"], [class*="score"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
    if (match) rating = parseFloat(match[1]);
  }

  let soldCount = 0;
  const soldEl = document.querySelector('[class*="sold"], [class*="Sold"]');
  if (soldEl) {
    const text = soldEl.textContent;
    const match = text.match(/(\d+)/);
    if (match) soldCount = parseInt(match[1], 10);
  }

  let location = null;
  const locEl = document.querySelector('[class*="location"], [class*="Location"]');
  if (locEl) location = locEl.textContent.trim();

  let category = 'Lainnya';
  const breadcrumbEls = document.querySelectorAll('a[class*="breadcrumb"], .breadcrumb a, [class*="breadcrumb"] a');
  if (breadcrumbEls.length >= 1) {
    const cat = breadcrumbEls[breadcrumbEls.length - 1].textContent.trim();
    if (cat && cat.length > 1 && cat.length < 50) category = cat;
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating, reviewCount: 0, soldCount, location,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}

// === BUKALAPAK SCRAPER ===
function scrapeBukalapakProduct() {
  let title = '';
  const titleEl = document.querySelector('h1[class*="product-name"], h1, [class*="product-name"]');
  if (titleEl) title = titleEl.textContent.trim();

  let price = 0;
  let originalPrice = null;
  let discountPercent = null;

  const priceSelectors = [
    '[class*="price"][class*="amount"]',
    '[class*="Price"][class*="Amount"]',
    'span[class*="price"]',
    'div[class*="price"]',
  ];
  for (const sel of priceSelectors) {
    if (price > 0) break;
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.replace(/\s/g, '');
      const match = text.match(/Rp([\d.]+)/i);
      if (match) price = parseInt(match[1].replace(/\./g, ''), 10);
    }
  }

  if (price === 0) {
    const allEls = document.querySelectorAll('span, div');
    for (const el of allEls) {
      const text = el.textContent.trim();
      if (text.length < 30 && text.match(/^Rp\s*[\d.]+$/)) {
        const match = text.match(/Rp\s*([\d.]+)/i);
        if (match) {
          const num = parseInt(match[1].replace(/\./g, ''), 10);
          if (num > 1000) { price = num; break; }
        }
      }
    }
  }

  const origEl = document.querySelector('[class*="price"][class*="strike"], [class*="original"][class*="price"]');
  if (origEl) {
    const text = origEl.textContent.replace(/\s/g, '');
    const match = text.match(/Rp([\d.]+)/i);
    if (match) originalPrice = parseInt(match[1].replace(/\./g, ''), 10);
  }

  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round((1 - price / originalPrice) * 100);
  }

  let image = '';
  const imgSelectors = [
    'img[class*="product-image"]',
    'main img[src*="bukalapak"]',
    'main img',
    'picture img',
  ];
  for (const sel of imgSelectors) {
    if (image) break;
    const el = document.querySelector(sel);
    if (el) image = el.src || el.dataset.src || '';
  }

  let rating = 4.5;
  const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
    if (match) rating = parseFloat(match[1]);
  }

  let location = null;
  const locEl = document.querySelector('[class*="location"], [class*="Location"]');
  if (locEl) location = locEl.textContent.trim();

  let category = 'Lainnya';
  const breadcrumbEls = document.querySelectorAll('a[class*="breadcrumb"], .breadcrumb a');
  if (breadcrumbEls.length >= 1) {
    const cat = breadcrumbEls[breadcrumbEls.length - 1].textContent.trim();
    if (cat && cat.length > 1 && cat.length < 50) category = cat;
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating, reviewCount: 0, soldCount: 0, location,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}

// === ZALORA SCRAPER ===
function scrapeZaloraProduct() {
  let title = '';
  const titleEl = document.querySelector('h1, h2[class*="product-name"], [class*="product-name"]');
  if (titleEl) title = titleEl.textContent.trim();

  let price = 0;
  let originalPrice = null;
  let discountPercent = null;

  const priceSelectors = [
    '[class*="price"][class*="current"]',
    '[class*="Price"][class*="Current"]',
    'span[class*="price"]',
    'div[class*="price"]',
  ];
  for (const sel of priceSelectors) {
    if (price > 0) break;
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.replace(/\s/g, '');
      const match = text.match(/Rp([\d.]+)/i);
      if (match) price = parseInt(match[1].replace(/\./g, ''), 10);
    }
  }

  if (price === 0) {
    const allEls = document.querySelectorAll('span, div');
    for (const el of allEls) {
      const text = el.textContent.trim();
      if (text.length < 30 && text.match(/^Rp\s*[\d.]+$/)) {
        const match = text.match(/Rp\s*([\d.]+)/i);
        if (match) {
          const num = parseInt(match[1].replace(/\./g, ''), 10);
          if (num > 1000) { price = num; break; }
        }
      }
    }
  }

  const origEl = document.querySelector('[class*="price"][class*="strike"], [class*="original"][class*="price"]');
  if (origEl) {
    const text = origEl.textContent.replace(/\s/g, '');
    const match = text.match(/Rp([\d.]+)/i);
    if (match) originalPrice = parseInt(match[1].replace(/\./g, ''), 10);
  }

  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round((1 - price / originalPrice) * 100);
  }

  let image = '';
  const imgSelectors = [
    'img[class*="product-image"]',
    'main img[src*="zalora"]',
    'main img',
    'picture img',
  ];
  for (const sel of imgSelectors) {
    if (image) break;
    const el = document.querySelector(sel);
    if (el) image = el.src || el.dataset.src || '';
  }

  let rating = 4.5;
  const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
    if (match) rating = parseFloat(match[1]);
  }

  let category = 'Lainnya';
  const breadcrumbEls = document.querySelectorAll('a[class*="breadcrumb"], .breadcrumb a');
  if (breadcrumbEls.length >= 1) {
    const cat = breadcrumbEls[breadcrumbEls.length - 1].textContent.trim();
    if (cat && cat.length > 1 && cat.length < 50) category = cat;
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating, reviewCount: 0, soldCount: 0, location: null,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}

// === SOCIOLLA SCRAPER ===
function scrapeSociollaProduct() {
  let title = '';
  const titleEl = document.querySelector('h1, h2[class*="product-name"], [class*="product-name"]');
  if (titleEl) title = titleEl.textContent.trim();

  let price = 0;
  let originalPrice = null;
  let discountPercent = null;

  const priceSelectors = [
    '[class*="price"][class*="current"]',
    '[class*="Price"][class*="Current"]',
    'span[class*="price"]',
    'div[class*="price"]',
  ];
  for (const sel of priceSelectors) {
    if (price > 0) break;
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.replace(/\s/g, '');
      const match = text.match(/Rp([\d.]+)/i);
      if (match) price = parseInt(match[1].replace(/\./g, ''), 10);
    }
  }

  if (price === 0) {
    const allEls = document.querySelectorAll('span, div');
    for (const el of allEls) {
      const text = el.textContent.trim();
      if (text.length < 30 && text.match(/^Rp\s*[\d.]+$/)) {
        const match = text.match(/Rp\s*([\d.]+)/i);
        if (match) {
          const num = parseInt(match[1].replace(/\./g, ''), 10);
          if (num > 1000) { price = num; break; }
        }
      }
    }
  }

  const origEl = document.querySelector('[class*="price"][class*="strike"], [class*="original"][class*="price"]');
  if (origEl) {
    const text = origEl.textContent.replace(/\s/g, '');
    const match = text.match(/Rp([\d.]+)/i);
    if (match) originalPrice = parseInt(match[1].replace(/\./g, ''), 10);
  }

  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round((1 - price / originalPrice) * 100);
  }

  let image = '';
  const imgSelectors = [
    'img[class*="product-image"]',
    'main img[src*="sociolla"]',
    'main img',
    'picture img',
  ];
  for (const sel of imgSelectors) {
    if (image) break;
    const el = document.querySelector(sel);
    if (el) image = el.src || el.dataset.src || '';
  }

  let rating = 4.5;
  const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
    if (match) rating = parseFloat(match[1]);
  }

  let category = 'Lainnya';
  const breadcrumbEls = document.querySelectorAll('a[class*="breadcrumb"], .breadcrumb a');
  if (breadcrumbEls.length >= 1) {
    const cat = breadcrumbEls[breadcrumbEls.length - 1].textContent.trim();
    if (cat && cat.length > 1 && cat.length < 50) category = cat;
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating, reviewCount: 0, soldCount: 0, location: null,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}
