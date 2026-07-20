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
  apiBase: 'https://www.jelajahbelanja.com'
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

// ═══════════════════════════════════════════════════════════════════
// v3.2.1: REFRESH IMAGE TOKPED — re-fetch expired image → Cloudinary
// ═══════════════════════════════════════════════════════════════════
// Buka tab background Tokopedia → inject script download image → upload ke Cloudinary.

function showRefreshImgStatus(message, type) {
  const s = document.getElementById('refreshImgStatus');
  s.textContent = message;
  s.className = 'status ' + type;
}

document.getElementById('refreshImgBtn').addEventListener('click', async () => {
  const btn = document.getElementById('refreshImgBtn');

  if (!config.apiBase || !config.adminSecret) {
    showRefreshImgStatus('❌ Isi Admin Secret & API Base di Config dulu!', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Loading...';

  try {
    // Step 1: Get list produk yang perlu refresh
    const listRes = await fetch(`${config.apiBase}/api/products/need-mirror`);
    const listData = await listRes.json();

    if (!listData.success || listData.total === 0) {
      showRefreshImgStatus('✅ Tidak ada produk yang perlu refresh. Semua sudah di-mirror!', 'success');
      btn.disabled = false;
      btn.textContent = '🔄 Refresh Image Tokped';
      return;
    }

    const products = listData.products;
    let ok = 0, fail = 0;
    const errors = [];
    btn.textContent = `⏳ 0/${products.length}...`;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      btn.textContent = `⏳ ${i + 1}/${products.length} (${ok} ok)...`;
      showRefreshImgStatus(`[${i + 1}/${products.length}] ${p.title.slice(0, 35)}...`, 'loading');

      try {
        // Step 2: Buka tab background Tokopedia (SEKALI saja)
        const tab = await chrome.tabs.create({ url: p.url, active: false });

        // Tunggu page load (max 20s)
        await new Promise((resolve) => {
          let done = false;
          const to = setTimeout(() => { if (!done) { done = true; resolve(); } }, 20000);
          chrome.tabs.onUpdated.addListener(function l(tabId, info) {
            if (tabId === tab.id && info.status === 'complete' && !done) {
              done = true; clearTimeout(to);
              chrome.tabs.onUpdated.removeListener(l);
              setTimeout(resolve, 5000); // 5s delay — Tokopedia SPA butuh waktu render image
            }
          });
        });

        // Step 3: Inject script — extract image URL + download + convert to base64
        // Pakai chrome.scripting.executeScript dengan async function (Chrome 105+)
        const imgResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async function() {
            // Cari image URL dari og:image, twitter:image, atau img tag
            let imgUrl = '';
            const og = document.querySelector('meta[property="og:image"]');
            if (og) imgUrl = og.getAttribute('content') || '';
            if (!imgUrl) {
              const tw = document.querySelector('meta[name="twitter:image"]');
              if (tw) imgUrl = tw.getAttribute('content') || '';
            }
            if (!imgUrl) {
              const imgs = document.querySelectorAll('img');
              for (const img of imgs) {
                const src = img.src || '';
                if (src.includes('tokopedia') && src.includes('p16-images') && !src.includes('icon') && !src.includes('logo')) {
                  imgUrl = src;
                  break;
                }
              }
            }
            if (!imgUrl) return { error: 'no-image-url' };

            // Download image → blob → base64 (same-origin, no CORS)
            try {
              const res = await fetch(imgUrl);
              if (!res.ok) return { error: 'fetch-failed-' + res.status };
              const blob = await res.blob();
              if (blob.size < 1000) return { error: 'too-small' };

              const base64 = await new Promise((resolve) => {
                const r = new FileReader();
                r.onloadend = () => resolve(r.result);
                r.readAsDataURL(blob);
              });
              return { base64: base64 };
            } catch (e) {
              return { error: 'download-error: ' + e.message };
            }
          },
        });

        // Tutup tab
        try { await chrome.tabs.remove(tab.id); } catch {}

        const imgData = imgResults[0]?.result;
        if (!imgData || imgData.error || !imgData.base64) {
          fail++;
          errors.push(p.title.slice(0, 25) + ': ' + (imgData?.error || 'no data'));
          continue;
        }

        // Step 4: Upload ke Cloudinary via JB API
        const uploadRes = await fetch(`${config.apiBase}/api/mirror-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.adminSecret}`,
          },
          body: JSON.stringify({ image: imgData.base64, publicId: p.id }),
        });

        if (!uploadRes.ok) {
          fail++;
          errors.push(p.title.slice(0, 25) + ': upload-' + uploadRes.status);
          continue;
        }
        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.url) {
          fail++;
          errors.push(p.title.slice(0, 25) + ': upload-no-url');
          continue;
        }

        // Step 5: Update product image di DB
        const patchRes = await fetch(`${config.apiBase}/api/shopee-products`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.adminSecret}`,
          },
          body: JSON.stringify({ id: p.id, image: uploadData.url }),
        });

        if (patchRes.ok) {
          ok++;
        } else {
          fail++;
          errors.push(p.title.slice(0, 25) + ': patch-' + patchRes.status);
        }
      } catch (err) {
        fail++;
        errors.push(p.title.slice(0, 25) + ': ' + (err.message || 'catch-error').slice(0, 50));
      }
    }

    btn.disabled = false;
    btn.textContent = '🔄 Refresh Image Tokped';

    if (fail === 0) {
      showRefreshImgStatus(`✅ Semua ${ok} produk image berhasil di-refresh ke Cloudinary!`, 'success');
    } else if (ok > 0) {
      showRefreshImgStatus(`⚠️ ${ok} berhasil, ${fail} gagal. Errors: ${errors.slice(0, 3).join('; ')}`, 'loading');
      console.log('[JB Refresh Image] All errors:', errors);
    } else {
      showRefreshImgStatus(`❌ Semua ${fail} gagal. Errors: ${errors.slice(0, 3).join('; ')}`, 'error');
      console.log('[JB Refresh Image] All errors:', errors);
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '🔄 Refresh Image Tokped';
    showRefreshImgStatus('❌ Error: ' + (err.message || 'unknown'), 'error');
  }
});

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

// v3.2: Auto-mirror image Tokopedia ke Cloudinary
const EXPIRING_DOMAINS = ['tokopedia-static.net', 'p16-images', 'p19-images', 'p20-images', 'p21-images'];

function isExpiringImage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('cloudinary.com')) return false;
  return EXPIRING_DOMAINS.some(d => lower.includes(d));
}

async function mirrorImageToCloudinary(imageUrl, productId) {
  if (!imageUrl || !isExpiringImage(imageUrl)) return imageUrl;
  if (!config.apiBase || !config.adminSecret) return imageUrl;

  try {
    const imgRes = await fetch(imageUrl, { headers: { 'Referer': 'https://www.tokopedia.com/', 'Accept': 'image/*' } });
    if (!imgRes.ok) return imageUrl;
    const blob = await imgRes.blob();
    if (blob.size < 1000) return imageUrl;

    const base64 = await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(blob);
    });

    const uploadRes = await fetch(`${config.apiBase}/api/mirror-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.adminSecret}` },
      body: JSON.stringify({ image: base64, publicId: productId }),
    });

    if (uploadRes.ok) {
      const data = await uploadRes.json();
      if (data.success && data.url) return data.url;
    }
    return imageUrl;
  } catch { return imageUrl; }
}

// v3.2: Auto-generate AT Custom Link (atid.me/go/xxx)
async function generateAtLink(productUrl, productName) {
  if (!config.apiBase || !config.adminSecret) {
    console.log('[JB Scraper] AT link skip: no apiBase or adminSecret');
    return '';
  }
  const mp = detectMarketplace(productUrl);
  if (!mp || !['shopee', 'tokopedia', 'lazada', 'blibli'].includes(mp)) {
    console.log('[JB Scraper] AT link skip: marketplace not supported:', mp);
    return '';
  }

  try {
    console.log('[JB Scraper] Generating AT link for:', productUrl.slice(0, 60));
    const res = await fetch(`${config.apiBase}/api/at-custom-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.adminSecret}` },
      body: JSON.stringify({ mode: 'single', url: productUrl, name: (productName || '').slice(0, 50) }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.affiliateUrl) {
        console.log('[JB Scraper] AT link success:', data.affiliateUrl);
        return data.affiliateUrl;
      } else {
        console.log('[JB Scraper] AT link failed:', data.error || 'no affiliateUrl');
      }
    } else {
      console.log('[JB Scraper] AT link HTTP error:', res.status);
    }
    return '';
  } catch (err) {
    console.log('[JB Scraper] AT link error:', err.message);
    return '';
  }
}

async function addToCollection(product) {
  const collection = await getCollection();

  // Cek duplikat by URL
  const exists = collection.find(p => p.url === product.url);
  if (exists) {
    showStatus('⚠️ Produk sudah ada di koleksi (URL sama), di-skip.', 'error');
    return false;
  }

  // v3.2: Auto-mirror image ke Cloudinary (Tokopedia only)
  if (product.image && isExpiringImage(product.image)) {
    showStatus('⏳ Upload image ke Cloudinary...', 'loading');
    const pid = 'scraper-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const cloudUrl = await mirrorImageToCloudinary(product.image, pid);
    if (cloudUrl !== product.image) product.image = cloudUrl;
  }

  // v3.2: Auto-generate AT Custom Link
  if (!product.affiliateUrl) {
    showStatus('⏳ Generate AT link...', 'loading');
    const atUrl = await generateAtLink(product.url, product.title);
    if (atUrl) product.affiliateUrl = atUrl;
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
    const dlBtn = document.getElementById('downloadCsvBtn');
    if (dlBtn) dlBtn.disabled = true;
  } else {
    countBadge.style.display = 'inline-block';
    countBadge.textContent = collection.length;
    uploadAllBtn.disabled = false;
    clearAllBtn.disabled = false;
    const dlBtn2 = document.getElementById('downloadCsvBtn');
    if (dlBtn2) dlBtn2.disabled = false;

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
    // Image tidak wajib — boleh kosong, user bisa paste manual nanti
    if (!product.price || product.price === 0) missing.push('price');
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

// ═══════════════════════════════════════════════════════════════════
// v3.2: PASTE LINK SCRAPE (Mode 2)
// ═══════════════════════════════════════════════════════════════════
function showLinkStatus(message, type) {
  const s = document.getElementById('linkStatus');
  s.textContent = message;
  s.className = 'status ' + type;
}

document.getElementById('scrapeLinkBtn').addEventListener('click', async () => {
  const textarea = document.getElementById('pasteLinkInput');
  const rawText = textarea.value.trim();
  if (!rawText) { showLinkStatus('❌ Paste URL produk dulu.', 'error'); return; }

  const urls = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 10 && /^https?:\/\//i.test(u));
  if (urls.length === 0) { showLinkStatus('❌ Tidak ada URL valid.', 'error'); return; }
  if (urls.length > 20) { showLinkStatus('⚠️ ' + urls.length + ' URL, proses 20 pertama.', 'loading'); }

  const btn = document.getElementById('scrapeLinkBtn');
  btn.disabled = true;
  let success = 0, failed = 0;

  for (let i = 0; i < Math.min(urls.length, 20); i++) {
    const url = urls[i];
    btn.textContent = '⏳ ' + (i + 1) + '/' + Math.min(urls.length, 20) + '...';
    showLinkStatus('Scraping ' + (i + 1) + ': ' + url.slice(0, 50) + '...', 'loading');

    try {
      const mp = detectMarketplace(url);
      if (!mp) { failed++; continue; }

      let scraperFunc;
      if (mp === 'tiktok') scraperFunc = scrapeTikTokProduct;
      else if (mp === 'tokopedia') scraperFunc = scrapeTokopediaProduct;
      else if (mp === 'shopee') scraperFunc = scrapeShopeeProduct;
      else if (mp === 'blibli') scraperFunc = scrapeBlibliProduct;
      else if (mp === 'lazada') scraperFunc = scrapeLazadaProduct;
      else if (mp === 'bukalapak') scraperFunc = scrapeBukalapakProduct;
      else if (mp === 'zalora') scraperFunc = scrapeZaloraProduct;
      else if (mp === 'sociolla') scraperFunc = scrapeSociollaProduct;
      if (!scraperFunc) { failed++; continue; }

      const tab = await chrome.tabs.create({ url, active: false });
      await new Promise((resolve) => {
        let done = false;
        const to = setTimeout(() => { if (!done) { done = true; resolve(); } }, 15000);
        chrome.tabs.onUpdated.addListener(function l(tabId, info) {
          if (tabId === tab.id && info.status === 'complete' && !done) {
            done = true; clearTimeout(to);
            chrome.tabs.onUpdated.removeListener(l);
            setTimeout(resolve, 3000);
          }
        });
      });

      const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scraperFunc });
      try { await chrome.tabs.remove(tab.id); } catch {}

      const product = results[0]?.result;
      if (!product || !product.title) { failed++; continue; }

      product.marketplace = mp;
      product.url = url.split('?')[0];
      const added = await addToCollection(product);
      if (added) success++; else failed++;
    } catch { failed++; }
  }

  btn.disabled = false;
  btn.textContent = '🔗 Scrape dari Link';
  if (failed === 0) { showLinkStatus('✅ ' + success + ' produk berhasil (+ AT link + Cloudinary)!', 'success'); textarea.value = ''; }
  else if (success > 0) { showLinkStatus('⚠️ ' + success + ' berhasil, ' + failed + ' gagal.', 'loading'); }
  else { showLinkStatus('❌ Semua ' + failed + ' gagal.', 'error'); }
});

// ═══════════════════════════════════════════════════════════════════
// v3.2: DOWNLOAD CSV — dengan AT link + Cloudinary image
// ═══════════════════════════════════════════════════════════════════
function csvField(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

document.getElementById('downloadCsvBtn').addEventListener('click', async () => {
  const collection = await getCollection();
  if (collection.length === 0) { showUploadStatus('❌ Koleksi kosong.', 'error'); return; }

  const headers = ['title', 'url', 'image', 'price', 'originalPrice', 'discountPercent',
                   'rating', 'reviewCount', 'soldCount', 'location', 'category',
                   'marketplace', 'affiliateUrl', 'notes'];
  const lines = [headers.join(',')];

  for (const p of collection) {
    lines.push([
      csvField(p.title), csvField(p.url), csvField(p.image), csvField(p.price),
      csvField(p.originalPrice), csvField(p.discountPercent), csvField(p.rating),
      csvField(p.reviewCount), csvField(p.soldCount), csvField(p.location),
      csvField(p.category), csvField(p.marketplace), csvField(p.affiliateUrl), csvField(p.notes),
    ].join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jb-scrape-' + new Date().toISOString().slice(0, 10) + '-' + collection.length + 'produk.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const withAt = collection.filter(p => p.affiliateUrl).length;
  const withCloud = collection.filter(p => p.image && p.image.includes('cloudinary.com')).length;
  showUploadStatus('✅ CSV didownload: ' + collection.length + ' produk (' + withAt + ' AT link, ' + withCloud + ' Cloudinary)', 'success');
});

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

  // v3.3.1: inline stats extraction (top-level helper not available in page context
  // when injected via chrome.scripting.executeScript({ func }))
  const _pageText = (document.body?.textContent || '').trim();
  let _rating = rating, _reviewCount = 0, _soldCount = soldCount, _location = location;

  // Rating (fallback if not already extracted)
  if (!_rating) {
    const _rr = _pageText.match(/(\d+[.,]\d+)\s*\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rr) {
      _rating = parseFloat(_rr[1].replace(',', '.'));
      let _rn = parseFloat(_rr[2].replace(/\./g, '').replace(',', '.'));
      if (_rr[3]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    } else {
      const _ratingEl = document.querySelector('[class*="rating"], [class*="Rating"], [class*="pcv3__info__rating"], [data-testid*="Rating"], [data-testid*="rating"], [data-e2e*="rating"], .rating-value, .product-rating');
      if (_ratingEl) {
        const _m = _ratingEl.textContent.match(/(\d+[.,]\d+)/);
        if (_m) _rating = parseFloat(_m[1].replace(',', '.'));
      }
    }
    if (!_rating) {
      const _pats = [
        /(\d+[.,]\d+)\s*(?:\/\s*5|dari\s*5|bintang|\u2b50|\u1f31f)/i,
        /(?:rating|rate)\s*[:\-]?\s*(\d+[.,]\d+)/i,
        // standalone rating like "4.8" (1-digit.1-digit, not surrounded by digits)
        /(?<!\d)(\d\.\d)(?!\d)/,
      ];
      for (const _p of _pats) {
        const _m = _pageText.match(_p);
        if (_m) { _rating = parseFloat(_m[1].replace(',', '.')); break; }
      }
    }
  }

  // Review count (if not captured above)
  if (!_reviewCount) {
    const _rm = _pageText.match(/\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rm) {
      let _rn = parseFloat(_rm[1].replace(/\./g, '').replace(',', '.'));
      if (_rm[2]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    }
  }

  // Sold count (fallback if not already extracted) — disambiguates dot:
  //   "1.5RB terjual" -> dot is DECIMAL    -> 1.5 * 1000 = 1500
  //   "1.500 terjual"  -> dot is THOUSANDS  -> 1500
  if (!_soldCount) {
    const _soldPats = [
      { pat: /(\d+(?:[.,]\d+)?)\s*(rb|ribu)\s*terjual/i, mult: true },
      { pat: /terjual\s*(\d+(?:[.,]\d+)?)\s*\+?\s*(rb|ribu)?/i, mult: true },
      { pat: /([\d.,]+)\s*\+?\s*terjual/i, mult: false },
    ];
    for (const { pat: _pat, mult: _mult } of _soldPats) {
      const _m = _pageText.match(_pat);
      if (_m) {
        let _ns = _m[1];
        _ns = _mult ? _ns.replace(',', '.') : _ns.replace(/\./g, '').replace(',', '.');
        let _n = parseFloat(_ns);
        if (_m[2] && /rb|ribu/i.test(_m[2])) _n *= 1000;
        if (!isNaN(_n)) { _soldCount = Math.round(_n); break; }
      }
    }
  }

  // Location (fallback if not already extracted)
  if (!_location) {
    const _locEl = document.querySelector('[class*="location"], [class*="Location"], [class*="shop-location"], [class*="pcv3__info__shop"], [data-sqe="location"]');
    if (_locEl) {
      const _lt = (_locEl.textContent || '').trim();
      const _lm = _lt.match(/(Kab(?:upaten|\.)?\s*[\w\s.]+|Kota\s+[\w\s.]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (_lm) _location = _lm[1].trim().substring(0, 50);
    }
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating: _rating || 4.5,
    reviewCount: _reviewCount,
    soldCount: _soldCount,
    location: _location,
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

  // v3.2.2: Improved Blibli image extraction — og:image + multiple selectors
  // Coba og:image meta tag dulu (paling reliable)
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) image = ogImage.getAttribute('content') || '';

  // Coba twitter:image
  if (!image) {
    const twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage) image = twImage.getAttribute('content') || '';
  }

  // Coba berbagai image selectors
  if (!image) {
    const imgSelectors = [
      'img[class*="product-image"]',
      'img[class*="productImage"]',
      'img[class*="ProductImage"]',
      'img[src*="static-src"]',
      'img[src*="blibli"]',
      'img[src*="cdn"]',
      'main img',
      'picture img',
      'div[class*="gallery"] img',
      'div[class*="image"] img',
    ];
    for (const sel of imgSelectors) {
      if (image) break;
      const el = document.querySelector(sel);
      if (el) {
        const src = el.src || el.dataset.src || el.getAttribute('data-src') || '';
        // Filter: skip placeholder/icon/logo/data-uri
        if (src && !src.startsWith('data:') && !src.includes('icon') && !src.includes('logo') && src.startsWith('http')) {
          image = src;
        }
      }
    }
  }

  // Fallback: scan semua img di page
  if (!image) {
    const allImgs = document.querySelectorAll('img');
    for (const img of allImgs) {
      const src = img.src || img.dataset.src || '';
      if (src && src.startsWith('http') && !src.startsWith('data:') &&
          !src.includes('icon') && !src.includes('logo') && !src.includes('sprite') &&
          !src.includes('placeholder') &&
          (src.includes('blibli') || src.includes('static-src') || src.includes('cdn'))) {
        image = src;
        break;
      }
    }
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

  // v3.3.1: inline stats extraction (top-level helper not available in page context
  // when injected via chrome.scripting.executeScript({ func }))
  const _pageText = (document.body?.textContent || '').trim();
  let _rating = rating, _reviewCount = 0, _soldCount = soldCount, _location = location;

  // Rating (fallback if not already extracted)
  if (!_rating) {
    const _rr = _pageText.match(/(\d+[.,]\d+)\s*\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rr) {
      _rating = parseFloat(_rr[1].replace(',', '.'));
      let _rn = parseFloat(_rr[2].replace(/\./g, '').replace(',', '.'));
      if (_rr[3]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    } else {
      const _ratingEl = document.querySelector('[class*="rating"], [class*="Rating"], [class*="pcv3__info__rating"], [data-testid*="Rating"], [data-testid*="rating"], [data-e2e*="rating"], .rating-value, .product-rating');
      if (_ratingEl) {
        const _m = _ratingEl.textContent.match(/(\d+[.,]\d+)/);
        if (_m) _rating = parseFloat(_m[1].replace(',', '.'));
      }
    }
    if (!_rating) {
      const _pats = [
        /(\d+[.,]\d+)\s*(?:\/\s*5|dari\s*5|bintang|\u2b50|\u1f31f)/i,
        /(?:rating|rate)\s*[:\-]?\s*(\d+[.,]\d+)/i,
        // standalone rating like "4.8" (1-digit.1-digit, not surrounded by digits)
        /(?<!\d)(\d\.\d)(?!\d)/,
      ];
      for (const _p of _pats) {
        const _m = _pageText.match(_p);
        if (_m) { _rating = parseFloat(_m[1].replace(',', '.')); break; }
      }
    }
  }

  // Review count (if not captured above)
  if (!_reviewCount) {
    const _rm = _pageText.match(/\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rm) {
      let _rn = parseFloat(_rm[1].replace(/\./g, '').replace(',', '.'));
      if (_rm[2]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    }
  }

  // Sold count (fallback if not already extracted) — disambiguates dot:
  //   "1.5RB terjual" -> dot is DECIMAL    -> 1.5 * 1000 = 1500
  //   "1.500 terjual"  -> dot is THOUSANDS  -> 1500
  if (!_soldCount) {
    const _soldPats = [
      { pat: /(\d+(?:[.,]\d+)?)\s*(rb|ribu)\s*terjual/i, mult: true },
      { pat: /terjual\s*(\d+(?:[.,]\d+)?)\s*\+?\s*(rb|ribu)?/i, mult: true },
      { pat: /([\d.,]+)\s*\+?\s*terjual/i, mult: false },
    ];
    for (const { pat: _pat, mult: _mult } of _soldPats) {
      const _m = _pageText.match(_pat);
      if (_m) {
        let _ns = _m[1];
        _ns = _mult ? _ns.replace(',', '.') : _ns.replace(/\./g, '').replace(',', '.');
        let _n = parseFloat(_ns);
        if (_m[2] && /rb|ribu/i.test(_m[2])) _n *= 1000;
        if (!isNaN(_n)) { _soldCount = Math.round(_n); break; }
      }
    }
  }

  // Location (fallback if not already extracted)
  if (!_location) {
    const _locEl = document.querySelector('[class*="location"], [class*="Location"], [class*="shop-location"], [class*="pcv3__info__shop"], [data-sqe="location"]');
    if (_locEl) {
      const _lt = (_locEl.textContent || '').trim();
      const _lm = _lt.match(/(Kab(?:upaten|\.)?\s*[\w\s.]+|Kota\s+[\w\s.]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (_lm) _location = _lm[1].trim().substring(0, 50);
    }
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating: _rating || 4.5,
    reviewCount: _reviewCount,
    soldCount: _soldCount,
    location: _location,
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

  // v3.3.1: inline stats extraction (top-level helper not available in page context
  // when injected via chrome.scripting.executeScript({ func }))
  const _pageText = (document.body?.textContent || '').trim();
  let _rating = rating, _reviewCount = 0, _soldCount = soldCount, _location = location;

  // Rating (fallback if not already extracted)
  if (!_rating) {
    const _rr = _pageText.match(/(\d+[.,]\d+)\s*\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rr) {
      _rating = parseFloat(_rr[1].replace(',', '.'));
      let _rn = parseFloat(_rr[2].replace(/\./g, '').replace(',', '.'));
      if (_rr[3]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    } else {
      const _ratingEl = document.querySelector('[class*="rating"], [class*="Rating"], [class*="pcv3__info__rating"], [data-testid*="Rating"], [data-testid*="rating"], [data-e2e*="rating"], .rating-value, .product-rating');
      if (_ratingEl) {
        const _m = _ratingEl.textContent.match(/(\d+[.,]\d+)/);
        if (_m) _rating = parseFloat(_m[1].replace(',', '.'));
      }
    }
    if (!_rating) {
      const _pats = [
        /(\d+[.,]\d+)\s*(?:\/\s*5|dari\s*5|bintang|\u2b50|\u1f31f)/i,
        /(?:rating|rate)\s*[:\-]?\s*(\d+[.,]\d+)/i,
        // standalone rating like "4.8" (1-digit.1-digit, not surrounded by digits)
        /(?<!\d)(\d\.\d)(?!\d)/,
      ];
      for (const _p of _pats) {
        const _m = _pageText.match(_p);
        if (_m) { _rating = parseFloat(_m[1].replace(',', '.')); break; }
      }
    }
  }

  // Review count (if not captured above)
  if (!_reviewCount) {
    const _rm = _pageText.match(/\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rm) {
      let _rn = parseFloat(_rm[1].replace(/\./g, '').replace(',', '.'));
      if (_rm[2]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    }
  }

  // Sold count (fallback if not already extracted) — disambiguates dot:
  //   "1.5RB terjual" -> dot is DECIMAL    -> 1.5 * 1000 = 1500
  //   "1.500 terjual"  -> dot is THOUSANDS  -> 1500
  if (!_soldCount) {
    const _soldPats = [
      { pat: /(\d+(?:[.,]\d+)?)\s*(rb|ribu)\s*terjual/i, mult: true },
      { pat: /terjual\s*(\d+(?:[.,]\d+)?)\s*\+?\s*(rb|ribu)?/i, mult: true },
      { pat: /([\d.,]+)\s*\+?\s*terjual/i, mult: false },
    ];
    for (const { pat: _pat, mult: _mult } of _soldPats) {
      const _m = _pageText.match(_pat);
      if (_m) {
        let _ns = _m[1];
        _ns = _mult ? _ns.replace(',', '.') : _ns.replace(/\./g, '').replace(',', '.');
        let _n = parseFloat(_ns);
        if (_m[2] && /rb|ribu/i.test(_m[2])) _n *= 1000;
        if (!isNaN(_n)) { _soldCount = Math.round(_n); break; }
      }
    }
  }

  // Location (fallback if not already extracted)
  if (!_location) {
    const _locEl = document.querySelector('[class*="location"], [class*="Location"], [class*="shop-location"], [class*="pcv3__info__shop"], [data-sqe="location"]');
    if (_locEl) {
      const _lt = (_locEl.textContent || '').trim();
      const _lm = _lt.match(/(Kab(?:upaten|\.)?\s*[\w\s.]+|Kota\s+[\w\s.]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (_lm) _location = _lm[1].trim().substring(0, 50);
    }
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating: _rating || 4.5,
    reviewCount: _reviewCount,
    soldCount: _soldCount,
    location: _location,
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

  // v3.3.0: declare soldCount (was missing in v3.2.3)
  let soldCount = 0;
  const soldEl = document.querySelector('[class*="sold"], [class*="Sold"]');
  if (soldEl) {
    const stext = soldEl.textContent;
    const smatch = stext.match(/([\d.,]+)\s*\+?\s*(rb|ribu)?/i);
    if (smatch) {
      let sn = parseFloat(smatch[1].replace(/\./g, '').replace(',', '.'));
      if (smatch[2] && /rb|ribu/i.test(smatch[2])) sn *= 1000;
      if (!isNaN(sn)) soldCount = Math.round(sn);
    }
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

  // v3.3.1: inline stats extraction (top-level helper not available in page context
  // when injected via chrome.scripting.executeScript({ func }))
  const _pageText = (document.body?.textContent || '').trim();
  let _rating = rating, _reviewCount = 0, _soldCount = soldCount, _location = location;

  // Rating (fallback if not already extracted)
  if (!_rating) {
    const _rr = _pageText.match(/(\d+[.,]\d+)\s*\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rr) {
      _rating = parseFloat(_rr[1].replace(',', '.'));
      let _rn = parseFloat(_rr[2].replace(/\./g, '').replace(',', '.'));
      if (_rr[3]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    } else {
      const _ratingEl = document.querySelector('[class*="rating"], [class*="Rating"], [class*="pcv3__info__rating"], [data-testid*="Rating"], [data-testid*="rating"], [data-e2e*="rating"], .rating-value, .product-rating');
      if (_ratingEl) {
        const _m = _ratingEl.textContent.match(/(\d+[.,]\d+)/);
        if (_m) _rating = parseFloat(_m[1].replace(',', '.'));
      }
    }
    if (!_rating) {
      const _pats = [
        /(\d+[.,]\d+)\s*(?:\/\s*5|dari\s*5|bintang|\u2b50|\u1f31f)/i,
        /(?:rating|rate)\s*[:\-]?\s*(\d+[.,]\d+)/i,
        // standalone rating like "4.8" (1-digit.1-digit, not surrounded by digits)
        /(?<!\d)(\d\.\d)(?!\d)/,
      ];
      for (const _p of _pats) {
        const _m = _pageText.match(_p);
        if (_m) { _rating = parseFloat(_m[1].replace(',', '.')); break; }
      }
    }
  }

  // Review count (if not captured above)
  if (!_reviewCount) {
    const _rm = _pageText.match(/\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rm) {
      let _rn = parseFloat(_rm[1].replace(/\./g, '').replace(',', '.'));
      if (_rm[2]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    }
  }

  // Sold count (fallback if not already extracted) — disambiguates dot:
  //   "1.5RB terjual" -> dot is DECIMAL    -> 1.5 * 1000 = 1500
  //   "1.500 terjual"  -> dot is THOUSANDS  -> 1500
  if (!_soldCount) {
    const _soldPats = [
      { pat: /(\d+(?:[.,]\d+)?)\s*(rb|ribu)\s*terjual/i, mult: true },
      { pat: /terjual\s*(\d+(?:[.,]\d+)?)\s*\+?\s*(rb|ribu)?/i, mult: true },
      { pat: /([\d.,]+)\s*\+?\s*terjual/i, mult: false },
    ];
    for (const { pat: _pat, mult: _mult } of _soldPats) {
      const _m = _pageText.match(_pat);
      if (_m) {
        let _ns = _m[1];
        _ns = _mult ? _ns.replace(',', '.') : _ns.replace(/\./g, '').replace(',', '.');
        let _n = parseFloat(_ns);
        if (_m[2] && /rb|ribu/i.test(_m[2])) _n *= 1000;
        if (!isNaN(_n)) { _soldCount = Math.round(_n); break; }
      }
    }
  }

  // Location (fallback if not already extracted)
  if (!_location) {
    const _locEl = document.querySelector('[class*="location"], [class*="Location"], [class*="shop-location"], [class*="pcv3__info__shop"], [data-sqe="location"]');
    if (_locEl) {
      const _lt = (_locEl.textContent || '').trim();
      const _lm = _lt.match(/(Kab(?:upaten|\.)?\s*[\w\s.]+|Kota\s+[\w\s.]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (_lm) _location = _lm[1].trim().substring(0, 50);
    }
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating: _rating || 4.5,
    reviewCount: _reviewCount,
    soldCount: _soldCount,
    location: _location,
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

  // v3.3.0: extract soldCount + location (were missing in v3.2.3)
  let soldCount = 0;
  let location = null;

  let category = 'Lainnya';
  const breadcrumbEls = document.querySelectorAll('a[class*="breadcrumb"], .breadcrumb a');
  if (breadcrumbEls.length >= 1) {
    const cat = breadcrumbEls[breadcrumbEls.length - 1].textContent.trim();
    if (cat && cat.length > 1 && cat.length < 50) category = cat;
  }

  // v3.3.1: inline stats extraction (top-level helper not available in page context
  // when injected via chrome.scripting.executeScript({ func }))
  const _pageText = (document.body?.textContent || '').trim();
  let _rating = rating, _reviewCount = 0, _soldCount = soldCount, _location = location;

  // Rating (fallback if not already extracted)
  if (!_rating) {
    const _rr = _pageText.match(/(\d+[.,]\d+)\s*\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rr) {
      _rating = parseFloat(_rr[1].replace(',', '.'));
      let _rn = parseFloat(_rr[2].replace(/\./g, '').replace(',', '.'));
      if (_rr[3]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    } else {
      const _ratingEl = document.querySelector('[class*="rating"], [class*="Rating"], [class*="pcv3__info__rating"], [data-testid*="Rating"], [data-testid*="rating"], [data-e2e*="rating"], .rating-value, .product-rating');
      if (_ratingEl) {
        const _m = _ratingEl.textContent.match(/(\d+[.,]\d+)/);
        if (_m) _rating = parseFloat(_m[1].replace(',', '.'));
      }
    }
    if (!_rating) {
      const _pats = [
        /(\d+[.,]\d+)\s*(?:\/\s*5|dari\s*5|bintang|\u2b50|\u1f31f)/i,
        /(?:rating|rate)\s*[:\-]?\s*(\d+[.,]\d+)/i,
        // standalone rating like "4.8" (1-digit.1-digit, not surrounded by digits)
        /(?<!\d)(\d\.\d)(?!\d)/,
      ];
      for (const _p of _pats) {
        const _m = _pageText.match(_p);
        if (_m) { _rating = parseFloat(_m[1].replace(',', '.')); break; }
      }
    }
  }

  // Review count (if not captured above)
  if (!_reviewCount) {
    const _rm = _pageText.match(/\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rm) {
      let _rn = parseFloat(_rm[1].replace(/\./g, '').replace(',', '.'));
      if (_rm[2]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    }
  }

  // Sold count (fallback if not already extracted) — disambiguates dot:
  //   "1.5RB terjual" -> dot is DECIMAL    -> 1.5 * 1000 = 1500
  //   "1.500 terjual"  -> dot is THOUSANDS  -> 1500
  if (!_soldCount) {
    const _soldPats = [
      { pat: /(\d+(?:[.,]\d+)?)\s*(rb|ribu)\s*terjual/i, mult: true },
      { pat: /terjual\s*(\d+(?:[.,]\d+)?)\s*\+?\s*(rb|ribu)?/i, mult: true },
      { pat: /([\d.,]+)\s*\+?\s*terjual/i, mult: false },
    ];
    for (const { pat: _pat, mult: _mult } of _soldPats) {
      const _m = _pageText.match(_pat);
      if (_m) {
        let _ns = _m[1];
        _ns = _mult ? _ns.replace(',', '.') : _ns.replace(/\./g, '').replace(',', '.');
        let _n = parseFloat(_ns);
        if (_m[2] && /rb|ribu/i.test(_m[2])) _n *= 1000;
        if (!isNaN(_n)) { _soldCount = Math.round(_n); break; }
      }
    }
  }

  // Location (fallback if not already extracted)
  if (!_location) {
    const _locEl = document.querySelector('[class*="location"], [class*="Location"], [class*="shop-location"], [class*="pcv3__info__shop"], [data-sqe="location"]');
    if (_locEl) {
      const _lt = (_locEl.textContent || '').trim();
      const _lm = _lt.match(/(Kab(?:upaten|\.)?\s*[\w\s.]+|Kota\s+[\w\s.]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (_lm) _location = _lm[1].trim().substring(0, 50);
    }
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating: _rating || 4.5,
    reviewCount: _reviewCount,
    soldCount: _soldCount,
    location: _location,
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

  // v3.3.0: extract soldCount + location (were missing in v3.2.3)
  let soldCount = 0;
  let location = null;

  let category = 'Lainnya';
  const breadcrumbEls = document.querySelectorAll('a[class*="breadcrumb"], .breadcrumb a');
  if (breadcrumbEls.length >= 1) {
    const cat = breadcrumbEls[breadcrumbEls.length - 1].textContent.trim();
    if (cat && cat.length > 1 && cat.length < 50) category = cat;
  }

  // v3.3.1: inline stats extraction (top-level helper not available in page context
  // when injected via chrome.scripting.executeScript({ func }))
  const _pageText = (document.body?.textContent || '').trim();
  let _rating = rating, _reviewCount = 0, _soldCount = soldCount, _location = location;

  // Rating (fallback if not already extracted)
  if (!_rating) {
    const _rr = _pageText.match(/(\d+[.,]\d+)\s*\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rr) {
      _rating = parseFloat(_rr[1].replace(',', '.'));
      let _rn = parseFloat(_rr[2].replace(/\./g, '').replace(',', '.'));
      if (_rr[3]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    } else {
      const _ratingEl = document.querySelector('[class*="rating"], [class*="Rating"], [class*="pcv3__info__rating"], [data-testid*="Rating"], [data-testid*="rating"], [data-e2e*="rating"], .rating-value, .product-rating');
      if (_ratingEl) {
        const _m = _ratingEl.textContent.match(/(\d+[.,]\d+)/);
        if (_m) _rating = parseFloat(_m[1].replace(',', '.'));
      }
    }
    if (!_rating) {
      const _pats = [
        /(\d+[.,]\d+)\s*(?:\/\s*5|dari\s*5|bintang|\u2b50|\u1f31f)/i,
        /(?:rating|rate)\s*[:\-]?\s*(\d+[.,]\d+)/i,
        // standalone rating like "4.8" (1-digit.1-digit, not surrounded by digits)
        /(?<!\d)(\d\.\d)(?!\d)/,
      ];
      for (const _p of _pats) {
        const _m = _pageText.match(_p);
        if (_m) { _rating = parseFloat(_m[1].replace(',', '.')); break; }
      }
    }
  }

  // Review count (if not captured above)
  if (!_reviewCount) {
    const _rm = _pageText.match(/\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (_rm) {
      let _rn = parseFloat(_rm[1].replace(/\./g, '').replace(',', '.'));
      if (_rm[2]) _rn *= 1000;
      _reviewCount = Math.round(_rn);
    }
  }

  // Sold count (fallback if not already extracted) — disambiguates dot:
  //   "1.5RB terjual" -> dot is DECIMAL    -> 1.5 * 1000 = 1500
  //   "1.500 terjual"  -> dot is THOUSANDS  -> 1500
  if (!_soldCount) {
    const _soldPats = [
      { pat: /(\d+(?:[.,]\d+)?)\s*(rb|ribu)\s*terjual/i, mult: true },
      { pat: /terjual\s*(\d+(?:[.,]\d+)?)\s*\+?\s*(rb|ribu)?/i, mult: true },
      { pat: /([\d.,]+)\s*\+?\s*terjual/i, mult: false },
    ];
    for (const { pat: _pat, mult: _mult } of _soldPats) {
      const _m = _pageText.match(_pat);
      if (_m) {
        let _ns = _m[1];
        _ns = _mult ? _ns.replace(',', '.') : _ns.replace(/\./g, '').replace(',', '.');
        let _n = parseFloat(_ns);
        if (_m[2] && /rb|ribu/i.test(_m[2])) _n *= 1000;
        if (!isNaN(_n)) { _soldCount = Math.round(_n); break; }
      }
    }
  }

  // Location (fallback if not already extracted)
  if (!_location) {
    const _locEl = document.querySelector('[class*="location"], [class*="Location"], [class*="shop-location"], [class*="pcv3__info__shop"], [data-sqe="location"]');
    if (_locEl) {
      const _lt = (_locEl.textContent || '').trim();
      const _lm = _lt.match(/(Kab(?:upaten|\.)?\s*[\w\s.]+|Kota\s+[\w\s.]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (_lm) _location = _lm[1].trim().substring(0, 50);
    }
  }

  return {
    title, price, originalPrice, discountPercent, image,
    rating: _rating || 4.5,
    reviewCount: _reviewCount,
    soldCount: _soldCount,
    location: _location,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}
