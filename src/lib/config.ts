/**
 * Config — konstanta global yang dipakai di banyak file.
 * Sebelumnya tersebar duplikat di layout.tsx, sitemap.ts, robots.ts, dll.
 */

import type { Marketplace } from "@/lib/types";

// ─── Site URL ───
// Sebelumnya: layout.tsx pakai .vercel.app, sitemap.ts & robots.ts pakai .com → BUG!
// Sekarang: satu sumber kebenaran, otomatis dari env variable.
//
// Cara pakai:
// 1. Testing di Vercel: set NEXT_PUBLIC_SITE_URL=https://nama-anda.vercel.app di Vercel env
// 2. Production: set NEXT_PUBLIC_SITE_URL=https://jelajahbelanja.com
// 3. Kalau gak diset: fallback ke jelajahbelanja.com
//
// Vercel otomatis sediain VERCEL_URL (tanpa https), tapi kita prefer
// NEXT_PUBLIC_SITE_URL karena bisa diakses di client-side juga.
const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
export const SITE_URL = VERCEL_URL
  ? (VERCEL_URL.startsWith("http") ? VERCEL_URL : `https://${VERCEL_URL}`)
  : "https://jelajahbelanja.com";
export const SITE_NAME = "JelajahBelanja";
export const SITE_DESCRIPTION =
  "JelajahBelanja adalah platform agregator produk viral Indonesia dari Shopee, Tokopedia, dan Lazada. Temukan produk viral 24 jam, best seller mingguan, dan diskon terbesar hari ini.";

// ─── Valid Marketplaces ───
// Sebelumnya: hardcoded di 3 tempat (affiliate route, seed.ts, admin page).
// Sekarang: satu definisi, import di mana pun.
export const VALID_MARKETPLACES: Marketplace[] = [
  "shopee",
  "tokopedia",
  "lazada",
  "blibli",
  "bukalapak",
  "zalora",
  "sociolla",
  "aliexpress",
  "amazon",
  "tiktok",
];

// ─── Marketplace UI Meta ───
// Sebelumnya: duplikat di product-card.tsx, product-detail-dialog.tsx, outfit-style-board.tsx.
// Sekarang: satu definisi, import di mana pun.
export const MARKETPLACE_META: Record<Marketplace, { label: string; className: string }> = {
  shopee: {
    label: "Shopee",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
  tokopedia: {
    label: "Tokopedia",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  lazada: {
    label: "Lazada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  blibli: {
    label: "Blibli",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  },
  bukalapak: {
    label: "Bukalapak",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  },
  zalora: {
    label: "Zalora",
    className: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  },
  sociolla: {
    label: "Sociolla",
    className: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  },
  aliexpress: {
    label: "AliExpress",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
  amazon: {
    label: "Amazon",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  tiktok: {
    label: "TikTok Shop",
    className: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-900",
  },
  mock: {
    label: "Mock",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

// ─── Legal Disclaimer ───
// Sebelumnya: teks disclaimer duplikat di page.tsx & ProductDetailClient.tsx.
// Sekarang: satu sumber kebenaran, konsisten di semua halaman.
export const LEGAL_DISCLAIMER =
  "Shopee, Tokopedia, Lazada, AliExpress, dan nama marketplace lain yang disebutkan di situs ini adalah merek dagang milik masing-masing perusahaan. JelajahBelanja bukan berafiliasi dengan, didukung oleh, atau mewakili perusahaan tersebut. Informasi produk ditampilkan untuk keperluan perbandingan dan referensi belanja saja.";

// ─── Buy Button Gradient ───
// Sebelumnya: class string duplikat di product-detail-dialog.tsx & ProductDetailClient.tsx.
// Sekarang: satu definisi, kalau mau ganti brand color cukup edit di sini.
export const BUY_BUTTON_GRADIENT =
  "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-lg shadow-violet-500/25";

// ─── Affiliate Link rel ───
// Sebelumnya: "nofollow sponsored noopener noreferrer" duplikat di 5 tempat.
// Sekarang: satu konstanta, kalau policy berubah cukup edit di sini.
export const AFFILIATE_LINK_REL = "nofollow sponsored noopener noreferrer";

// ─── Currency ───
// Sebelumnya: USD_TO_IDR = 15800 duplikat di aliexpress.ts & amazon-rss.ts.
// Sekarang: satu definisi, kalau kurs berubah cukup edit di sini.
export const USD_TO_IDR = 15800;
