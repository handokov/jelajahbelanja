/**
 * JB Scraper — v10.0 (Shopee + Tokopedia + Accesstrade + Cloudinary)
 *
 * NEW v10.0:
 * - Manual Image URL! Paste gambar dari "Copy image address"
 * - Klik zoom gambar produk → klik kanan → Copy → paste di field Image URL
 * - Preview gambar langsung di popup
 * - Auto-upload ke Cloudinary saat download CSV
 * - Gambar Tokopedia gak hilang lagi!
 *
 * v9.0:
 * - Local Image Server! Simpan gambar di localhost:3000 supaya URL stabil
 * - Batch image download (paralel, 5 concurrent)
 *
 * v8.0:
 * - Support Tokopedia! Scrape produk dari halaman Tokopedia
 * - Paste link Tokopedia (tokopedia.com, ta.tokopedia.com, tokopedia.link)
 * - Tab baru "Tokopedia" buat scrape dari halaman TKPD
 * - Affiliate link Tokopedia dari Accesstrade (AT)
 */

// ── Image Server Config ──
const IMAGE_SERVER = 'http://localhost:3000';
let imageServerOnline = false;

// CSV headers — sesuai template JB Bulk Upload
const CSV_HEADERS = 'title,url,image,price,originalPrice,discountPercent,rating,reviewCount,soldCount,location,category,marketplace,affiliateUrl,notes';

// Produk yang udah dikumpul
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
  updateLinkUI();
  updateTkpdUI();
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

// ========== LOCAL IMAGE SERVER ==========

// Cek apakah image server jalan
async function checkImageServer() {
  try {
    const resp = await fetch(`${IMAGE_SERVER}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await resp.json();
    imageServerOnline = data.status === 'ok';
    return data;
  } catch {
    imageServerOnline = false;
    return null;
  }
}

// Download 1 gambar ke server lokal, return URL lokal
async function saveImageToLocal(imageUrl) {
  if (!imageUrl) return imageUrl;
  if (imageUrl.includes('localhost:3000')) return imageUrl; // Udah lokal
  
  try {
    const resp = await fetch(`${IMAGE_SERVER}/download?url=${encodeURIComponent(imageUrl)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
    });
    const data = await resp.json();
    if (data.success) return data.localUrl;
  } catch {}
  return imageUrl; // Fallback ke URL asli
}

// Download semua gambar produk ke server lokal (batch)
async function saveAllImagesToLocal(products) {
  const needSave = products.filter(p => p.image && !p.image.includes('localhost:3000'));
  if (needSave.length === 0) return { success: 0, failed: 0, total: 0 };
  
  // Coba batch endpoint dulu (lebih cepat)
  try {
    const urls = needSave.map(p => p.image);
    const resp = await fetch(`${IMAGE_SERVER}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await resp.json();
    if (data.results) {
      let successCount = 0;
      for (let i = 0; i < needSave.length; i++) {
        if (data.results[i]?.success) {
          needSave[i].image = data.results[i].localUrl;
          successCount++;
        }
      }
      return { success: successCount, failed: needSave.length - successCount, total: needSave.length };
    }
  } catch {}
  
  // Fallback: download satu-satu
  let successCount = 0;
  for (const p of needSave) {
    const newUrl = await saveImageToLocal(p.image);
    if (newUrl !== p.image) {
      p.image = newUrl;
      successCount++;
    }
  }
  return { success: successCount, failed: needSave.length - successCount, total: needSave.length };
}

// ========== ACCESSTRADE CSV PARSER ==========

function parseAccesstradeCSV(text) {
  const products = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);
    if (fields.length < 10) continue;

    try {
      const productId = (fields[0] || '').replace('?', '').trim();
      const title = (fields[1] || '').trim();
      const image = (fields[2] || '').trim();
      const affiliateLink1 = (fields[4] || '').trim();
      const affiliateLink2 = (fields[5] || '').trim();
      const description = (fields[6] || '').trim();
      const price = parseInt((fields[7] || '0').replace(/[^\d]/g, ''), 10);
      const originalPrice = parseInt((fields[8] || '0').replace(/[^\d]/g, ''), 10);
      const category = (fields[14] || '').trim();
      const subCategory = (fields[16] || '').trim();
      const subSubCategory = (fields[18] || '').trim();
      const currency = (fields[19] || '').trim();
      const brand = (fields[20] || '').trim();

      if (!productId || !title || !price) continue;
      if (currency && currency !== 'IDR') continue;

      // Deteksi marketplace dari affiliate link
      let marketplace = 'shopee';
      let productUrl = '';
      if (affiliateLink1.includes('tokopedia') || affiliateLink2.includes('tokopedia')) {
        marketplace = 'tokopedia';
        // Coba extract URL Tokopedia dari affiliate link
        const tkpdMatch = affiliateLink1.match(/tokopedia\.com\/[^\s&"']+/) ||
                          affiliateLink2.match(/tokopedia\.com\/[^\s&"']+/);
        if (tkpdMatch) productUrl = 'https://www.' + tkpdMatch[0];
      }

      if (marketplace === 'shopee') {
        let shopId = '', itemId = productId;
        const urlMatch = affiliateLink1.match(/product%2F(\d+)%2F(\d+)/) ||
                         affiliateLink1.match(/product\/(\d+)\/(\d+)/);
        if (urlMatch) {
          shopId = urlMatch[1];
          itemId = urlMatch[2];
        }
        productUrl = shopId && itemId
          ? `https://shopee.co.id/universal-link/product/${shopId}/${itemId}`
          : `https://shopee.co.id/product-${productId}`;
      }

      if (!productUrl) continue;

      const affiliateUrl = affiliateLink2 || affiliateLink1 || '';
      const cleanDesc = description
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);

      const jbCategory = mapCategory(category, subCategory, subSubCategory);
      let discountPercent = null;
      if (originalPrice > 0 && price > 0 && originalPrice > price) {
        discountPercent = Math.round((1 - price / originalPrice) * 100);
      }

      products.push({
        title: title.substring(0, 200),
        url: productUrl,
        image: image,
        price: price,
        originalPrice: originalPrice > price ? originalPrice : null,
        discountPercent: discountPercent,
        rating: null,
        reviewCount: null,
        soldCount: null,
        location: null,
        category: jbCategory,
        marketplace: marketplace,
        affiliateUrl: decodeURIComponent(affiliateUrl),
        notes: brand && brand !== 'NoBrand' ? `Brand: ${brand}` : '',
      });
    } catch {}
  }

  return products;
}

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
  return 'Fashion';
}

// ========== UI ==========

function updateUI() {
  const countBadge = document.getElementById('countBadge');
  const collectedList = document.getElementById('collectedList');
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');

  if (countBadge) countBadge.textContent = collected.length;
  if (collectedList) {
    if (collected.length === 0) {
      collectedList.innerHTML = '<div style="color:#666">Belum ada produk</div>';
    } else {
      collectedList.innerHTML = collected.map((p, i) => {
        const badge = p.marketplace === 'tokopedia'
          ? '<span class="marketplace-badge tokopedia">TKPD</span>'
          : '<span class="marketplace-badge shopee">SP</span>';
        return `<div>${i + 1}. ${esc(p.title.substring(0, 40))}${p.title.length > 40 ? '...' : ''} ${badge} <span style="color:#4caf50">${p.rating ? '⭐' + p.rating.toFixed(1) : '⏳'}</span></div>`;
      }).join('');
    }
  }
  if (downloadCsvBtn) downloadCsvBtn.disabled = collected.length === 0;
}

function updateLinkUI() {
  const linkCountBadge = document.getElementById('linkCountBadge');
  const linkCollectedList = document.getElementById('linkCollectedList');
  const linkDownloadBtn = document.getElementById('linkDownloadBtn');

  if (linkCountBadge) linkCountBadge.textContent = collected.length;
  if (linkCollectedList) {
    if (collected.length === 0) {
      linkCollectedList.innerHTML = '<div style="color:#666">Belum ada produk</div>';
    } else {
      linkCollectedList.innerHTML = collected.map((p, i) => {
        const badge = p.marketplace === 'tokopedia'
          ? '<span class="marketplace-badge tokopedia">TKPD</span>'
          : '<span class="marketplace-badge shopee">SP</span>';
        return `<div>${i + 1}. ${esc(p.title.substring(0, 40))}${p.title.length > 40 ? '...' : ''} ${badge} <span style="color:#4caf50">${p.rating ? '⭐' + p.rating.toFixed(1) : '⏳'}</span></div>`;
      }).join('');
    }
  }
  if (linkDownloadBtn) linkDownloadBtn.disabled = collected.length === 0;
}

function updateTkpdUI() {
  const tkpdCountBadge = document.getElementById('tkpdCountBadge');
  const tkpdCollectedList = document.getElementById('tkpdCollectedList');
  const tkpdDownloadBtn = document.getElementById('tkpdDownloadBtn');

  if (tkpdCountBadge) tkpdCountBadge.textContent = collected.length;
  if (tkpdCollectedList) {
    if (collected.length === 0) {
      tkpdCollectedList.innerHTML = '<div style="color:#666">Belum ada produk</div>';
    } else {
      // Filter cuma Tokopedia
      const tkpdProducts = collected.filter(p => p.marketplace === 'tokopedia');
      if (tkpdProducts.length === 0) {
        tkpdCollectedList.innerHTML = '<div style="color:#666">Belum ada produk Tokopedia</div>';
      } else {
        tkpdCollectedList.innerHTML = tkpdProducts.map((p, i) =>
          `<div>${i + 1}. ${esc(p.title.substring(0, 40))}${p.title.length > 40 ? '...' : ''} <span style="color:#4caf50">${p.rating ? '⭐' + p.rating.toFixed(1) : '⏳'}</span></div>`
        ).join('');
      }
    }
  }
  if (tkpdDownloadBtn) tkpdDownloadBtn.disabled = collected.length === 0;
}

// ========== TOKOPEDIA FUNCTIONS ==========

// Parse Tokopedia URL — extract product info from URL
function parseTokopediaUrl(url) {
  // Format 1: https://www.tokopedia.com/shop-name/product-name
  // Format 2: https://www.tokopedia.com/shop-name/product-name?whid=0
  const tkpdMatch = url.match(/tokopedia\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (tkpdMatch && tkpdMatch[2] && !['promo', 'category', 'p', 'search', 'blog', 'help', 'cart', 'checkout', 'inbox', 'notification', 'order', 'wallet', 'topads', 'affiliate', 'download', 'login'].includes(tkpdMatch[2])) {
    return {
      shop: tkpdMatch[1],
      product: tkpdMatch[2],
      url: url.split('?')[0], // clean URL
    };
  }
  return null;
}

// Resolve Tokopedia affiliate link (ta.tokopedia.com, tokopedia.link, toko.link)
function resolveTokopediaAffiliate(affUrl) {
  return new Promise((resolve) => {
    let resolved = false;

    // Try extracting URL from query params first (faster)
    try {
      const urlObj = new URL(affUrl);
      const redirectUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('ref') || urlObj.searchParams.get('l');
      if (redirectUrl && redirectUrl.includes('tokopedia.com')) {
        const decoded = decodeURIComponent(redirectUrl);
        resolve(decoded);
        return;
      }
    } catch {}

    // Fallback: open tab and follow redirect
    chrome.tabs.create({ url: affUrl, active: false }, (tab) => {
      const tabId = tab.id;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          chrome.tabs.remove(tabId).catch(() => {});
          resolve(affUrl);
        }
      }, 15000);

      function onUpdated(updatedTabId, changeInfo, updatedTab) {
        if (updatedTabId !== tabId) return;
        const currentUrl = updatedTab.url || '';

        // Check if redirected to Tokopedia product page
        if (currentUrl.match(/tokopedia\.com\/[^\/]+\/[^\/\?#]+/) && !currentUrl.includes('ta.tokopedia.com') && !currentUrl.includes('tokopedia.link') && !currentUrl.includes('toko.link')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(onUpdated);
            chrome.tabs.remove(tabId).catch(() => {});
            resolve(currentUrl);
          }
        }
      }

      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

// Fetch Tokopedia product data by opening background tab and scraping
async function fetchTokopediaProduct(productUrl, category, affiliateUrl) {
  return new Promise((resolve) => {
    let resolved = false;
    let tabId = null;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (tabId) chrome.tabs.remove(tabId).catch(() => {});
        resolve(null);
      }
    }, 25000);

    chrome.tabs.create({ url: productUrl, active: false }, (tab) => {
      tabId = tab.id;

      function onUpdated(updatedTabId, changeInfo) {
        if (updatedTabId !== tabId) return;
        if (changeInfo.status !== 'complete') return;

        // Wait for page to fully load
        setTimeout(async () => {
          try {
            // Inject Tokopedia scraper into the page
            const results = await chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: scrapeTokopediaProduct,
              args: [category],
            });

            const product = results?.[0]?.result;

            if (product && product.title) {
              product.url = productUrl.split('?')[0];
              product.marketplace = 'tokopedia';
              if (affiliateUrl) product.affiliateUrl = affiliateUrl;

              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(onUpdated);
                chrome.tabs.remove(tabId).catch(() => {});
                resolve(product);
              }
            } else {
              // Retry once after extra wait
              await new Promise(r => setTimeout(r, 3000));
              try {
                const retryResults = await chrome.scripting.executeScript({
                  target: { tabId: tabId },
                  func: scrapeTokopediaProduct,
                  args: [category],
                });
                const retryProduct = retryResults?.[0]?.result;
                if (retryProduct && retryProduct.title) {
                  retryProduct.url = productUrl.split('?')[0];
                  retryProduct.marketplace = 'tokopedia';
                  if (affiliateUrl) retryProduct.affiliateUrl = affiliateUrl;

                  if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    chrome.tabs.onUpdated.removeListener(onUpdated);
                    chrome.tabs.remove(tabId).catch(() => {});
                    resolve(retryProduct);
                  }
                }
              } catch {}

              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(onUpdated);
                chrome.tabs.remove(tabId).catch(() => {});
                resolve(null);
              }
            }
          } catch (e) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              chrome.tabs.onUpdated.removeListener(onUpdated);
              chrome.tabs.remove(tabId).catch(() => {});
              resolve(null);
            }
          }
        }, 4000); // Wait 4s for Tokopedia SPA to fully render
      }

      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  // ── Image URL preview ──
  const shopeeImageUrlInput = document.getElementById('shopeeImageUrl');
  const shopeeImgPreview = document.getElementById('shopeeImgPreview');
  const tkpdImageUrlInput = document.getElementById('tkpdImageUrl');
  const tkpdImgPreview = document.getElementById('tkpdImgPreview');

  if (shopeeImageUrlInput) {
    shopeeImageUrlInput.addEventListener('input', () => {
      const url = shopeeImageUrlInput.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        shopeeImgPreview.src = url;
        shopeeImgPreview.style.display = 'block';
      } else {
        shopeeImgPreview.style.display = 'none';
      }
    });
  }
  if (tkpdImageUrlInput) {
    tkpdImageUrlInput.addEventListener('input', () => {
      const url = tkpdImageUrlInput.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        tkpdImgPreview.src = url;
        tkpdImgPreview.style.display = 'block';
      } else {
        tkpdImgPreview.style.display = 'none';
      }
    });
  }

  // ── Check Image Server ──
  const imgServerLabel = document.getElementById('imgServerLabel');
  checkImageServer().then(data => {
    if (data && data.status === 'ok') {
      const cloudInfo = data.cloudinary || '';
      const isConfigured = cloudInfo.includes('connected');
      imgServerLabel.textContent = isConfigured 
        ? `ONLINE ☁️ Cloudinary` 
        : `ONLINE (local only)`;
      imgServerLabel.style.color = isConfigured ? '#4caf50' : '#ff9800';
    } else {
      imgServerLabel.textContent = 'OFFLINE — jalankan start.bat';
      imgServerLabel.style.color = '#f44336';
    }
  });

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
  let isTokopedia = false;
  let isTkpdDetail = false;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    if (tab.url) {
      if (tab.url.includes('shopee.co.id')) {
        isShopee = true;
        const urlMatch1 = tab.url.match(/-i\.(\d+)\.(\d+)/);
        const urlMatch2 = tab.url.match(/\/product\/(\d+)\/(\d+)/);
        isDetail = !!(urlMatch1 || urlMatch2);
        if (isDetail) {
          pageStatus.textContent = '📄 Halaman produk Shopee detail';
          pageStatus.className = 'page-status ok';
        } else {
          pageStatus.textContent = '🔍 Halaman Shopee — siap ambil!';
          pageStatus.className = 'page-status ok';
        }
      } else if (tab.url.includes('tokopedia.com')) {
        isTokopedia = true;
        // Check if it's a product detail page
        const tkpdMatch = tab.url.match(/tokopedia\.com\/([^\/]+)\/([^\/\?#]+)/);
        if (tkpdMatch && tkpdMatch[2] && !['promo', 'category', 'p', 'search', 'blog', 'help', 'cart', 'checkout', 'inbox', 'notification', 'order', 'wallet', 'topads', 'affiliate', 'download', 'login'].includes(tkpdMatch[2])) {
          isTkpdDetail = true;
          pageStatus.textContent = '📄 Halaman produk Tokopedia detail';
          pageStatus.className = 'page-status ok';
        } else {
          pageStatus.textContent = '🔍 Halaman Tokopedia — siap ambil!';
          pageStatus.className = 'page-status ok';
        }
      }
    }
  } catch {}

  if (scrapePageBtn) scrapePageBtn.disabled = !isShopee;
  if (scrapeDetailBtn) scrapeDetailBtn.disabled = !(isShopee && isDetail);

  // Scrape Shopee page
  if (scrapePageBtn) {
    scrapePageBtn.addEventListener('click', async () => {
      scrapePageBtn.disabled = true;
      scrapePageBtn.textContent = '⏳ Membaca...';

      const category = categorySelect.value;
      const affiliateUrl = (document.getElementById('affiliateUrlInput')?.value || '').trim();

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
              if (affiliateUrl) p.affiliateUrl = affiliateUrl;
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

  // Scrape Shopee detail
  if (scrapeDetailBtn) {
    scrapeDetailBtn.addEventListener('click', async () => {
      scrapeDetailBtn.disabled = true;
      scrapeDetailBtn.textContent = '⏳ Membaca...';

      const category = categorySelect.value;
      const affiliateUrl = (document.getElementById('affiliateUrlInput')?.value || '').trim();
      const manualImageUrl = (document.getElementById('shopeeImageUrl')?.value || '').trim();

      try {
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

        if (affiliateUrl) product.affiliateUrl = affiliateUrl;

        // Override image URL kalau user paste manual (lebih reliable)
        if (manualImageUrl) product.image = manualImageUrl;

        const url = currentTab.url;
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
          } catch {}
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

  // Download CSV (Tab 1) — simpan gambar lokal dulu kalau server online
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', async () => {
      downloadCsvBtn.disabled = true;
      downloadCsvBtn.textContent = '⏳ Menyimpan gambar...';

      // Simpan gambar ke server lokal dulu
      if (imageServerOnline && collected.length > 0) {
        const imgResult = await saveAllImagesToLocal(collected);
        if (imgResult.success > 0) {
          saveCollected(); // Update localStorage
          downloadCsvBtn.textContent = `🖼️ ${imgResult.success} gambar disimpan lokal!`;
        } else {
          downloadCsvBtn.textContent = '💾 Gambar tetap URL asli (server offline?)';
        }
      }

      // Generate & download CSV
      const csv = buildCSV(collected);
      downloadCSV(csv, `jb-upload-${collected.length}produk.csv`);
      downloadCsvBtn.textContent = `✅ File terdownload! (${collected.length} produk)`;
      setTimeout(() => { downloadCsvBtn.textContent = '💾 Download File CSV (Format JB)'; }, 3000);
    });
  }

  // Clear (Tab 1)
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (collected.length === 0) return;
      collected = [];
      saveCollected();
    });
  }

  // ===== TAB 2: PASTE LINK (Shopee + Tokopedia) =====
  const linkInput = document.getElementById('linkInput');
  const fetchLinkBtn = document.getElementById('fetchLinkBtn');
  const linkStatus = document.getElementById('linkStatus');
  const linkCategorySelect = document.getElementById('linkCategorySelect');
  const linkDownloadBtn = document.getElementById('linkDownloadBtn');
  const linkClearBtn = document.getElementById('linkClearBtn');

  // Parse shopId & itemId from Shopee URL formats
  function parseShopeeUrl(url) {
    let m = url.match(/-i\.(\d+)\.(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2] };
    m = url.match(/\/product\/(\d+)\/(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2] };
    m = url.match(/\/universal-link\/product\/(\d+)\/(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2] };
    return null;
  }

  // Resolve short link (s.shopee.co.id, shope.ee, atid.me)
  function resolveShortLinkViaTab(shortUrl) {
    return new Promise((resolve) => {
      let resolved = false;

      chrome.tabs.create({ url: shortUrl, active: false }, (tab) => {
        const tabId = tab.id;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            chrome.tabs.remove(tabId).catch(() => {});
            resolve(shortUrl);
          }
        }, 10000);

        function onUpdated(updatedTabId, changeInfo, updatedTab) {
          if (updatedTabId !== tabId) return;
          const currentUrl = updatedTab.url || '';
          if (currentUrl.match(/-i\.\d+\.\d+/) ||
              currentUrl.match(/\/product\/\d+\/\d+/) ||
              currentUrl.match(/\/universal-link\/product\/\d+\/\d+/)) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              chrome.tabs.onUpdated.removeListener(onUpdated);
              chrome.tabs.remove(tabId).catch(() => {});
              resolve(currentUrl);
            }
          }
        }

        chrome.tabs.onUpdated.addListener(onUpdated);
      });
    });
  }

  async function resolveShortLinkViaFetch(shortUrl) {
    try {
      const resp = await fetch(shortUrl, {
        method: 'GET',
        redirect: 'follow',
        credentials: 'include',
      });
      if (resp.url && resp.url.includes('shopee.co.id')) {
        return resp.url;
      }
    } catch {}
    return null;
  }

  // Fetch Shopee product data via background tab
  async function fetchProductFromLink(shopId, itemId, category, affiliateUrl) {
    const productUrl = `https://shopee.co.id/product/${shopId}/${itemId}`;

    return new Promise((resolve) => {
      let resolved = false;
      let tabId = null;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (tabId) chrome.tabs.remove(tabId).catch(() => {});
          resolve(null);
        }
      }, 20000);

      chrome.tabs.create({ url: 'https://shopee.co.id/', active: false }, (tab) => {
        tabId = tab.id;

        function onUpdated(updatedTabId, changeInfo) {
          if (updatedTabId !== tabId) return;
          if (changeInfo.status !== 'complete') return;

          setTimeout(async () => {
            try {
              const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: fetchShopeeApiInPage,
                args: [shopId, itemId],
              });

              const apiData = results?.[0]?.result;
              if (!apiData || !apiData.title) {
                await new Promise(r => setTimeout(r, 2000));
                const retryResults = await chrome.scripting.executeScript({
                  target: { tabId: tabId },
                  func: fetchShopeeApiInPage,
                  args: [shopId, itemId],
                });
                const retryData = retryResults?.[0]?.result;
                if (retryData) Object.assign(apiData || {}, retryData);
              }

              const product = {
                category,
                marketplace: 'shopee',
                url: productUrl,
                affiliateUrl: affiliateUrl || '',
              };

              if (apiData) {
                if (apiData.title) product.title = apiData.title;
                if (apiData.image) product.image = apiData.image;
                if (apiData.price && apiData.price > 0) product.price = apiData.price;
                if (apiData.originalPrice && apiData.originalPrice > 0) product.originalPrice = apiData.originalPrice;
                if (apiData.discountPercent) product.discountPercent = apiData.discountPercent;
                if (apiData.rating) product.rating = apiData.rating;
                if (apiData.reviewCount) product.reviewCount = apiData.reviewCount;
                if (apiData.soldCount !== undefined) product.soldCount = apiData.soldCount;
                if (apiData.location) product.location = apiData.location;
              }

              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(onUpdated);
                chrome.tabs.remove(tabId).catch(() => {});
                resolve(product.title ? product : null);
              }
            } catch {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(onUpdated);
                chrome.tabs.remove(tabId).catch(() => {});
                resolve(null);
              }
            }
          }, 3000);
        }

        chrome.tabs.onUpdated.addListener(onUpdated);
      });
    });
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
      const tkpdAffiliate = (document.getElementById('tkpdAffiliateInput')?.value || '').trim();
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

        // === TOKOPEDIA LINKS ===
        if (url.match(/ta\.tokopedia\.com|tokopedia\.link|toko\.link/i)) {
          affiliateUrl = tkpdAffiliate || url; // Use AT affiliate input if available
          linkStatus.textContent = `⏳ Resolve Tokopedia link ${i + 1}/${lines.length}...`;

          const resolved = await resolveTokopediaAffiliate(url);
          if (resolved && parseTokopediaUrl(resolved)) {
            url = resolved;
          } else {
            errorCount++;
            continue;
          }

          // Scrape Tokopedia product
          linkStatus.textContent = `⏳ Ambil data Tokopedia ${i + 1}/${lines.length}...`;
          const tkpdInfo = parseTokopediaUrl(url);
          if (tkpdInfo) {
            const product = await fetchTokopediaProduct(url, category, affiliateUrl);
            if (product && product.title) {
              if (!existingUrls.has(product.url)) {
                collected.push(product);
                existingUrls.add(product.url);
                addedCount++;
              }
            } else {
              errorCount++;
            }
          } else {
            errorCount++;
          }
          continue;
        }

        // === DIRECT TOKOPEDIA LINK ===
        if (url.match(/tokopedia\.com/i) && !url.match(/ta\.tokopedia|tokopedia\.link|toko\.link/)) {
          affiliateUrl = tkpdAffiliate || '';
          linkStatus.textContent = `⏳ Ambil data Tokopedia ${i + 1}/${lines.length}...`;

          const product = await fetchTokopediaProduct(url, category, affiliateUrl);
          if (product && product.title) {
            if (!existingUrls.has(product.url)) {
              collected.push(product);
              existingUrls.add(product.url);
              addedCount++;
            }
          } else {
            errorCount++;
          }
          continue;
        }

        // === SHOPEE SHORT LINKS ===
        if (url.match(/s\.shopee\.co\.id|shope\.ee|shp\.ee|shp\.in/i)) {
          affiliateUrl = url;
          linkStatus.textContent = `⏳ Resolve link ${i + 1}/${lines.length}...`;

          let resolved = await resolveShortLinkViaFetch(url);
          if (resolved && parseShopeeUrl(resolved)) {
            url = resolved;
          } else {
            url = await resolveShortLinkViaTab(url);
          }
        }

        // === ATID.ME LINKS ===
        if (url.match(/atid\.me/i)) {
          affiliateUrl = url;
          linkStatus.textContent = `⏳ Resolve link ${i + 1}/${lines.length}...`;
          let resolved = await resolveShortLinkViaFetch(url);
          if (resolved && parseShopeeUrl(resolved)) {
            url = resolved;
          } else {
            url = await resolveShortLinkViaTab(url);
          }
        }

        // === SHOPEE PRODUCT ===
        const ids = parseShopeeUrl(url);
        if (!ids) {
          errorCount++;
          continue;
        }

        linkStatus.textContent = `⏳ Ambil data Shopee ${i + 1}/${lines.length}...`;

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
    linkDownloadBtn.addEventListener('click', async () => {
      linkDownloadBtn.disabled = true;
      linkDownloadBtn.textContent = '⏳ Menyimpan gambar...';

      // Simpan gambar ke server lokal dulu
      if (imageServerOnline && collected.length > 0) {
        const imgResult = await saveAllImagesToLocal(collected);
        if (imgResult.success > 0) {
          saveCollected();
          linkDownloadBtn.textContent = `🖼️ ${imgResult.success} gambar disimpan lokal!`;
        } else {
          linkDownloadBtn.textContent = '💾 Gambar tetap URL asli';
        }
      }

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
    });
  }

  // ===== TAB 3: TOKOPEDIA =====
  const scrapeTkpdPageBtn = document.getElementById('scrapeTkpdPageBtn');
  const scrapeTkpdDetailBtn = document.getElementById('scrapeTkpdDetailBtn');
  const tkpdDownloadBtn = document.getElementById('tkpdDownloadBtn');
  const tkpdClearBtn = document.getElementById('tkpdClearBtn');
  const tkpdCategorySelect = document.getElementById('tkpdCategorySelect');
  const tkpdTabAffiliateInput = document.getElementById('tkpdTabAffiliateInput');

  if (scrapeTkpdPageBtn) scrapeTkpdPageBtn.disabled = !isTokopedia;
  if (scrapeTkpdDetailBtn) scrapeTkpdDetailBtn.disabled = !(isTokopedia && isTkpdDetail);

  // Scrape Tokopedia page (search/listing)
  if (scrapeTkpdPageBtn) {
    scrapeTkpdPageBtn.addEventListener('click', async () => {
      scrapeTkpdPageBtn.disabled = true;
      scrapeTkpdPageBtn.textContent = '⏳ Membaca...';

      const category = tkpdCategorySelect?.value || 'Fashion';
      const affiliateUrl = (tkpdTabAffiliateInput?.value || '').trim();
      const manualImageUrl = (document.getElementById('tkpdImageUrl')?.value || '').trim();

      try {
        // If it's a product detail page, scrape as detail
        if (isTkpdDetail) {
          const product = await fetchTokopediaProduct(currentTab.url, category, affiliateUrl);
          if (product && product.title) {
            // Override image URL kalau user paste manual
            if (manualImageUrl) product.image = manualImageUrl;
            const existingUrls = new Set(collected.map(p => p.url));
            if (!existingUrls.has(product.url)) {
              collected.push(product);
              saveCollected();
              scrapeTkpdPageBtn.textContent = `✅ Ditambah! ⭐${product.rating?.toFixed(1) || '?'} (total ${collected.length})`;
            } else {
              scrapeTkpdPageBtn.textContent = '⚠️ Udah ada!';
            }
          } else {
            scrapeTkpdPageBtn.textContent = '❌ Gak bisa baca';
          }
        } else {
          // Try scraping search/listing page
          const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: scrapeTokopediaSearchPage,
            args: [category],
          });

          if (results?.[0]?.result) {
            const products = results[0].result;
            const existingUrls = new Set(collected.map(p => p.url));
            let newCount = 0;
            for (const p of products) {
              if (!existingUrls.has(p.url)) {
                if (affiliateUrl) p.affiliateUrl = affiliateUrl;
                collected.push(p);
                existingUrls.add(p.url);
                newCount++;
              }
            }
            saveCollected();
            scrapeTkpdPageBtn.textContent = `✅ +${newCount} baru (total ${collected.length})`;
          } else {
            scrapeTkpdPageBtn.textContent = '❌ Gak bisa baca halaman ini';
          }
        }
      } catch {
        scrapeTkpdPageBtn.textContent = '❌ Error';
      }

      setTimeout(() => {
        scrapeTkpdPageBtn.textContent = '📦 Ambil Produk dari Halaman Tokopedia';
        scrapeTkpdPageBtn.disabled = !isTokopedia;
      }, 2000);
    });
  }

  // Scrape Tokopedia detail page
  if (scrapeTkpdDetailBtn) {
    scrapeTkpdDetailBtn.addEventListener('click', async () => {
      scrapeTkpdDetailBtn.disabled = true;
      scrapeTkpdDetailBtn.textContent = '⏳ Membaca...';

      const category = tkpdCategorySelect?.value || 'Fashion';
      const affiliateUrl = (tkpdTabAffiliateInput?.value || '').trim();
      const manualImageUrl = (document.getElementById('tkpdImageUrl')?.value || '').trim();

      try {
        const product = await fetchTokopediaProduct(currentTab.url, category, affiliateUrl);
        if (product && product.title) {
          // Override image URL kalau user paste manual
          if (manualImageUrl) product.image = manualImageUrl;
          const existingUrls = new Set(collected.map(p => p.url));
          if (!existingUrls.has(product.url)) {
            collected.push(product);
            saveCollected();
            scrapeTkpdDetailBtn.textContent = `✅ Ditambah! ⭐${product.rating?.toFixed(1) || '?'} (total ${collected.length})`;
          } else {
            scrapeTkpdDetailBtn.textContent = '⚠️ Udah ada!';
          }
        } else {
          scrapeTkpdDetailBtn.textContent = '❌ Gak bisa baca';
        }
      } catch {
        scrapeTkpdDetailBtn.textContent = '❌ Error';
      }

      setTimeout(() => {
        scrapeTkpdDetailBtn.textContent = '🔍 Ambil 1 Produk (Halaman Detail Tokopedia)';
        scrapeTkpdDetailBtn.disabled = !(isTokopedia && isTkpdDetail);
      }, 2000);
    });
  }

  if (tkpdDownloadBtn) {
    tkpdDownloadBtn.addEventListener('click', async () => {
      tkpdDownloadBtn.disabled = true;
      tkpdDownloadBtn.textContent = '⏳ Menyimpan gambar...';

      // Simpan gambar ke server lokal dulu
      if (imageServerOnline && collected.length > 0) {
        const imgResult = await saveAllImagesToLocal(collected);
        if (imgResult.success > 0) {
          saveCollected();
          tkpdDownloadBtn.textContent = `🖼️ ${imgResult.success} gambar disimpan lokal!`;
        } else {
          tkpdDownloadBtn.textContent = '💾 Gambar tetap URL asli';
        }
      }

      const csv = buildCSV(collected);
      downloadCSV(csv, `jb-upload-${collected.length}produk.csv`);
      tkpdDownloadBtn.textContent = `✅ File terdownload! (${collected.length} produk)`;
      setTimeout(() => { tkpdDownloadBtn.textContent = '💾 Download File CSV (Format JB)'; }, 3000);
    });
  }

  if (tkpdClearBtn) {
    tkpdClearBtn.addEventListener('click', () => {
      if (collected.length === 0) return;
      collected = [];
      saveCollected();
    });
  }

  // ===== TAB 4: CONVERT ACCESSTRADE =====
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

      let filtered = accesstradeProducts.filter(p => {
        if (p.price < minPrice) return false;
        if (maxPrice && p.price > maxPrice) return false;
        if (catFilter && !(p.category || '').toLowerCase().includes(catFilter)) return false;
        return true;
      });

      filtered = filtered.slice(0, maxProducts);

      if (filtered.length === 0) {
        convertStatus.textContent = '❌ Gak ada produk yang lolos filter. Coba ubah filter.';
        convertStatus.className = 'page-status no';
        convertBtn.disabled = false;
        convertBtn.textContent = '💾 Convert & Download CSV (Format JB)';
        return;
      }

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
  updateLinkUI();
  updateTkpdUI();
});


// ================================================================
//  SCRAPING FUNCTIONS — run INSIDE the target page
// ================================================================

// ========== SHOPEE SCRAPERS ==========

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

      const img = link.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
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

function scrapeProductDetail(category) {
  const url = window.location.href;
  const product = { category, marketplace: 'shopee', url };

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

  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    const imgContent = ogImage.getAttribute('content');
    if (imgContent && imgContent.includes('susercontent')) {
      product.image = imgContent;
    }
  }

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
        if (src && !src.startsWith('data:') && !src.includes('icon') && !src.includes('logo')) {
          product.image = src;
          break;
        }
      }
    }
  }

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

  const soldMatch = bodyText.match(/([\d.]+)\s*terjual/i);
  if (soldMatch) {
    product.soldCount = parseInt(soldMatch[1].replace(/\./g, ''), 10);
  } else {
    const rbMatch = bodyText.match(/([\d,]+)\s*rb\s*terjual/i);
    if (rbMatch) product.soldCount = Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);
  }

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

  if (!product.rating) {
    const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
    if (ratingEl) {
      const rText = ratingEl.textContent;
      const rMatch = rText.match(/(\d+[.,]\d+)/);
      if (rMatch) product.rating = parseFloat(rMatch[1].replace(',', '.'));
    }
  }

  const locMatch = bodyText.match(/Dikirim dari\s*([^\n,]+)/i);
  if (locMatch) product.location = locMatch[1].trim();

  return product;
}

function fetchShopeeApiInPage(shopId, itemId) {
  const apiUrl = `https://shopee.co.id/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;

  return fetch(apiUrl, {
    credentials: 'include',
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

      if (item.image) {
        result.image = `https://down-id.img.susercontent.com/file/${item.image}`;
      } else if (item.images && item.images.length > 0) {
        result.image = `https://down-id.img.susercontent.com/file/${item.images[0]}`;
      }

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

      if (item.item_rating) {
        result.rating = item.item_rating.rating_star || 0;
        const ratingCount = item.item_rating.rating_count || [];
        result.reviewCount = Array.isArray(ratingCount)
          ? ratingCount.reduce((sum, c) => sum + (c || 0), 0)
          : 0;
      }

      if (item.historical_sold !== undefined && item.historical_sold !== null) {
        result.soldCount = item.historical_sold;
      } else if (item.sold !== undefined && item.sold !== null) {
        result.soldCount = item.sold;
      }

      if (item.shop_location) result.location = item.shop_location;

      return result;
    })
    .catch(() => null);
}


// ========== TOKOPEDIA SCRAPERS ==========

// Scrape Tokopedia product detail page — runs INSIDE the Tokopedia page
function scrapeTokopediaProduct(category) {
  const url = window.location.href;
  const product = { category, marketplace: 'tokopedia', url: url.split('?')[0] };

  // ── Title ──
  // Tokopedia uses various selectors for product title
  const titleSelectors = [
    'h1[data-testid="lblPDPDetailProductName"]',
    'h1.css-1wtrxts',
    'h1',
    '[data-testid="lblPDPDetailProductName"]',
    '.css-1wtrxts',
    '[class*="pdp-detail"] h1',
    '[class*="product-name"]',
  ];
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 3) {
      product.title = el.textContent.trim();
      break;
    }
  }

  // ── Image ──
  // IMPORTANT: Tokopedia's og:image and thumbnail selectors often return
  // placeholder/wrong images. We need the REAL product image.
  // Strategy: 1) Extract from __NEXT_DATA__ (React SSR), 2) Extract from
  // JSON-LD, 3) Look for large signed images (tokopedia-static.net), 
  // 4) og:image fallback

  // Method 1: Extract from __NEXT_DATA__ (most reliable — contains full product data)
  try {
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (nextDataScript) {
      const nextData = JSON.parse(nextDataScript.textContent);
      const pageProps = nextData?.props?.pageProps;
      
      // Try different paths where product images might be stored
      const possiblePaths = [
        pageProps?.product?.imageUrl,
        pageProps?.product?.image,
        pageProps?.product?.images?.[0],
        pageProps?.productDetail?.imageUrl,
        pageProps?.productDetail?.image,
        pageProps?.productDetail?.images?.[0],
        pageProps?.detail?.imageUrl,
        pageProps?.detail?.image,
        pageProps?.detail?.images?.[0],
        pageProps?.pdp?.imageUrl,
        pageProps?.pdp?.image,
        pageProps?.pdp?.images?.[0],
      ];
      
      for (const img of possiblePaths) {
        if (img && typeof img === 'string' && img.length > 20) {
          product.image = img;
          break;
        }
        if (img && Array.isArray(img) && img.length > 0 && typeof img[0] === 'string') {
          product.image = img[0];
          break;
        }
      }
      
      // Also try to find from nested product data
      if (!product.image) {
        const searchIn = (obj, depth = 0) => {
          if (!obj || depth > 4) return null;
          if (obj.imageUrl && typeof obj.imageUrl === 'string' && obj.imageUrl.length > 20) return obj.imageUrl;
          if (obj.image && typeof obj.image === 'string' && obj.image.length > 20 && !obj.image.startsWith('data:')) return obj.image;
          if (obj.images && Array.isArray(obj.images) && obj.images.length > 0) {
            const first = obj.images[0];
            if (typeof first === 'string' && first.length > 20) return first;
            if (typeof first === 'object' && first.url) return first.url;
          }
          for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              const found = searchIn(obj[key], depth + 1);
              if (found) return found;
            }
          }
          return null;
        };
        const found = searchIn(pageProps);
        if (found) product.image = found;
      }
    }
  } catch {}

  // Method 2: Look for large signed Tokopedia images in all <img> tags
  // (these contain the real product photo with tokopedia-static.net domain)
  if (!product.image) {
    const allImages = document.querySelectorAll('img');
    for (const img of allImages) {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      // Signed Tokopedia images have the real product photo
      if (src.includes('tokopedia-static.net') || src.includes('tokopedia.net/img/cache')) {
        // Skip small thumbnails (cache/300 is thumbnail, cache/900+ or static.net is real)
        if (src.includes('/cache/300/') && !src.includes('tokopedia-static.net')) continue;
        if (src && !src.startsWith('data:') && src.length > 50) {
          product.image = src;
          break;
        }
      }
    }
    
    // If we still only have thumbnail, try to find the largest image
    if (!product.image) {
      let largestSrc = '';
      let largestArea = 0;
      for (const img of allImages) {
        const src = img.getAttribute('src') || '';
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        const area = w * h;
        if (src && (src.includes('tokopedia') || src.includes('ktpcdn') || src.includes('cbn.net')) && area > largestArea && area >= 200) {
          largestArea = area;
          largestSrc = src;
        }
      }
      if (largestSrc) product.image = largestSrc;
    }
  }

  // Method 3: og:image fallback (often returns placeholder, but better than nothing)
  if (!product.image) {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const imgContent = ogImage.getAttribute('content');
      if (imgContent && (imgContent.includes('tokopedia') || imgContent.includes('cbn.net') || imgContent.includes('ktpcdn'))) {
        product.image = imgContent;
      }
    }
  }

  // Method 4: Fallback — specific CSS selectors for product images
  if (!product.image) {
    const imgSelectors = [
      'img[data-testid="PDPMainImage"]',
      'img.css-1jwf0hz',
      '[class*="pdp-img"] img',
      '[class*="product-image"] img',
    ];
    for (const sel of imgSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
        if (src && !src.startsWith('data:') && !src.includes('icon') && !src.includes('logo') && src.length > 30) {
          product.image = src;
          break;
        }
      }
    }
  }

  // ── Price ──
  const bodyText = document.body.innerText;

  // Try structured price selectors first
  const priceSelectors = [
    '[data-testid="lblPDPDetailProductPrice"]',
    '.css-1ksbit4',
    '[class*="price"] [class*="detail"]',
    '[class*="pdp-price"]',
  ];
  for (const sel of priceSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const priceText = el.textContent;
      const priceMatch = priceText.match(/Rp\s*([\d.]+)/i);
      if (priceMatch) {
        product.price = parseInt(priceMatch[1].replace(/\./g, ''), 10);
        break;
      }
    }
  }

  // Fallback: regex from body text
  if (!product.price) {
    const priceMatch = bodyText.match(/Rp\s*([\d.]+)/i);
    if (priceMatch) product.price = parseInt(priceMatch[1].replace(/\./g, ''), 10);
  }

  // ── Original Price (before discount) ──
  const allPrices = [...bodyText.matchAll(/Rp\s*([\d.]+)/gi)];
  if (allPrices.length > 1) {
    const prices = allPrices.map(m => parseInt(m[1].replace(/\./g, ''), 10)).filter(p => p > 0);
    // The highest price is usually the original price
    const maxPrice = Math.max(...prices);
    if (maxPrice > (product.price || 0)) {
      product.originalPrice = maxPrice;
      if (product.originalPrice > 0 && product.price > 0) {
        product.discountPercent = Math.round((1 - product.price / product.originalPrice) * 100);
      }
    }
  }

  // ── Rating ──
  const ratingSelectors = [
    '[data-testid="lblPDPDetailProductRatingNumber"]',
    'span[data-testid="lblPDPDetailProductRatingNumber"]',
    '[class*="rating"] [class*="number"]',
  ];
  for (const sel of ratingSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const rMatch = el.textContent.match(/(\d+[.,]\d+)/);
      if (rMatch) {
        product.rating = parseFloat(rMatch[1].replace(',', '.'));
        break;
      }
    }
  }

  // Fallback: regex from body text
  if (!product.rating) {
    const ratingMatch = bodyText.match(/(\d+[.,]\d+)\s*(?:\/\s*5|dari\s*5|bintang)/i);
    if (ratingMatch) product.rating = parseFloat(ratingMatch[1].replace(',', '.'));
  }

  // ── Review Count ──
  const reviewSelectors = [
    '[data-testid="lblPDPDetailProductRatingCounter"]',
    'span[data-testid="lblPDPDetailProductRatingCounter"]',
    'button[data-testid="lblPDPDetailProductRatingCounter"]',
  ];
  for (const sel of reviewSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const reviewText = el.textContent;
      const reviewMatch = reviewText.match(/([\d.]+)/);
      if (reviewMatch) {
        let count = reviewMatch[1].replace(/\./g, '');
        if (reviewText.includes('rb') || reviewText.includes('ribu')) {
          count = Math.round(parseFloat(reviewMatch[1].replace(',', '.')) * 1000);
        }
        product.reviewCount = parseInt(count, 10);
        break;
      }
    }
  }

  // ── Sold Count ──
  const soldMatch = bodyText.match(/([\d.]+)\s*(?:rb|ribu)?\s*terjual/i);
  if (soldMatch) {
    let soldStr = soldMatch[1];
    if (soldMatch[0].includes('rb') || soldMatch[0].includes('ribu')) {
      product.soldCount = Math.round(parseFloat(soldStr.replace(',', '.')) * 1000);
    } else {
      product.soldCount = parseInt(soldStr.replace(/\./g, ''), 10);
    }
  }

  // ── Location ──
  const locMatch = bodyText.match(/(?:Dikirim dari|Lokasi)\s*[:\-]?\s*([^\n,]+)/i);
  if (locMatch) product.location = locMatch[1].trim().substring(0, 50);

  // ── Try JSON-LD structured data (very reliable for Tokopedia) ──
  try {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      const jsonText = script.textContent;
      if (jsonText.includes('Product')) {
        const data = JSON.parse(jsonText);
        if (data['@type'] === 'Product' || (Array.isArray(data) && data.find(d => d['@type'] === 'Product'))) {
          const prod = Array.isArray(data) ? data.find(d => d['@type'] === 'Product') : data;

          if (prod.name && (!product.title || product.title.length < 5)) product.title = prod.name;

          if (prod.image) {
            const img = Array.isArray(prod.image) ? prod.image[0] : prod.image;
            if (img && !product.image) product.image = img;
          }

          if (prod.offers) {
            const offers = prod.offers;
            if (offers.price && !product.price) {
              product.price = parseInt(String(offers.price).replace(/[^\d]/g, ''), 10);
            }
            if (offers.highPrice && !product.originalPrice) {
              product.originalPrice = parseInt(String(offers.highPrice).replace(/[^\d]/g, ''), 10);
            }
            if (offers.priceCurrency && offers.priceCurrency !== 'IDR') {
              // Skip non-IDR
            }
          }

          if (prod.aggregateRating) {
            if (prod.aggregateRating.ratingValue && !product.rating) {
              product.rating = parseFloat(prod.aggregateRating.ratingValue);
            }
            if (prod.aggregateRating.reviewCount && !product.reviewCount) {
              product.reviewCount = parseInt(prod.aggregateRating.reviewCount, 10);
            }
          }
        }
      }
    }
  } catch {}

  return product;
}

// Scrape Tokopedia search/listing page — runs INSIDE the page
function scrapeTokopediaSearchPage(category) {
  const products = [];

  // Tokopedia search page product cards
  const productCards = document.querySelectorAll('[data-testid="master-product-card"], .css-1g1gtb0, [class*="product-card"], [class*="pcv3__info"]');

  for (const card of productCards) {
    try {
      const product = { category, marketplace: 'tokopedia' };

      // Get link
      const linkEl = card.closest('a') || card.querySelector('a');
      if (linkEl) {
        const href = linkEl.getAttribute('href') || '';
        product.url = href.startsWith('/') ? 'https://www.tokopedia.com' + href : href;
      }

      if (!product.url || !product.url.includes('tokopedia.com')) continue;

      // Get title
      const titleEl = card.querySelector('[data-testid="master-product-card-name"], [class*="product-name"], [class*="pcv3__info__name"], span.css-1f4mp12');
      if (titleEl) {
        product.title = titleEl.textContent.trim();
      }
      if (!product.title || product.title.length < 3) continue;

      // Get price
      const priceEl = card.querySelector('[data-testid="master-product-card-price"], [class*="product-price"], [class*="pcv3__info__price"], span.css-1ksbit4');
      if (priceEl) {
        const priceText = priceEl.textContent;
        const priceMatch = priceText.match(/Rp\s*([\d.]+)/i);
        if (priceMatch) product.price = parseInt(priceMatch[1].replace(/\./g, ''), 10);
      }

      // Get image — prefer large images (tokopedia-static.net) over thumbnails
      const imgEl = card.querySelector('img');
      if (imgEl) {
        const src = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
        // Skip small thumbnails from cache/300 — they're often placeholders
        if (src && !src.startsWith('data:') && src.length > 30) {
          if (src.includes('tokopedia-static.net') || !src.includes('/cache/300/')) {
            product.image = src;
          } else if (!product.image) {
            product.image = src; // Fallback to thumbnail if nothing else
          }
        }
      }

      // Get rating
      const ratingEl = card.querySelector('[class*="rating"], [class*="pcv3__info__rating"]');
      if (ratingEl) {
        const rMatch = ratingEl.textContent.match(/(\d+[.,]\d+)/);
        if (rMatch) product.rating = parseFloat(rMatch[1].replace(',', '.'));
      }

      // Get sold count
      const text = card.textContent;
      const soldMatch = text.match(/([\d.]+)\s*(?:rb|ribu)?\s*terjual/i);
      if (soldMatch) {
        if (soldMatch[0].includes('rb') || soldMatch[0].includes('ribu')) {
          product.soldCount = Math.round(parseFloat(soldMatch[1].replace(',', '.')) * 1000);
        } else {
          product.soldCount = parseInt(soldMatch[1].replace(/\./g, ''), 10);
        }
      }

      if (product.title && (product.price || product.url)) {
        products.push(product);
      }
    } catch {}
  }

  // Deduplicate
  const seen = new Set();
  return products.filter(p => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
}
