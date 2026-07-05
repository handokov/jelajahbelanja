/**
 * AT (Accesstrade) Category → JB Category Mapping Utility
 * 
 * Membangun lookup map dari AT category1 values → JB category name.
 * Dipakai oleh converter AT→JB (client-side & server-side).
 * 
 * Setiap JB category punya field `accesstradeCat` yang berisi
 * comma-separated AT category1 names, misalnya:
 *   "Mobile & Gadgets,Computers & Accessories,Electronic Accessories"
 * 
 * Fungsi `buildAtCategoryMap()` membangun:
 *   { "mobile & gadgets" → "Elektronik", "computers & accessories" → "Elektronik", ... }
 * 
 * Fungsi `mapAtCategory()` melakukan lookup dengan fallback.
 */

import { DEFAULT_CATEGORIES } from "./seed";

// Fallback hardcoded map — dipakai jika DB belum di-seed
// AT category1 (lowercase) → JB category name
const FALLBACK_AT_MAP: Record<string, string> = {};

// Build fallback map dari DEFAULT_CATEGORIES
for (const cat of DEFAULT_CATEGORIES) {
  if (cat.accesstradeCat) {
    const atCats = cat.accesstradeCat.split(",").map(s => s.trim().toLowerCase());
    for (const atCat of atCats) {
      if (atCat) FALLBACK_AT_MAP[atCat] = cat.name;
    }
  }
}

/**
 * Build AT category lookup map dari data kategori (dari DB/API).
 * 
 * @param categories - Array of category objects dengan field `accesstradeCat` dan `name`
 * @returns Map: AT category1 (lowercase) → JB category name
 */
export function buildAtCategoryMap(categories: { name: string; accesstradeCat: string | null }[]): Record<string, string> {
  const map: Record<string, string> = {};
  
  for (const cat of categories) {
    if (cat.accesstradeCat) {
      const atCats = cat.accesstradeCat.split(",").map(s => s.trim().toLowerCase());
      for (const atCat of atCats) {
        if (atCat) map[atCat] = cat.name;
      }
    }
  }
  
  return map;
}

/**
 * Map AT category1 value ke JB category name.
 * 
 * Priority:
 * 1. Lookup di provided map (dari DB)
 * 2. Fallback ke hardcoded DEFAULT_CATEGORIES map
 * 3. Jika tidak match → "Lainnya"
 * 
 * @param atCategory1 - AT category1 value dari CSV (col 13)
 * @param customMap - Optional map dari DB (lebih up-to-date daripada fallback)
 * @returns JB category name
 */
export function mapAtCategory(atCategory1: string, customMap?: Record<string, string>): string {
  if (!atCategory1) return "Lainnya";
  
  const key = atCategory1.trim().toLowerCase();
  
  // 1. Coba custom map (dari DB)
  if (customMap && customMap[key]) {
    return customMap[key];
  }
  
  // 2. Fallback ke hardcoded map
  if (FALLBACK_AT_MAP[key]) {
    return FALLBACK_AT_MAP[key];
  }
  
  // 3. Tidak match → Lainnya
  return "Lainnya";
}

/**
 * Get the fallback AT map (for server-side usage without DB access)
 */
export function getFallbackAtMap(): Record<string, string> {
  return { ...FALLBACK_AT_MAP };
}
