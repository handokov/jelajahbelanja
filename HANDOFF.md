# 🔄 HANDOFF — JelajahBelanja Project

## 📌 INFO PROYEK
- **Website**: https://jelajahbelanja.com
- **Repo**: https://github.com/handokov/jelajahbelanja.git
- **Branch**: main
- **Framework**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL (Vercel Postgres) via Prisma ORM
- **Deploy**: Vercel auto-deploy dari `main` branch
- **Local Path**: `/home/z/my-project/`

---

## 🚀 GITHUB PUSH SETUP (WAJIB BACA DI SETIAP SESSION)

**Sandbox ini BISA push langsung ke GitHub production.** Setup sudah permanen:

### Credential Storage
- File: `~/.git-credentials` (chmod 600, di luar repo, TIDAK di-commit)
- Format: `https://handokov:<GHP_TOKEN>@github.com`
- Git remote: `origin → https://github.com/handokov/jelajahbelanja.git`
- Helper: `git config --global credential.helper store`

### Cara Push (LANGKAH WAJIB)
```bash
# 1. SEBELUM push: SELALU sync ke production dulu (jangan force push!)
git fetch origin
git reset --hard origin/main    # sync ke state production terbaru

# 2. Apply fix/perubahan di file yang relevan
#    (jangan copy seluruh sandbox state — bisa bentrok dengan 258+ commit production)

# 3. Commit dengan pesan proper (bukan UUID)
git add <file1> <file2>
git commit -m "fix/feat: deskripsi singkat perubahan"

# 4. Push ke GitHub → Vercel auto-deploy dalam 1-2 menit
git push origin main
```

### ⚠️ JANGAN DILAKUKAN
- ❌ `git push --force` → akan HAPUS 258+ commit production
- ❌ Push tanpa `git reset --hard origin/main` dulu → akan reject (divergen history)
- ❌ Commit dengan UUID message → susah track di Vercel dashboard
- ❌ Hapus `~/.git-credentials` → push akan gagal

### Verifikasi Push Berhasil
```bash
git fetch origin
git log origin/main -1 --format="%h %s"   # harus nunjukin commit kita
```
Lalu test production: `curl -sL https://www.jelajahbelanja.com/...`

### Token Info
- Type: GitHub Personal Access Token (classic)
- Scope: `repo` (full control of private repositories)
- Expiration: ~30 days (regenerate kalau expired)
- Active tokens di GitHub: `jb-sandbox-dev`, `jelajahbelanja-push` (lihat github.com/settings/tokens)

---

## 🔐 KREDENSIAL

### Cloudinary
- CLOUD_NAME: `bfvtb4xp`
- ROOT API Key: `455851493531962`
- ROOT API Secret: `3-sWr7_Z2mAFZR-mPLrheTVymPg`
- NEW API Key (jelajah-belanja-pic): `172992951661892`
- NEW API Secret: `0s0ShhBJNxwVNqGlgiEmZCXo6NA`
- Folder: `jb-products`

### Admin Panel
- URL: `/jb-mgr-login`
- Auth: Cookie-based (HMAC-signed `jb-admin-session`)
- ADMIN_SECRET: ada di Vercel env vars

### Database
- Production: PostgreSQL via Vercel ( Neon)
- Local: SQLite (`file:/home/z/my-project/db/custom.db`)
- **DATABASE_URL production**: ada di Vercel Project Settings → Environment Variables
- **PENTING**: Local .env pakai SQLite, TIDAK bisa run migrate lokal. Migrate via Vercel build (`prisma migrate deploy`)

### Vercel
- Project terhubung ke GitHub repo
- Auto-deploy saat push ke `main`
- Env vars di Vercel Dashboard → Settings → Environment Variables

---

## 🗄️ DATABASE SCHEMA

| Model | Kegunaan |
|-------|----------|
| `Category` | Kategori produk + keyword per marketplace |
| `AffiliateTag` | Tag/ID affiliate per marketplace |
| `ShopeeProduct` | Data produk semua marketplace |
| `PromoBanner` | Banner slider 1200x400 homepage |
| `AffiliateAd` | Banner affiliate (AccessTrade, dll) — BARU |

---

## 📁 STRUKTUR KUNCI

```
src/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── api/
│   │   ├── banners/route.ts        # CRUD promo banner
│   │   ├── affiliate-ads/route.ts  # CRUD affiliate ads (BARU)
│   │   ├── shopee-products/        # CRUD produk
│   │   └── categories/             # CRUD kategori
│   ├── jb-mgr-admin/page.tsx       # Admin panel (7 tab)
│   ├── jb-mgr-login/               # Login admin
│   └── produk/[id]/                # Detail produk
├── components/
│   ├── home/
│   │   ├── logo-bar.tsx            # Header (logo clickable FIX)
│   │   ├── products-grid.tsx       # Grid produk + sidebar + affiliate banner
│   │   └── banner-slider.tsx       # Slider 1200x400
│   ├── product-card.tsx            # Kartu produk (3 variant)
│   ├── affiliate-banner.tsx        # Banner affiliate dari DB (BARU)
│   └── admin/
│       ├── banners-tab.tsx
│       ├── affiliate-ads-tab.tsx   # (BARU)
│       └── products-tab.tsx
└── lib/
    ├── db.ts, types.ts, admin-auth.ts, format.ts
```

---

## 🏷️ GIT TAGS (Rollback)
- `v-before-mobile-redesign` — sebelum redesign mobile
- `stable-batch-optimization` — stabil
- Rollback: `git checkout <tag>`

---

## 📋 TODO YANG BELUM DIBUAT

### 1. Mobile 2 Kolom (HIGH)
- Grid HP: `grid-cols-1` → `grid-cols-2`
- File: `products-grid.tsx` line 69
- Perlu ProductCard compact variant mobile

### 2. Promo Badge di ProductCard (HIGH)
- Banner kecil di bawah foto (selebar foto)
- Contoh: "Flash Sale", "Gratis Ongkir", "Promo Puncak"
- Perlu: Tabel `PromoBadge`, field di ShopeeProduct, admin checkbox, overlay di ProductCard
- Referensi: badge Shopee/Tokopedia

### 3. Banner Affiliate In-Content (MEDIUM)
- Sisip banner tiap 6 produk di grid (native ads)
- Komponen sudah ada: `AffiliateBanner`

### 4. TikTok Shop Support (LOW)
- Extension belum recognize TikTok Shop

### 5. shop-id.tokopedia.com (LOW)
- Format link baru belum di-parser

### 6. Involve Asia (LOW)
- Platform affiliate baru, format belum diketahui

---

## 🚀 QUICK START

```bash
cd /home/z/my-project

# Edit kode di src/

# Commit & push (auto-deploy ke Vercel)
git add -A && git commit -m "deskripsi" && git push origin main

# Jika schema berubah:
# 1. Edit prisma/schema.prisma
# 2. Buat migration: mkdir prisma/migrations/DESKRIPSI
# 3. Tulis migration.sql
# 4. Push — Vercel auto-run prisma migrate deploy

# Cek status
git status
git log --oneline -5
```

---

## 🧩 CHROME EXTENSION
- **Latest**: `jb-scraper-extension-v11.zip` di `/download/`
- Fitur: Scrape Shopee/Tokopedia, upload ke JB, auto-save draft
- Load sebagai unpacked extension

---

## ⚡ CATATAN PENTING
- Build script sudah include `prisma migrate deploy`
- Local .env pakai SQLite, TIDAK bisa migrate lokal
- Jangan edit .env lokal — production env di Vercel dashboard
- `AffiliateBanner` fetch dari `/api/affiliate-ads?active=true&position=sidebar`
- User simpan banner di Cloudinary
- Logo sekarang clickable ke home (fix: pointer-events-none + z-10)
