# JB Multi-AI Telegram Bot — Panduan Windows

## Apa Ini?
Sistem Multi-AI buat JB:
- **AI-1 DISCOVER** (jb-discover.js) — Cari & tambah produk baru dari Shopee
- **AI-1 SCRAPE** (jb-scrape.js) — Update data produk yang udah ada
- **AI-2 WATCH** (jb-watch.js) — Deteksi produk viral & kirim alert ke Telegram
- **AI-2 BOT** (jb-bot.js) — Dengarkan tombol Approve/Batal & perintah Telegram
- **LAPORAN** (jb-report.js) — Kirim laporan harian ke Telegram

GAK nyentuh web JB sama sekali!

---

## Step 1: Install Node.js
1. Buka https://nodejs.org
2. Klik "LTS"
3. Download, install, next-next-next
4. Cek: buka PowerShell → ketik `node --version` → harus keluar angka

## Step 2: Extract
1. Download jb-telegram-bot.zip
2. Extract ke C:\jb-telegram-bot\

## Step 3: Install
1. PowerShell → cd C:\jb-telegram-bot
2. npm install

## Step 4: Jalankan!
Double-click file .bat

---

## Semua File .bat

| File | Fungsi | Lama? |
|---|---|---|
| start-bot.bat | 🤖 Bot denger tombol & perintah | Jalan terus |
| start-discover.bat | 🔍 Cari produk baru dari Shopee | 5-30 menit |
| start-discover-quick.bat | 👀 Cek aja, gak simpan (dry run) | 2-5 menit |
| start-discover-category.bat | 📂 Cari per 1 kategori | 2-10 menit |
| start-scrape.bat | 🔄 Update data produk yang ada | 5-15 menit |
| start-scrape-quick.bat | ⚡ Update top 10 produk | 1-5 menit |
| start-watch.bat | 🔥 Cek viral + kirim alert | 1 menit |
| start-report.bat | 📊 Kirim laporan harian | 30 detik |
| stop-bot.bat | 🛑 Stop bot background | Instan |

---

## Alur Harian di Kantor

```
Pagi (saat tiba di kantor):
  1. Double-click start-bot.bat           ← biarkan nyala sepanjang hari
  
  2. Double-click start-discover.bat      ← cari produk baru (jalan tiap 2-3 hari)
     ATAU
  2. Double-click start-discover-category.bat ← cari per kategori tertentu

  3. Double-click start-scrape.bat         ← update data produk yang ada (jalan tiap hari)
  
  4. Tunggu alert viral di Telegram
  5. Klik ✅ Approve / ❌ Batal

Siang:
  6. Double-click start-scrape-quick.bat   ← update top 10
  7. Double-click start-watch.bat          ← cek viral

Pulang:
  8. Tutup window bot                      ← gak masalah!
```

---

## Perbedaan SCRAPE vs DISCOVER

```
SCRAPE (jb-scrape.js):
  - Update produk yang UDAH ADA di DB
  - Update soldCount, harga, rating
  - Deteksi perubahan → calon viral

DISCOVER (jb-discover.js):
  - Cari produk BARU dari Shopee
  - Berdasarkan keyword di tiap kategori
  - Filter kualitas (rating ≥ 4.5, terjual ≥ 100)
  - Tambah ke DB kalau belum ada
  - Kirim viral alert kalau langsung viral (≥1000 terjual)
```

---

## Mode DISCOVER

| Perintah | Fungsi |
|---|---|
| `node jb-discover.js` | Semua kategori, top 10 per keyword |
| `node jb-discover.js --top 5` | Top 5 per keyword (lebih cepat) |
| `node jb-discover.js --cat Beauty` | Cuma kategori Beauty |
| `node jb-discover.js --dry-run` | Cek aja, gak simpan ke DB |
| `node jb-discover.js --cat Gaming --top 3 --dry-run` | Gabungan |

---

## Troubleshooting

### Shopee blokir scrape:
  1. Tunggu 1-2 jam
  2. Pakai --dry-run dulu buat test
  3. Kurangi --top (misal --top 3)
  4. Jangan scrape terlalu sering

### Bot gak respon tombol:
  1. Cek CMD masih nyala?
  2. Restart: tutup CMD, double-click start-bot.bat

### npm install error Puppeteer:
  npm install --ignore-scripts puppeteer
  Scraper akan pakai mode API Fetch (masih works)
