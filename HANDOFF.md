# 🔄 HANDOFF — JelajahBelanja Project (Updated 2026-08-18)

## 📌 INFO PROYEK
- **Website**: https://jelajahbelanja.com
- **Repo**: https://github.com/handokov/jelajahbelanja.git (PUBLIC)
- **Branch**: main
- **Framework**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Database**: Neon PostgreSQL via Prisma ORM
- **Deploy**: Vercel auto-deploy dari main branch
- **Local Path**: `/home/z/my-project/`

---

## 🚀 STATUS CURRENT (Agustus 2026)

### Traffic & Conversion
- **Traffic**: ~50-100 klik/hari, fase building 3-6 bulan
- **AT Dashboard**: ~163 klik, konversi pertama sudah masuk (test user beli via JB)
- **Tab Klik JB**: 109 klik tercatat, 2 konversi (sync manual dari AT)
- **Conversion rate**: 1.8% (2 konversi / 109 klik)
- **Komisi**: Rp303 (data dari AT, input manual ke JB)
- **Google Search Console**: Aktif, artikel di-index
- **Pinterest**: Website claimed & verified

### Database Production
- **874 produk** (campur anak + beberapa dewasa yang perlu dibersihkan)
- **10 kategori anak** aktif
- **10 blog articles** (AI-generated via Groq + manual)
- **8 marketplace**: Shopee, Tokopedia, Lazada, Blibli, Bukalapak, Zalora, TikTok Shop, Other (Brand Sendiri)
- **Scraper v3.3.7**: dengan input manual rating/sold/review/location

### Affiliate Status
| Marketplace | Produk | Affiliate via | Status |
|-------------|--------|---------------|--------|
| Shopee | ~200 | AT (atid.me) + tag langsung | Aktif |
| Tokopedia | ~200 | AT (atid.me) | Aktif |
| Blibli | ~35 | AT (atid.me) | Aktif |
| TikTok Shop | ~95 | AT (atid.me) | Aktif |
| Zalora | ~40 | Tidak ada | Biarkan (diversifikasi) |
| Other | ~5 | Tidak perlu (brand sendiri) | Baru ditambahkan |

**Cookie AT**: 20+ hari (Campaign Shopee #966)
**Komisi**: 5% direct / 1.2% indirect

---

## 🔐 KREDENSIAL

### Admin Panel
- **URL Login**: /jb-mgr-login
- **Admin Secret**: lihat di Vercel env vars (ADMIN_SECRET)
- **Auth**: Cookie-based (HMAC-signed jb-admin-session, 7 hari)

### Cloudinary
- CLOUD_NAME: bfvtb4xp
- API Key & Secret: lihat di Vercel env vars (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
- Folder: jb-products

### Database (Neon)
- Project ID: green-base-47386531
- Branch: br-hidden-waterfall-ao2a48ko
- DATABASE_URL production: di Vercel Project Settings -> Environment Variables
- Local .env: comment-only (Vercel dashboard env override)

### Groq API (AI Blog)
- Model: openai/gpt-oss-120b
- API key di Vercel env: GROQ_API_KEY
- Cron: tiap Senin 13:00 WIB auto-generate blog

### AccessTrade (AT)
- API base: https://gurkha.accesstrade.global
- USER_UID & SECRET_KEY: di DB table Setting (bukan env vars)
- SITE_ID: 127377
- Campaign Shopee: #966 (cookie 20+ hari, komisi 5% direct / 1.2% indirect)

### GitHub
- Token tersimpan di ~/.git-credentials (chmod 600, di luar repo)
- Format: https://handokov:<GITHUB_TOKEN>@github.com
- Token: lihat di GitHub Settings -> Developer settings -> Personal access tokens
- Backup tag: pre-cleanup-backup-20260725 (sebelum UUID cleanup)

### Adsterra (NEW)
- Dashboard: https://adsterra.com
- Ad format: script-based (atOptions + invoke.js)
- Masuk via tab Iklan Affiliate -> tipe "Script"

---

## 📁 STRUKTUR KUNCI

```
src/
├── app/
│   ├── page.tsx                    # Homepage (Daily Mix + product grid + flash sale)
│   ├── api/
│   │   ├── shopee-products/        # CRUD produk (auto-calc discountPercent)
│   │   ├── admin/
│   │   │   ├── products/           # Admin CRUD produk (cookie auth)
│   │   │   ├── blog/               # Blog Manager API (CRUD + coverImage)
│   │   │   ├── blog-cover-products/# Product picker untuk cover image blog
│   │   │   ├── click-report/       # Report klik (conversionCount per produk)
│   │   │   ├── update-conversion/  # Input manual konversi dari AT dashboard
│   │   │   ├── backfill-discount/  # Backfill discountPercent dari originalPrice
│   │   │   └── bulk-products/      # Bulk operations
│   │   ├── blog-generate/          # AI generate blog via Groq
│   │   ├── blog-trending/          # AI suggest trending topics
│   │   ├── at-custom-link/         # Generate AT short link (atid.me)
│   │   ├── at-sync/                # Sync produk dari AT API
│   │   ├── affiliate-ads/          # CRUD affiliate ads (image + script)
│   │   ├── beli/[id]/              # Redirect klik -> log -> atid.me (CLICK TRACKING)
│   │   ├── cron/
│   │   │   ├── at-sync/            # Daily sync dari AT
│   │   │   ├── blog-generate/      # Weekly Monday blog auto
│   │   │   └── refresh-product-stats/ # Weekly refresh rating/sold
│   │   └── click-stats/            # Click fraud protection stats
│   ├── jb-mgr-admin/               # Admin panel (10 tabs, scrollable)
│   ├── jb-mgr-login/               # Login admin
│   ├── artikel/                    # Blog list + detail (cover image + nbsp spacing)
│   ├── produk/[id]/                # Detail produk (badge "Brand Sendiri" untuk other)
│   └── kategori/[slug]/            # Kategori page
├── components/
│   ├── home/                       # LogoBar, ProductsGrid, BannerSlider, FlashSaleSection
│   ├── product-card.tsx            # 3 variants, rating/sold hide if empty, badge marketplace
│   ├── affiliate-banner.tsx        # Render image + script ads (Adsterra)
│   ├── admin/
│   │   ├── products-tab.tsx        # Produk CRUD + filter Visible/Hidden
│   │   ├── categories-tab.tsx
│   │   ├── at-sync-tab.tsx
│   │   ├── banners-tab.tsx
│   │   ├── affiliate-tab.tsx
│   │   ├── affiliate-ads-tab.tsx   # Iklan Affiliate (image + script Adsterra)
│   │   ├── blog-tab.tsx            # Blog Manager + cover image picker
│   │   ├── click-report-tab.tsx    # Report klik (6 sections + input konversi manual)
│   │   ├── bulk-upload-tab.tsx
│   │   └── security-tab.tsx
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── db.ts                       # Prisma client
│   ├── admin-auth.ts               # HMAC-SHA256 session (Web Crypto API)
│   ├── affiliate.ts                # Build affiliate URL per marketplace
│   ├── viral-score.ts              # Compute viralScore
│   ├── format.ts                   # formatRupiah, formatSoldCount, dll
│   ├── accesstrade.ts              # AT API client
│   ├── click-guard.ts              # Click fraud protection (in-memory)
│   ├── blog-data.ts                # BlogArticle interface
│   ├── admin-config.ts             # MARKETPLACE_OPTIONS (8 marketplace, no sociolla/aliexpress/amazon)
│   └── types.ts                    # Product, Category, Marketplace (include 'other')
└── prisma/
    └── schema.prisma               # 9 models + conversionCount + adType + scriptCode
```

---

## 🗄️ DATABASE SCHEMA (Models)

| Model | Kegunaan |
|-------|----------|
| Category | Kategori produk + keyword per marketplace |
| ShopeeProduct | Data produk (874 rows) — include conversionCount + conversionValue |
| BlogArticle | Artikel blog (coverImage, slug, content HTML, nbsp spacing) |
| ProductClick | Log klik produk (productId, IP, referer, blocked, dll) |
| AffiliateTag | Tag affiliate per marketplace (Shopee, Tokopedia enabled) |
| PromoBanner | Banner slider homepage |
| AffiliateAd | Banner affiliate (image + script Adsterra) — adType + scriptCode |
| ProductBadge | Badge kecil di product card (Flash Sale, dll) |
| Setting | Key-value config (AT credentials) |

### Field Penting ShopeeProduct
- rating Float (default 4.5) — real data dari scraper v3.3.7
- soldCount Int (default 0)
- reviewCount Int (default 0)
- location String? (jangan default "Jakarta Barat")
- discountPercent Int? — auto-calc dari originalPrice kalau null
- conversionCount Int (default 0) — input manual dari AT dashboard
- conversionValue Int (default 0) — estimasi komisi Rupiah dari AT
- lastScrapedAt DateTime? — untuk cron refresh priority
- isHidden Boolean — hide dari homepage tanpa hapus
- isPinned Boolean — pin di atas

### Field Penting AffiliateAd
- adType String (default "image") — "image" atau "script"
- scriptCode String? — HTML script untuk Adsterra (atOptions + invoke.js)
- href String — link affiliate (kosong kalau script)
- imgSrc String — URL gambar (kosong kalau script)

---

## 🎯 FITUR YANG SUDAH BERJALAN (LIVE)

### 1. Blog Manager (Admin Tab "Blog")
- CRUD artikel (list, create, edit, delete)
- Cover image dari URL atau pilih dari produk JB (1 klik)
- AI Generate (random topic atau custom prompt)
- AI Trending suggestions (5 topik viral/bulan)
- Cover image tampil di: list artikel, detail, OpenGraph, JSON-LD
- Blog spacing: line-height 1.85, paragraf mb-8 (32px), nbsp antar paragraf

### 2. Click Report (Admin Tab "Klik")
- Total klik, unique IP, blocked, block rate
- Top 20 produk by clicks
- Klik per hari (bar chart)
- Klik per marketplace (5 cards)
- Klik per Sumber Trafik (Pinterest/TikTok/Threads/Google/Direct/Internal/Other)
- Recent 20 clicks dengan masked IP, referer, status
- **Input manual konversi per produk** (sync dari AT dashboard)
- StatCard Konversi: count + rate% + komisi Rupiah

### 3. Click Tracking (/beli/[id] route)
- Setiap klik Beli -> log ke ProductClick table
- Log: productId, title, marketplace, IP, userAgent, referer, blocked, blockReason
- Redirect ke atid.me (AT tracking) -> Shopee/Tokopedia
- WAJIB await db.productClick.create() — Vercel kill function jika fire-and-forget

### 4. Scraper Chrome Extension (v3.3.7)
- Download: https://jelajahbelanja.com/jb-scraper-all-v337.zip
- Based on v3.2.3 (user's working version)
- 8 marketplace: Shopee, Tokopedia, TikTok, Blibli, Lazada, Bukalapak, Zalora, Other
- Fitur:
  - Auto-extract (sering gagal karena anti-bot Shopee)
  - Input manual: rating, terjual, review, lokasi seller (per produk)
  - Auto-generate AT link (atid.me)
  - Mirror image Tokopedia ke Cloudinary (anti-expired)
  - Paste URL mode (batch scrape)
  - CSV export
  - Upload langsung ke JB

### 5. Cron Jobs (Vercel)
- Daily (0 19 * * *): AT sync produk baru
- Weekly Monday (0 6 * * 1): Blog AI auto-generate (Groq GPT-OSS 120B)
- Weekly Saturday 19:00 UTC (0 19 * * 6): Refresh rating/sold/review produk
  - Auth: ADMIN_SECRET (Bearer atau ?secret=)
  - Limit 20 produk/run, 500ms rate limit
  - Success rate ~30-50% (anti-bot Shopee/Tokped)

### 6. Pinterest Integration
- Website claimed & verified (meta tag p:domain_verify)
- Rich Pins aktif (title, harga, image auto-sync)
- Analytics tersedia di Pinterest Business

### 7. SEO
- robots.txt: Allow all
- Sitemap dynamic dari DB
- Canonical URL pakai slug (bukan ID)
- JSON-LD Article + Product schema
- OpenGraph + cover image untuk share

### 8. Flash Sale Section (Homepage)
- Auto-calc discountPercent dari originalPrice
- Filter: discountPercent >= 30%
- 255 produk eligible flash sale
- Countdown timer (reset tiap hari)

### 9. Affiliate Ads (Admin Tab "Iklan Affiliate")
- Image banner (AccessTrade, Shopee, dll) — seperti sebelumnya
- **Script-based ads (Adsterra)** — BARU
  - Radio button: Image / Script
  - Textarea untuk paste scriptCode (atOptions + invoke.js)
  - Render via dangerouslySetInnerHTML + useEffect re-inject scripts
  - Platform: "adsterra" tersedia

### 10. Conversion Tracking Manual
- API /api/admin/update-conversion (POST)
- Body: { productId, conversionCount, conversionValue }
- User cek AT dashboard -> input manual di tab Klik -> Save
- StatCard Konversi: count + rate% + komisi Rupiah
- Top Products: input inline per produk (click edit -> input -> save)

### 11. Marketplace "Other (Brand Sendiri)"
- Type Marketplace: tambah 'other'
- MARKETPLACE_OPTIONS: 8 marketplace (hapus sociolla, aliexpress, amazon)
- Badge: "Brand Sendiri" (violet) di product-card, detail, dialog, style board
- normalizeMarketplace: recognize 'other' (tidak fallback ke shopee)
- Buy label: "Beli di Website Brand"
- Untuk brand yang jual produk sendiri (tidak perlu affiliate)

---

## 🚀 GITHUB PUSH SETUP (WAJIB BACA)

### Cara Push (LANGKAH WAJIB)
```bash
# 1. SEBELUM push: SELALU sync ke production dulu
git fetch origin
git reset --hard origin/main

# 2. Apply fix/perubahan

# 3. Commit dengan pesan proper (bukan UUID!)
git add <file1> <file2>
git commit -m "fix/feat: deskripsi singkat perubahan"

# 4. Push ke GitHub -> Vercel auto-deploy
git push origin main
```

### JANGAN DILAKUKAN
- git push --force (kecuali emergency, backup dulu)
- Push tanpa git reset --hard origin/main dulu
- Commit dengan UUID message (GitHub block!)
- Hapus ~/.git-credentials
- Tulis token/secrets di file yang di-commit (GitHub Secret Scanning block!)

### Credential Setup (kalau hilang)
```bash
# Token: lihat di GitHub Settings -> Developer settings -> Personal access tokens
echo "https://handokov:<GITHUB_TOKEN>@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
git config --global credential.helper store
```

### Backup Tag (kalau perlu rollback)
- pre-cleanup-backup-20260725 — state sebelum UUID cleanup

---

## 🔧 BUILD & DEPLOY

### Build Script (package.json)
```json
"build": "prisma generate && prisma db push --accept-data-loss && next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/"
```

PENTING: Pakai prisma db push (bukan migrate deploy) karena:
- DB sudah ada schema dari db push sebelumnya
- migrate deploy gagal P3005 "database schema is not empty"
- db push idempotent, tidak hapus data existing

### Local Dev
- .env: comment-only (production-safe)
- .env.local: SQLite untuk dev (gitignored)
  ```
  DATABASE_URL=file:/home/z/my-project/db/custom.db
  ADMIN_SECRET=<lihat di Vercel env vars>
  ```
- Schema provider: postgresql (production). Switch ke sqlite untuk local test,
  restore ke postgresql sebelum commit.

---

## 📋 TODO / NEXT STEPS

### High Priority (Conversion Optimization)
1. Bersihkan produk dewasa — hide/hapus Sonata Dress Busui, MOSSDOOM Tas Wanita, dll
2. Scrape ulang produk fresh dengan scraper v3.3.7 (rating >=4.8, sold >=500)
3. Tambah urgency di ProductCard (Flash Sale badge, Stok tinggal X)

### Medium Priority
4. Halaman landing /pinterest — khusus traffic dari Pinterest
5. Generate pin template per kategori
6. Blog embed link produk — inline link di artikel

### Low Priority
7. Auto-pin via Pinterest API
8. A/B test tombol Beli vs Lihat Produk
9. Sync conversion otomatis dari AT API (sekarang manual)

---

## ⚠️ HAL YANG PERLU DIKETAHUI AGENT BARU

### 1. Jangan Over-Engineer Scraper
- v3.3.2 coba fix rating auto-extract -> crash (reference reviewCount undefined)
- v3.3.3 revert ke v3.3.1 (working)
- v3.3.4 + v3.3.5 + v3.3.6 + v3.3.7 tambah input manual (simple, tidak break)
- Lesson: Scraper pakai chrome.scripting.executeScript({func}), helper tidak
  available cross-context. Inline logic saja.

### 2. Vercel Serverless = No Fire-and-Forget
- db.query().then().catch() TIDAK JALAN — Vercel kill function setelah response
- WAJIB await semua DB operation sebelum return response

### 3. Product ID Format
- DB pakai CUID (cmr...), BUKAN shopee- prefix
- Jangan pakai condition product.id.startsWith("shopee-") untuk routing
- Semua link Beli harus lewat /beli/[id] (cuid) supaya klik tercatat

### 4. normalizeMarketplace
- Function di /api/products/route.ts TIDAK recognize 'other' (fixed)
- Kalau tambah marketplace baru, update VALID array di normalizeMarketplace
- Juga update MARKETPLACE_META di 4 file (product-card, ProductDetailClient, dialog, outfit-style-board)

### 5. Scraper Auto-Extract Rating = Sering Gagal
- Shopee/Tokopedia anti-bot block, render JS dinamis
- Auto-extract success rate ~30-50%
- Solusi: input manual di scraper v3.3.7 (rating/sold/review/location)

### 6. Local Sandbox State
- Kadang tertinggal di belakang origin/main (sandbox reset)
- SELALU git fetch origin && git reset --hard origin/main sebelum kerja

### 7. GitHub Secret Scanning
- Repo JB PUBLIC — semua secrets akan di-detect GitHub
- JANGAN tulis token/password di file yang di-commit
- Kalau perlu credentials, pakai comment "lihat di Vercel env vars"
- Token lama yang sudah commit di history = perlu rotate

### 8. User Character
- Solo founder, modal kecil, tidak teknis
- Butuh ZAI proaktif cek masalah (bukan cuma kerjakan yang diminta)
- Percaya AI sebagai "tim" JB
- Web JB tidak akan dijual — aset jangka panjang
- Aktif social media: Threads, TikTok, Pinterest
- Mau JB cepat pecah telor — konversi pertama sudah masuk (test user)

### 9. Conversion Status (Agustus 2026)
- Konversi pertama sudah masuk (test user beli via JB link)
- Conversion rate: 1.8% (2 konversi / 109 klik)
- Komisi: Rp303 (data dari AT, input manual ke JB)
- JB dan AT = 2 sistem terpisah, JB tidak auto-sync konversi dari AT
- User input manual konversi di tab Klik -> sync dengan AT dashboard

### 10. Affiliate Link TIDAK Expire
- atid.me link tersimpan di DB TIDAK ada batas waktu
- Yang expire: cookie per visitor (60 hari per klik)
- Produk lama (Januari) masih bisa dapet komisi di Agustus
- Selama: akun AT aktif + campaign "BERJALAN" + produk belum dihapus seller

---

## 🧩 CHROME EXTENSION (Latest: v3.3.7)

- Download: https://jelajahbelanja.com/jb-scraper-all-v337.zip
- Source: download/scraper-fix-v33/ (unpacked)
- Version history:
  - v3.2.3: original (working, no rating extract)
  - v3.3.0-v3.3.2: bug attempts (cross-context, reference error)
  - v3.3.3: revert ke v3.3.1 (working)
  - v3.3.4: + input manual rating/sold/review
  - v3.3.5: + input manual lokasi seller
  - v3.3.6: + originalPrice (harga coret) support
  - v3.3.7: hapus sociolla dari dropdown (CURRENT)

### Input Manual di v3.3.7
1. Rating (0-5, number, step 0.1)
2. Terjual (number)
3. Review (number)
4. Lokasi Seller (text)
5. OriginalPrice (harga coret, auto-calc discountPercent)

### Fitur Lain (preserved dari v3.2.3)
- Auto-generate AT link (atid.me)
- Mirror image Tokopedia ke Cloudinary
- Paste URL mode (batch)
- CSV export
- Upload ke JB via /api/shopee-products
- Save draft collection

---

## 📊 ANALYTICS & TRACKING

### Yang Bisa User Lihat
1. Tab Klik di Admin — klik per produk, per marketplace, per referer source, konversi manual
2. AT Dashboard (accesstrade.id/dashboard) — klik + konversi + komisi (real)
3. Vercel Analytics — page view, visitor, traffic source
4. Google Search Console — index status, keyword ranking
5. Pinterest Analytics — pin performance
6. Adsterra Dashboard — iklan impression + earning (jika dipasang)

### Yang Tidak Bisa (Belum)
- Conversion rate per produk otomatis (AT tidak push back ke JB)
- Real-time komisi (AT delay 1-24 jam)
- A/B test CTR

---

## 🆘 TROUBLESHOOTING

### Build Gagal di Vercel
- P3005 = pakai migrate deploy, ganti ke db push
- module not found = local sandbox tertinggal, git reset --hard origin/main
- Secret scanning block = hapus secrets dari file yang di-commit
- Cek Vercel status: https://www.vercel-status.com

### Scraper "Gagal Scrape"
- Pastikan di halaman produk tunggal (bukan search page)
- Kalau auto-extract crash, revert ke v3.3.1 (working base)
- Input manual tetap bisa walau auto-extract gagal

### Klik Tidak Tercatat
- Cek /beli/[id] route: pastikan await db.productClick.create()
- Cek ProductCard: buyUrl = /beli/${product.id} (bukan affiliateUrl langsung)
- Cek click-guard: IP kena rate limit? Lihat tab Klik -> blocked clicks

### Badge Marketplace Salah
- Cek normalizeMarketplace di /api/products/route.ts (VALID array)
- Cek MARKETPLACE_META di 4 file (product-card, ProductDetailClient, dialog, outfit-style-board)
- Marketplace 'other' harus ada di kedua tempat

### Konversi Tidak Masuk di JB
- JB dan AT = sistem terpisah, JB tidak auto-sync
- User cek AT dashboard -> input manual di tab Klik -> Save
- StatCard Konversi auto-update

### Blog Tidak Tampil
- Cek coverImage column ada di Neon
- Cek build script pakai db push
- Cek artikel isPublished = true

### Iklan Adsterra Tidak Muncul
- Cek adType = "script" di DB
- Cek scriptCode tidak kosong
- Cek isActive = true
- useEffect re-inject scripts (React tidak execute script di dangerouslySetInnerHTML)

---

## 📞 KONTAK & ESKALASI

- User: handokov (solo founder)
- GitHub: github.com/handokov/jelajahbelanja (PUBLIC)
- Vercel: project "jelajahbelanja"
- Neon: project "green-base-47386531"
- AT: accesstrade.id (site_id 127377)
- Adsterra: adsterra.com

### Kalau Token Habis / Session Baru
1. Baca worklog.md untuk lihat task terakhir
2. git log origin/main --oneline -10
3. curl -sI https://www.jelajahbelanja.com/
4. Tanya user mau lanjutin apa

---

## 🎯 TARGET 3 BULAN KE DEPAN

1. Bulan 1: Bersihkan produk + scrape ulang + urgency badges
2. Bulan 2: Konsisten Threads/TikTok/Pinterest + blog AI weekly + Adsterra ads
3. Bulan 3: Scale traffic + konversi stabil (5-20/bulan)

Target traffic: 300-500 visitor/hari
Target conversion: 5-20 konversi/bulan di bulan 6

---

**Last updated**: 2026-08-18
**Agent**: ZAI (Code)
**Production status**: Live & stable
**Total commits**: ~300+ di main branch
**Scraper version**: v3.3.7
