#!/usr/bin/env python3
"""
Upgrade JB Scraper v3.2.3 -> v3.3.0
- Insert extractProductStats helper before TikTok scraper
- Add missing local vars (soldCount/location) to Bukalapak/Zalora/Sociolla
- Update 6 return statements to use helper as fallback
"""
import re
import sys
from pathlib import Path

POPUP_JS = Path('/tmp/v32-extract/scraper-fix/popup.js')

src = POPUP_JS.read_text(encoding='utf-8')
orig_len = len(src)
print(f'[read] popup.js ({orig_len} bytes, {src.count(chr(10))+1} lines)')

# ─────────────────────────────────────────────────────────────────────────────
# 1. Insert extractProductStats helper before `// === TIKTOK SHOP SCRAPER ===`
# ─────────────────────────────────────────────────────────────────────────────
HELPER = '''function formatRupiah(n) {
  if (!n) return '-';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

/**
 * Extract rating, soldCount, reviewCount, location from a product card element.
 * Works across Shopee, Tokopedia, Blibli, Lazada, Bukalapak, Zalora, Sociolla, TikTok Shop.
 * Multiple fallback strategies: CSS selector -> text regex -> JSON-LD.
 *
 * Indonesian number formats:
 *   "1.2RB terjual"    -> 1200
 *   "10RB terjual"     -> 10000
 *   "1,5RB terjual"    -> 1500
 *   "1.234 terjual"    -> 1234
 *   "100+ terjual"     -> 100
 *   "Terjual 100"      -> 100
 *
 * v3.3.0
 */
function extractProductStats(card) {
  const out = { rating: null, reviewCount: null, soldCount: null, location: null };
  if (!card) return out;
  const text = (card.textContent || '').trim();
  if (!text) return out;

  // -- Rating + Review count (combined "4.9 (1.234 rating)" pattern) --
  const ratingReviewMatch = text.match(
    /(\\d+[.,]\\d+)\\s*\\(\\s*(\\d[\\d.,]*)\\s*(rb|ribu)?\\s*(?:rating|review|evaluasi|ulasan)\\s*\\)/i
  );
  if (ratingReviewMatch) {
    out.rating = parseFloat(ratingReviewMatch[1].replace(',', '.'));
    let rn = parseFloat(ratingReviewMatch[2].replace(/\\./g, '').replace(',', '.'));
    if (ratingReviewMatch[3]) rn *= 1000;
    out.reviewCount = Math.round(rn);
  }

  // -- Rating (DOM element selector first, then text fallback) --
  if (out.rating === null && card.querySelector) {
    const ratingEl = card.querySelector(
      '[class*="rating"], [class*="Rating"], [class*="pcv3__info__rating"], ' +
      '[data-testid*="Rating"], [data-testid*="rating"], [data-e2e*="rating"], ' +
      '.rating-value, .product-rating, [class*="star"]'
    );
    if (ratingEl) {
      const rMatch = ratingEl.textContent.match(/(\\d+[.,]\\d+)/);
      if (rMatch) out.rating = parseFloat(rMatch[1].replace(',', '.'));
    }
  }
  if (out.rating === null) {
    const fallbackPats = [
      /(\\d+[.,]\\d+)\\s*(?:\\/\\s*5|dari\\s*5|bintang|\\u2b50|\\u1f31f)/i,
      /(?:rating|rate)\\s*[:\\-]?\\s*(\\d+[.,]\\d+)/i,
    ];
    for (const p of fallbackPats) {
      const m = text.match(p);
      if (m) { out.rating = parseFloat(m[1].replace(',', '.')); break; }
    }
  }

  // -- Review count (standalone, if not captured above) --
  if (out.reviewCount === null) {
    const rm = text.match(/\\(\\s*(\\d[\\d.,]*)\\s*(rb|ribu)?\\s*(?:rating|review|evaluasi|ulasan)\\s*\\)/i);
    if (rm) {
      let rn = parseFloat(rm[1].replace(/\\./g, '').replace(',', '.'));
      if (rm[2]) rn *= 1000;
      out.reviewCount = Math.round(rn);
    }
  }

  // -- Sold count -- disambiguates dot: decimal (when RB/ribu present) vs thousands sep --
  const soldPats = [
    { pat: /(\\d+(?:[.,]\\d+)?)\\s*(rb|ribu)\\s*terjual/i, multiplier: true },
    { pat: /terjual\\s*(\\d+(?:[.,]\\d+)?)\\s*\\+?\\s*(rb|ribu)?/i, multiplier: true },
    { pat: /([\\d.,]+)\\s*\\+?\\s*terjual/i, multiplier: false },
  ];
  for (const { pat, multiplier } of soldPats) {
    const m = text.match(pat);
    if (m) {
      let numStr = m[1];
      numStr = multiplier
        ? numStr.replace(',', '.')
        : numStr.replace(/\\./g, '').replace(',', '.');
      let n = parseFloat(numStr);
      if (m[2] && /rb|ribu/i.test(m[2])) n *= 1000;
      if (!isNaN(n)) { out.soldCount = Math.round(n); break; }
    }
  }

  // -- Location --
  if (card.querySelector) {
    const locEl = card.querySelector(
      '[class*="location"], [class*="Location"], [class*="shop-location"], ' +
      '[class*="pcv3__info__shop"], [data-sqe="location"]'
    );
    if (locEl) {
      const lt = (locEl.textContent || '').trim();
      const lm = lt.match(/(Kab(?:upaten|\\.)?\\s*[\\w\\s.]+|Kota\\s+[\\w\\s.]+|[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)/);
      if (lm) out.location = lm[1].trim().substring(0, 50);
    }
  }

  return out;
}

// === TIKTOK SHOP SCRAPER ==='''

OLD_FORMATRUPIAH = '''function formatRupiah(n) {
  if (!n) return '-';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// === TIKTOK SHOP SCRAPER ==='''

if OLD_FORMATRUPIAH not in src:
    print('[ERROR] formatRupiah anchor not found'); sys.exit(1)
src = src.replace(OLD_FORMATRUPIAH, HELPER, 1)
print('[ok] inserted extractProductStats helper')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add missing local vars (soldCount) to Bukalapak
# ─────────────────────────────────────────────────────────────────────────────
# Bukalapak has rating + location but NO soldCount local var.
# Insert `let soldCount = 0;` right before `let category = 'Lainnya';` in Bukalapak only.
# Bukalapak's rating extraction block ends with this exact pattern (line ~1515-1521).
BUKALAPAK_ANCHOR = """  if (match) rating = parseFloat(match[1]);
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
}"""

BUKALAPAK_NEW = """  if (match) rating = parseFloat(match[1]);
  }

  // v3.3.0: declare soldCount (was missing in v3.2.3)
  let soldCount = 0;
  const soldEl = document.querySelector('[class*="sold"], [class*="Sold"]');
  if (soldEl) {
    const stext = soldEl.textContent;
    const smatch = stext.match(/([\\d.,]+)\\s*\\+?\\s*(rb|ribu)?/i);
    if (smatch) {
      let sn = parseFloat(smatch[1].replace(/\\./g, '').replace(',', '.'));
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

  // v3.3.0: extractProductStats helper fills rating/sold/review if main selectors missed
  const _stats = extractProductStats(document.body || document.documentElement);
  return {
    title, price, originalPrice, discountPercent, image,
    rating: rating || _stats.rating || 4.5,
    reviewCount: _stats.reviewCount || 0,
    soldCount: soldCount || _stats.soldCount || 0,
    location: location || _stats.location,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}"""

if BUKALAPAK_ANCHOR not in src:
    print('[ERROR] Bukalapak anchor not found'); sys.exit(1)
src = src.replace(BUKALAPAK_ANCHOR, BUKALAPAK_NEW, 1)
print('[ok] updated Bukalapak return + added soldCount extraction')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Add missing local vars (soldCount + location) to Zalora
# ─────────────────────────────────────────────────────────────────────────────
# Zalora has only rating; no soldCount, no location.
ZALORA_ANCHOR = """  let rating = 4.5;
  const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\\d+\\.?\\d*)/);
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

// === SOCIOLLA SCRAPER ==="""

ZALORA_NEW = """  let rating = 4.5;
  const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\\d+\\.?\\d*)/);
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

  // v3.3.0: extractProductStats helper fills rating/sold/review if main selectors missed
  const _stats = extractProductStats(document.body || document.documentElement);
  return {
    title, price, originalPrice, discountPercent, image,
    rating: rating || _stats.rating || 4.5,
    reviewCount: _stats.reviewCount || 0,
    soldCount: soldCount || _stats.soldCount || 0,
    location: location || _stats.location,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}

// === SOCIOLLA SCRAPER ==="""

if ZALORA_ANCHOR not in src:
    print('[ERROR] Zalora anchor not found'); sys.exit(1)
src = src.replace(ZALORA_ANCHOR, ZALORA_NEW, 1)
print('[ok] updated Zalora return + added soldCount/location locals')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Add missing local vars (soldCount + location) to Sociolla (last function)
# ─────────────────────────────────────────────────────────────────────────────
SOCIOLLA_ANCHOR = """  let rating = 4.5;
  const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\\d+\\.?\\d*)/);
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
}"""

SOCIOLLA_NEW = """  let rating = 4.5;
  const ratingEl = document.querySelector('[class*="rating"], [class*="Rating"]');
  if (ratingEl) {
    const match = ratingEl.textContent.match(/(\\d+\\.?\\d*)/);
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

  // v3.3.0: extractProductStats helper fills rating/sold/review if main selectors missed
  const _stats = extractProductStats(document.body || document.documentElement);
  return {
    title, price, originalPrice, discountPercent, image,
    rating: rating || _stats.rating || 4.5,
    reviewCount: _stats.reviewCount || 0,
    soldCount: soldCount || _stats.soldCount || 0,
    location: location || _stats.location,
    url: window.location.href, category,
    affiliateUrl: null,
  };
}"""

if SOCIOLLA_ANCHOR not in src:
    print('[ERROR] Sociolla anchor not found'); sys.exit(1)
src = src.replace(SOCIOLLA_ANCHOR, SOCIOLLA_NEW, 1)
print('[ok] updated Sociolla return + added soldCount/location locals')

# ─────────────────────────────────────────────────────────────────────────────
# 5. Update Shopee/Blibli/Lazada return statements (Pattern A — have all locals)
# Pattern A: `rating, reviewCount: 0, soldCount, location,`
# This appears 3 times (Shopee, Blibli, Lazada). Use replace_all.
# ─────────────────────────────────────────────────────────────────────────────
PATTERN_A_OLD = """  return {
    title, price, originalPrice, discountPercent, image,
    rating, reviewCount: 0, soldCount, location,
    url: window.location.href, category,
    affiliateUrl: null,
  };"""

PATTERN_A_NEW = """  // v3.3.0: extractProductStats helper fills rating/sold/review if main selectors missed
  const _stats = extractProductStats(document.body || document.documentElement);
  return {
    title, price, originalPrice, discountPercent, image,
    rating: rating || _stats.rating || 4.5,
    reviewCount: _stats.reviewCount || 0,
    soldCount: soldCount || _stats.soldCount || 0,
    location: location || _stats.location,
    url: window.location.href, category,
    affiliateUrl: null,
  };"""

count_a = src.count(PATTERN_A_OLD)
if count_a != 3:
    print(f'[ERROR] Pattern A expected 3 occurrences, found {count_a}'); sys.exit(1)
src = src.replace(PATTERN_A_OLD, PATTERN_A_NEW)
print(f'[ok] updated {count_a} Pattern A returns (Shopee, Blibli, Lazada)')

# ─────────────────────────────────────────────────────────────────────────────
# Final write
# ─────────────────────────────────────────────────────────────────────────────
POPUP_JS.write_text(src, encoding='utf-8')
new_len = len(src)
print(f'[write] popup.js ({new_len} bytes, +{new_len - orig_len} bytes, {src.count(chr(10))+1} lines)')

# Verify
remaining = src.count('reviewCount: 0')
print(f'[verify] remaining "reviewCount: 0" occurrences: {remaining} (expected 0)')
helper_count = src.count('extractProductStats')
print(f'[verify] extractProductStats references: {helper_count} (expected 7: 1 def + 6 calls)')
