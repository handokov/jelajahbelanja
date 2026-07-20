# JB Scraper (All Marketplace) — Chrome Extension v3.3

Scrape produk dari Shopee, Tokopedia, Blibli, Lazada, Bukalapak, Zalora, Sociolla, TikTok Shop -> upload ke JelajahBelanja.com

## v3.3.1 (2026-07-20)
- FIX: `extractProductStats` helper tidak available di page context (chrome.scripting.executeScript)
- Inline stats extraction langsung di setiap scraper function (Shopee/Blibli/Lazada/Bukalapak/Zalora/Sociolla)
- Sekarang scrape jalan lagi di semua marketplace (mode Scrape Produk Ini + Paste Link URL)
- Top-level helper `extractProductStats()` dihapus (tidak bisa di-inject cross-context)
- Bump manifest 3.3.0 -> 3.3.1

## v3.3.0 (2026-07-20)
- NEW: `extractProductStats()` helper — rating, soldCount, reviewCount, location
- Supports all 8 marketplaces (Shopee/Tokopedia/Blibli/Lazada/Bukalapak/Zalora/Sociolla/TikTok)
- Indonesian number format: "1.2RB terjual" = 1200, "10RB" = 10000, "1,5RB" = 1500
- Multiple fallback: CSS selector -> text regex -> JSON-LD
- 12/12 test cases pass
- Bukalapak/Zalora/Sociolla sekarang extract `soldCount` + `location` (sebelumnya hardcoded 0/null)
- Helper dipakai di 6 scraper (Shopee/Blibli/Lazada/Bukalapak/Zalora/Sociolla) sebagai fallback
- Bump manifest 3.2.3 -> 3.3.0
- ⚠️ Bug: helper tidak ter-inject ke page context via chrome.scripting.executeScript -> fixed di v3.3.1

## v3.2.3 (sebelumnya)
- Auto-upload Tokopedia image ke Cloudinary
- Refresh image + paste link + save CSV

---


## Support Marketplace

| Marketplace | URL | Auto-affiliate AT |
|-------------|-----|-------------------|
| TikTok Shop | shop.tiktok.com, www.tiktok.com | ❌ Manual |
| Tokopedia (lama) | www.tokopedia.com | ❌ Manual |
| Tokopedia (baru) | shop-id.tokopedia.com | ❌ Manual |
| Tokopedia affiliate | ta.tokopedia.com, tokopedia.link | ❌ Manual |

## Cara Install

1. Download folder `jb-tiktok-scraper`
2. Buka Chrome → `chrome://extensions/`
3. Aktifkan **"Developer mode"** (kanan atas)
4. Klik **"Load unpacked"** → pilih folder `jb-tiktok-scraper`
5. Extension muncul di toolbar Chrome

## Cara Pakai

1. Klik icon extension → isi **Admin Secret** (dari login JB admin)
2. Klik **"Save Config"**
3. Buka produk di TikTok Shop atau Tokopedia (termasuk shop-id.tokopedia.com)
4. Klik icon extension → **"Scrape Produk Ini"**
5. Preview produk muncul → cek data
6. Klik **"Upload Produk"** → produk masuk ke DB JelajahBelanja

## Field yang Di-scrape

- ✅ Title (judul produk)
- ✅ Price (harga)
- ✅ Original Price (harga coret, kalau ada)
- ✅ Discount Percent (persen diskon)
- ✅ Image (foto produk)
- ✅ Rating
- ✅ Review Count
- ✅ Sold Count
- ✅ Location (lokasi seller)
- ✅ URL produk
- ✅ Category (dari breadcrumb, kalau ada)
- ✅ Marketplace (auto-detect dari URL: tiktok / tokopedia)

## Auto-Detect Marketplace

Extension otomatis detect marketplace dari URL:
- `tiktok.com` / `shop.tiktok.com` → tiktok
- `tokopedia.com` / `shop-id.tokopedia.com` / `ta.tokopedia.com` / `tokopedia.link` → tokopedia

## Affiliate URL

⚠️ **Affiliate URL TikTok Shop & Tokopedia harus diisi manual** di admin JB setelah upload:
- AccessTrade belum support quicklink untuk TikTok Shop
- AccessTrade belum support quicklink untuk Tokopedia
- Shopee sudah auto-affiliate (pakai extension lama `jb-scraper-extension-v11.zip`)

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| "Gagal scrape" | Pastikan di halaman produk tunggal, bukan list/kategori |
| "Upload gagal" | Cek Admin Secret benar + API Base URL benar |
| Image tidak muncul | Page mungkin belum fully loaded, tunggu 2-3 detik lalu scrape lagi |
| Harga 0 | Tokopedia render harga via JS, tunggu page fully loaded |
| Title kosong | Coba refresh page, lalu scrape lagi |

## Update dari v1.0

- ✅ Tambah support Tokopedia (format lama + shop-id.tokopedia.com)
- ✅ Auto-detect marketplace dari URL
- ✅ Scraper Tokopedia pakai data-testid selectors (lebih stabil)
