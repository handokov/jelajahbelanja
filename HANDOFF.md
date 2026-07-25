# 🔄 HANDOFF — JelajahBelanja Project (Updated 2026-07-25)

## 📌 INFO PROYEK
- **Website**: https://jelajahbelanja.com
- **Repo**: https://github.com/handokov/jelajahbelanja.git
- **Branch**: main
- **Framework**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Database**: Neon PostgreSQL via Prisma ORM
- **Deploy**: Vercel auto-deploy dari main branch
- **Local Path**: `/home/z/my-project/`

---

## 🚀 STATUS CURRENT (Juli 2026)

### Traffic & Conversion
- **Traffic**: Masih kecil (~11-50 klik/hari), fase building 3-6 bulan
- **AT Dashboard**: ~163 klik, 0 konversi (NORMAL untuk blog baru)
- **Tab Klik JB**: 34 klik tercatat (mulai jalan setelah fix /beli/[id] tracking)
- **Google Search Console**: Aktif, 4 artikel di-index
- **Pinterest**: Website claimed & verified (meta tag p:domain_verify)

### Database Production
- **760 produk** (campur anak + beberapa dewasa yang perlu dibersihkan)
- **10 kategori anak** aktif (Sekolah Anak, Tumbler Anak, Mainan Edukatif, dll)
- **10 blog articles** (4 AI-generated via Groq + 6 manual)
- **5 marketplace**: Shopee, Tokopedia, Blibli, TikTok, Zalora

### Affiliate Status
| Marketplace | Produk | Affiliate via | Status |
|-------------|--------|---------------|--------|
| Shopee | 25 | AT (atid.me) + tag langsung | Aktif |
| Tokopedia | 61 | AT (atid.me) | Aktif |
| Blibli | 35 | AT (atid.me) | Aktif |
| TikTok Shop | 95 | AT (atid.me) | Aktif |
| Zalora | 40 | Tidak ada | Biarkan (diversifikasi) |

**Cookie AT**: 20+ hari (lebih panjang dari Shopee Affiliate langsung = 7 hari)

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
- Dashboard: https://cloudinary.com/console

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
- Format: https://handokov:<lihat di credential file>@github.com
- Backup tag: pre-cleanup-backup-20260725 (sebelum UUID cleanup)

---

## 📁 STRUKTUR KUNCI

```
src/
├── app/
│   ├── page.tsx                    # Homepage (Daily Mix + product grid)
│   ├── api/
│   │   ├── shopee-products/        # CRUD produk (public + admin)
│   │   ├── admin/
│   │   │   ├── products/           # Admin CRUD produk (cookie auth)
│   │   │   ├── blog/               # Blog Manager API (list/create/update/delete)
│   │   │   ├── blog-cover-products/# Product picker untuk cover image blog
│   │   │   └── click-report/       # Report klik per produk/marketplace/referer
│   │   ├── blog-generate/          # AI generate blog via Groq
│   │   ├── blog-trending/          # AI suggest trending topics
│   │   ├── at-custom-link/         # Generate AT short link (atid.me)
│   │   ├── at-sync/                # Sync produk dari AT API
│   │   ├── beli/[id]/              # Redirect klik → log → atid.me (CLICK TRACKING)
│   │   ├── cron/
│   │   │   ├── at-sync/            # Daily sync dari AT
│   │   │   ├── blog-generate/      # Weekly Monday blog auto
│   │   │   └── refresh-product-stats/ # Weekly refresh rating/sold
│   │   └── click-stats/            # Click fraud protection stats
│   ├── jb-mgr-admin/               # Admin panel (10 tabs, scrollable)
│   ├── jb-mgr-login/               # Login admin
│   ├── artikel/                    # Blog list + detail (cover image support)
│   ├── produk/[id]/                # Detail produk
│   └── kategori/[slug]/            # Kategori page
├── components/
│   ├── home/                       # LogoBar, ProductsGrid, BannerSlider
│   ├── product-card.tsx            # 3 variants, rating/sold hide if empty
│   ├── admin/
│   │   ├── products-tab.tsx
│   │   ├── categories-tab.tsx
│   │   ├── at-sync-tab.tsx
│   │   ├── banners-tab.tsx
│   │   ├── affiliate-tab.tsx
│   │   ├── affiliate-ads-tab.tsx
│   │   ├── blog-tab.tsx            # Blog Manager + cover image picker
│   │   ├── click-report-tab.tsx    # Report klik (6 sections)
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
│   └── types.ts                    # Product, Category, Marketplace types
└── prisma/
    └── schema.prisma               # 9 models
```

---

## 🗄️ DATABASE SCHEMA (Models)

| Model | Kegunaan |
|-------|----------|
| Category | Kategori produk + keyword per marketplace |
| ShopeeProduct | Data produk semua marketplace (760 rows) |
| BlogArticle | Artikel blog (coverImage field, slug, content HTML) |
| ProductClick | Log klik produk (productId, IP, referer, blocked, dll) |
| AffiliateTag | Tag affiliate per marketplace (Shopee, Tokopedia enabled) |
| PromoBanner | Banner slider homepage |
| AffiliateAd | Banner affiliate (AT, Shopee, dll) |
| ProductBadge | Badge kecil di product card (Flash Sale, dll) |
| Setting | Key-value config (AT credentials) |

### Field Penting ShopeeProduct
- rating Float (default 4.5)
- soldCount Int (default 0)
- reviewCount Int (default 0)
- location String? (jangan default "Jakarta Barat")
- lastScrapedAt DateTime? — untuk cron refresh priority
- isHidden Boolean — hide dari homepage tanpa hapus
- isPinned Boolean — pin di atas
- coverImage String? — di BlogArticle, bukan ShopeeProduct

---

## 🎯 FITUR YANG SUDAH BERJALAN

### 1. Blog Manager (Admin Tab "Blog")
- CRUD artikel (list, create, edit, delete)
- Cover image dari URL atau pilih dari produk JB (1 klik)
- AI Generate (random topic atau custom prompt)
- AI Trending suggestions (5 topik viral/bulan)
- Cover image tampil di: list artikel, detail, OpenGraph, JSON-LD
- Blog spacing: line-height 1.85, paragraf mb-8 (32px)

### 2. Click Report (Admin Tab "Klik")
- Total klik, unique IP, blocked, block rate
- Top 20 produk by clicks
- Klik per hari (bar chart)
- Klik per marketplace (5 cards)
- Klik per Sumber Trafik (Pinterest/TikTok/Threads/Google/Direct/Internal/Other)
- Recent 20 clicks dengan masked IP, referer, status

### 3. Click Tracking (/beli/[id] route)
- Setiap klik Beli -> log ke ProductClick table
- Log: productId, title, marketplace, IP, userAgent, referer, blocked, blockReason
- Redirect ke atid.me (AT tracking) -> Shopee/Tokopedia
- WAJIB await db.productClick.create() — Vercel kill function jika fire-and-forget

### 4. Scraper Chrome Extension (v3.3.5)
- Download: https://jelajahbelanja.com/jb-scraper-all-v335.zip
- Based on v3.2.3 (user's working version)
- 8 marketplace: Shopee, Tokopedia, TikTok, Blibli, Lazada, Bukalapak, Zalora, Sociolla
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
- robots.txt: Allow all (fix Disallow: / yang block Google index)
- Sitemap dynamic dari DB
- Canonical URL pakai slug (bukan ID)
- JSON-LD Article + Product schema
- OpenGraph + cover image untuk share

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

### Credential Setup (kalau hilang)
```bash
# Token GitHub ada di ~/.git-credentials (chmod 600)
# Format: https://handokov:<GITHUB_TOKEN>@github.com
# Token: lihat di GitHub Settings -> Developer settings -> Personal access tokens
# Atau tanya user (tidak ditulis di sini untuk security)
# Setup credential: lihat instruksi di bawah
chmod 600 ~/.git-credentials
git config --global credential.helper store
```

### Backup Tag (kalau perlu rollback)
- `pre-cleanup-backup-20260725` — state sebelum UUID cleanup (178 UUID commits)
- Rollback: `git reset --hard pre-cleanup-backup-20260725 && git push --force origin main`

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
1. Bersihkan produk dewasa — hide/hapus Sonata Dress Busui, MOSSDOOM Tas Wanita
2. Scrape ulang produk fresh dengan scraper v3.3.5 (rating >=4.8, sold >=500)
3. Tambah urgency di ProductCard (Flash Sale badge, Stok tinggal X)

### Medium Priority
4. Halaman landing /pinterest — khusus traffic dari Pinterest
5. Generate pin template per kategori
6. Blog embed link produk — inline link di artikel

### Low Priority
7. Auto-pin via Pinterest API
8. A/B test tombol Beli vs Lihat Produk
9. Conversion tracking sync dengan AT API

---

## ⚠️ HAL YANG PERLU DIKETAHUI AGENT BARU

### 1. Jangan Over-Engineer Scraper
- v3.3.2 coba fix rating auto-extract -> crash (reference reviewCount undefined)
- v3.3.3 revert ke v3.3.1 (working)
- v3.3.4 + v3.3.5 tambah input manual (simple, tidak break)
- Lesson: Scraper pakai chrome.scripting.executeScript({func}), helper tidak
  available cross-context. Inline logic saja.

### 2. Vercel Serverless = No Fire-and-Forget
- db.query().then().catch() TIDAK JALAN — Vercel kill function setelah response
- WAJIB await semua DB operation sebelum return response

### 3. Product ID Format
- DB pakai CUID (cmr...), BUKAN shopee- prefix
- Jangan pakai condition product.id.startsWith("shopee-") untuk routing
- Semua link Beli harus lewat /beli/[id] (cuid) supaya klik tercatat

### 4. Scraper Auto-Extract Rating = Sering Gagal
- Shopee/Tokopedia anti-bot block, render JS dinamis
- Auto-extract success rate ~30-50%
- Solusi: input manual di scraper v3.3.5

### 5. Local Sandbox State
- Kadang tertinggal di belakang origin/main (sandbox reset)
- SELALU git fetch origin && git reset --hard origin/main sebelum kerja

### 6. User Character
- Solo founder, modal kecil, tidak teknis
- Butuh ZAI proaktif cek masalah (bukan cuma kerjakan yang diminta)
- Percaya AI sebagai "tim" JB
- Web JB tidak akan dijual — aset jangka panjang
- Aktif social media: Threads, TikTok, Pinterest
- Mau JB cepat pecah telor — tapi realistis butuh 3-6 bulan lagi

### 7. Conversion Status (Juli 2026)
- 0 konversi dalam 3 bulan — NORMAL untuk blog affiliate baru
- Jangan jual mimpi "ganti affiliate = konversi naik"
- Root cause: traffic belum cukup + produk tidak targeted + tidak ada urgency

### 8. Git History Cleanup (Juli 2026)
- 178 UUID commit messages di-cleanup via git filter-branch
- Backup tag: pre-cleanup-backup-20260725
- Sekarang GitHub push normal lagi (tidak kena rule violation)
- JANGAN commit dengan UUID message lagi!

---

## 🧩 CHROME EXTENSION (Latest: v3.3.5)

- Download: https://jelajahbelanja.com/jb-scraper-all-v335.zip
- Source: download/scraper-fix-v33/ (unpacked)
- Version history:
  - v3.2.3: original (working, no rating extract)
  - v3.3.0: tambah extractProductStats (bug: cross-context)
  - v3.3.1: inline stats extraction (working, user upload)
  - v3.3.2: fix _rating fallback (bug: reference reviewCount undefined)
  - v3.3.3: revert ke v3.3.1 (working)
  - v3.3.4: + input manual rating/sold/review
  - v3.3.5: + input manual lokasi seller (CURRENT)

### Input Manual di v3.3.5
1. Rating (0-5, number, step 0.1)
2. Terjual (number)
3. Review (number)
4. Lokasi Seller (text)

---

## 📊 ANALYTICS & TRACKING

### Yang Bisa User Lihat
1. Tab Klik di Admin — klik per produk, per marketplace, per referer source
2. AT Dashboard (accesstrade.id/dashboard) — klik + konversi + komisi
3. Vercel Analytics — page view, visitor, traffic source
4. Google Search Console — index status, keyword ranking
5. Pinterest Analytics — pin performance

---

## 🆘 TROUBLESHOOTING

### Build Gagal di Vercel
- P3005 = pakai migrate deploy, ganti ke db push
- module not found = local sandbox tertinggal, git reset --hard origin/main
- Cek Vercel status: https://www.vercel-status.com

### Scraper "Gagal Scrape"
- Pastikan di halaman produk tunggal (bukan search page)
- Kalau auto-extract crash, revert ke v3.3.1 (working base)

### Klik Tidak Tercatat
- Cek /beli/[id] route: pastikan await db.productClick.create()
- Cek ProductCard: buyUrl = /beli/${product.id} (bukan affiliateUrl langsung)

### Blog Tidak Tampil
- Cek coverImage column ada di Neon
- Cek build script pakai db push
- Cek artikel isPublished = true

---

## 📞 KONTAK & ESKALASI

- User: handokov (solo founder)
- GitHub: github.com/handokov/jelajahbelanja
- Vercel: project "jelajahbelanja"
- Neon: project "green-base-47386531"
- AT: accesstrade.id (site_id 127377)

### Kalau Token Habis / Session Baru
1. Baca worklog.md untuk lihat task terakhir
2. git log origin/main --oneline -10
3. curl -sI https://www.jelajahbelanja.com/
4. Tanya user mau lanjutin apa

---

## 🎯 TARGET 3 BULAN KE DEPAN

1. Bulan 1: Bersihkan produk + scrape ulang + urgency badges
2. Bulan 2: Konsisten Threads/TikTok/Pinterest + blog AI weekly
3. Bulan 3: Pecah telor (konversi pertama) + scale traffic

Target traffic: 300-500 visitor/hari
Target conversion: 1-5 konversi/bulan di bulan 6

---

**Last updated**: 2026-07-25
**Agent**: ZAI (Code)
**Production status**: Live & stable
