/**
 * settings.ts — Helper untuk baca/tulis Setting dari DB (key-value store).
 *
 * Dipakai untuk config yang bisa di-edit via admin UI (cth: AT credentials),
 * supaya tidak perlu set via Vercel env vars yang bermasalah copy-paste.
 */

import { db } from "@/lib/db";

/** Cache settings in-memory (TTL 60 detik) supaya tidak query DB terus */
let cache: Map<string, string> | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL = 60 * 1000;

async function loadSettings(): Promise<Map<string, string>> {
  if (cache && Date.now() < cacheExpiresAt) {
    return cache;
  }
  try {
    const rows = await db.setting.findMany();
    cache = new Map(rows.map(r => [r.key, r.value]));
    cacheExpiresAt = Date.now() + CACHE_TTL;
    return cache;
  } catch {
    return new Map();
  }
}

/** Dapat value setting by key (fallback ke env var kalau tidak ada di DB) */
export async function getSetting(key: string, fallback?: string): Promise<string> {
  const settings = await loadSettings();
  return settings.get(key) || process.env[key] || fallback || "";
}

/** Dapat value setting by key (hanya dari DB, tidak fallback env) */
export async function getSettingFromDb(key: string): Promise<string | null> {
  const settings = await loadSettings();
  return settings.get(key) || null;
}

/** Set/update setting (upsert) */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  // Invalidate cache
  cache = null;
}

/** Hapus setting by key */
export async function deleteSetting(key: string): Promise<void> {
  try {
    await db.setting.delete({ where: { key } });
  } catch {
    // ignore kalau tidak ada
  }
  cache = null;
}

/** List semua settings (untuk admin UI) */
export async function listSettings(): Promise<Array<{ key: string; value: string; updatedAt: Date }>> {
  return db.setting.findMany({ orderBy: { key: "asc" } });
}

/**
 * Dapat semua AT credentials (DB priority, fallback ke env).
 * Return object dengan field: USER_UID, SECRET_KEY, API_BASE, COUNTRY_CODE, SITE_ID
 */
export async function getAtCredentials() {
  return {
    USER_UID: await getSetting("ACCESSTRADE_USER_UID"),
    SECRET_KEY: await getSetting("ACCESSTRADE_SECRET_KEY"),
    API_BASE: await getSetting("ACCESSTRADE_API_BASE", "https://gurkha.accesstrade.global"),
    COUNTRY_CODE: await getSetting("ACCESSTRADE_COUNTRY_CODE", "id"),
    SITE_ID: await getSetting("ACCESSTRADE_SITE_ID", "127377"),
  };
}
