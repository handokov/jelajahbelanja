import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { VALID_MARKETPLACES } from "@/lib/config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip marketplace prefix dari product ID.
 * Contoh: "shopee-abc123" → "abc123", "tokopedia-xyz" → "xyz"
 * Kalau gak ada prefix yang dikenali, return apa adanya.
 */
export function stripMarketplacePrefix(id: string): string {
  for (const mp of VALID_MARKETPLACES) {
    const prefix = `${mp}-`;
    if (id.startsWith(prefix)) return id.slice(prefix.length);
  }
  return id;
}

/**
 * Strip "shopee-" prefix dari product ID.
 * Sebelumnya: 4 implementasi beda (slice(7) vs replace()) di 4 file.
 * Sekarang: satu fungsi, konsisten.
 * @deprecated Gunakan stripMarketplacePrefix() untuk multi-marketplace support.
 */
export function stripShopeePrefix(id: string): string {
  return id.startsWith("shopee-") ? id.slice(7) : id;
}

/**
 * Tambah "shopee-" prefix ke product ID.
 * Kebalikan dari stripShopeePrefix.
 */
export function addShopeePrefix(id: string): string {
  return id.startsWith("shopee-") ? id : `shopee-${id}`;
}
