# 🔄 HANDOFF — JelajahBelanja Project

## 📌 PROJECT INFO
- **Website**: https://jelajahbelanja.com
- **Repo**: https://github.com/handokov/jelajahbelanja.git
- **Framework**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL (Vercel Postgres) via Prisma ORM
- **Deploy**: Vercel (auto-deploy dari `main` branch)
- **Local Path**: `/home/z/my-project/`

---

## 🗄️ DATABASE SCHEMA (Prisma)
File: `prisma/schema.prisma`

| Model | Kegunaan |
|-------|----------|
| `Category` | Kategori produk (dengan keyword per marketplace) |
| `AffiliateTag` | Tag/ID affiliate per marketplace |
| `ShopeeProduct` | Data produk dari semua marketplace |
| `PromoBanner` | Banner slider 1200x400 di homepage |
| `AffiliateAd` | Banner affiliate (AccessTrade, dll) — **BARU** |

---

## 📁 STRUKTUR KUNCI

```
src/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── layout.tsx                  # Root layout
│   ├── api/
│   │   ├── banners/route.ts        # CRUD promo banner
│   │   ├── affiliate-ads/route.ts  # CRUD affiliate ads — BARU
│   │   ├── shopee-products/        # CRUD produk
│   │   └── categories/             # CRUD kategori
│   ├── jb-mgr-admin/page.tsx       # Admin panel (7 tab)
│   ├── jb-mgr-login/               # Login admin
│   └── produk/[id]/                # Detail produk
├── components/
│   ├── home/
│   │   ├── logo-bar.tsx            # Header dengan logo + theme toggle
│   │   ├── products-grid.tsx       # Grid produk + sidebar trending
│   │   ├── banner-slider.tsx       # Slider banner 1200x400
│   │   └── ...
│   ├── product-card.tsx            # Kartu produk (3 variant)
│   ├── affiliate-banner.tsx        # Banner affiliate dari DB — BARU
│   └── admin/
│       ├── banners-tab.tsx         # Tab kelola banner
│       ├── affiliate-ads-tab.tsx   # Tab kelola iklan affiliate — BARU
│       ├── products-tab.tsx        # Tab kelola produk
│       └── ...
└── lib/
    ├── db.ts                       # Prisma client
    ├── types.ts                    # TypeScript types
    ├── admin-auth.ts               # Auth admin (HMAC cookie)
    └── format.ts                   # Format Rupiah, sold count, dll
```

---

## 🔐 AUTH
- Admin login: `/jb-mgr-login` → cookie `jb-admin-session` (HMAC-signed)
- Middleware: `src/middleware.ts` — protect admin page + write API routes
- GET routes (public): `/api/products`, `/api/categories`, `/api/affiliate-ads?active=true`

---

## ☁️ CLOUDINARY (Image Server)
- **Cloud Name**: `bfvtb4xp`
- **Root API Key**: `455851493531962`
- **Root API Secret**: `3-sWr7_Z2mAFZR-mPLrheTVymPg`
- **New API Key**: `172992951661892` (jelajah-belanja-pic)
- **New API Secret**: `0s0ShhBJNxwVNqGlgiEmZCXo6NA`
- **Folder**: `jb-products`
- Image server: `/home/z/my-project/download/jb-image-server/` (run `start.bat` di Windows, `node server.js` lokal)
- Banner AccessTrade disimpan di Cloudinary

---

## 🧩 CHROME EXTENSION
- **Latest**: `jb-scraper-extension-v11.zip` di `/download/`
- **Fitur**: Scrape produk dari Shopee/Tokopedia, upload ke JB via API, auto-save draft
- Load sebagai unpacked extension di Chrome

---

## ⚠️ UNPUSHED CHANGES (7 commits ahead of origin)

**WAJIB PUSH DULU sebelum kerja apapun:**
```bash
cd /home/z/my-project && git push origin main
```

Isi unpushed:
1. AffiliateAd model + migration SQL
2. `/api/affiliate-ads` route
3. `affiliate-ads-tab.tsx` admin tab
4. `affiliate-banner.tsx` fix (referrerPolicy, hover effect)
5. Logo fix (pointer-events-none, z-10)
6. Middleware update (protect affiliate-ads API)
7. Cleanup old PNG/ZIP files

---

## 🏷️ GIT TAGS (Rollback Points)

| Tag | Keterangan |
|-----|-----------|
| `v-before-mobile-redesign` | Sebelum redesign mobile 2 kolom |
| `stable-batch-optimization` | Stabil batch optimization |
| `stable-before-batch-optimization` | Sebelum batch optimization |

Rollback: `git checkout v-before-mobile-redesign`

---

## 📋 TODO YANG BELUM DIBUAT (User Requested)

### 1. Mobile 2 Kolom (PRIORITY HIGH)
- Grid produk di HP: `grid-cols-1` → `grid-cols-2`
- File: `src/components/home/products-grid.tsx` line 69
- Perlu: ProductCard compact variant untuk mobile

### 2. Promo Badge di ProductCard (PRIORITY HIGH)
- Banner kecil di bawah foto produk (selebar foto)
- Contoh: "Flash Sale", "Gratis Ongkir", "Promo Puncak", "Cashback"
- Perlu:
  - Tabel `PromoBadge` di schema.prisma
  - Field `promoBadges` di ShopeeProduct (relasi)
  - Admin checkbox di edit produk
  - Overlay badge di ProductCard (variant default)
- Referensi: seperti badge di Shopee/Tokopedia

### 3. Banner Affiliate In-Content (PRIORITY MEDIUM)
- Sisip banner affiliate tiap 6 produk di grid
- Macam native ads Shopee
- File: `src/components/home/products-grid.tsx`
- Komponen sudah ada: `AffiliateBanner` dari DB

### 4. TikTok Shop Support (PRIORITY LOW)
- Extension belum recognize link TikTok Shop dari AT
- Belum diketahui format linknya

### 5. Link Format Baru (PRIORITY LOW)
- `shop-id.tokopedia.com` belum di-parser extension

### 6. Involve Asia (PRIORITY LOW)
- Platform affiliate baru, format link belum diketahui

---

## 🚀 QUICK START UNTUK AGENT BARU

```bash
# 1. Push pending dulu
cd /home/z/my-project && git push origin main

# 2. Cek deploy di Vercel
# Buka https://vercel.com/dashboard

# 3. Edit kode
# Semua file di /home/z/my-project/src/

# 4. Commit & push
git add -A && git commit -m "deskripsi" && git push origin main

# 5. Jika schema berubah, buat migration:
mkdir -p prisma/migrations/DESKRIPSI
# Tulis migration.sql
# Commit & push (Vercel auto-run prisma migrate deploy)
```

---

## ⚡ NOTES PENTING
- Build script sudah include `prisma migrate deploy` (auto-migrate saat deploy)
- Local DATABASE_URL pakai SQLite, production pakai PostgreSQL
- Jangan edit `.env` lokal — production env ada di Vercel dashboard
- Komponen `AffiliateBanner` fetch dari `/api/affiliate-ads?active=true&position=sidebar`
- User punya Cloudinary untuk upload gambar banner
