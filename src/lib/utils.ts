import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip "shopee-" prefix dari product ID.
 * Sebelumnya: 4 implementasi beda (slice(7) vs replace()) di 4 file.
 * Sekarang: satu fungsi, konsisten.
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
