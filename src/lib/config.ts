/**
 * Config — konstanta global yang dipakai di banyak file.
 * Sebelumnya tersebar duplikat di layout.tsx, sitemap.ts, robots.ts, dll.
 */

import type { Marketplace } from "@/lib/types";

// ─── Site URL ───
// Sebelumnya: layout.tsx pakai .vercel.app, sitemap.ts & robots.ts pakai .com → BUG!
// Sekarang: satu sumber kebenaran.
export const SITE_URL = "https://jelajahbelanja.com";
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
  "aliexpress",
];
