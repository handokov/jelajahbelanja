# JB Scraper (TikTok + Tokopedia) — Chrome Extension v1.1

Scrape produk dari TikTok Shop & Tokopedia (format lama + shop-id.tokopedia.com) → upload ke JelajahBelanja.com

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
