/**
 * Admin Dashboard — Shared constants, types, and helpers.
 *
 * Dipakai oleh page.tsx dan semua admin tab components.
 */

import type { Marketplace } from "@/lib/types";

// ─── Types ───

export interface ProductFormInput {
  title: string;
  image: string;
  price: string;
  originalPrice: string;
  discountPercent: string;
  rating: string;
  reviewCount: string;
  soldCount: string;
  location: string;
  category: string;
  url: string;
  affiliateUrl: string;
  marketplace: string;
  enabled: boolean;
  isViral: boolean;
}

export interface BannerFormInput {
  title: string;
  subtitle: string;
  image: string;
  linkUrl: string;
  linkLabel: string;
  bgColor: string;
  order: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

// ─── Empty form defaults ───

export const EMPTY_PRODUCT: ProductFormInput = {
  title: "",
  image: "",
  price: "",
  originalPrice: "",
  discountPercent: "",
  rating: "",
  reviewCount: "",
  soldCount: "",
  location: "",
  category: "",
  url: "",
  affiliateUrl: "",
  marketplace: "shopee",
  enabled: true,
  isViral: false,
};

export const EMPTY_BANNER: BannerFormInput = {
  title: "",
  subtitle: "",
  image: "",
  linkUrl: "",
  linkLabel: "",
  bgColor: "#7c3aed",
  order: "0",
  isActive: true,
  startDate: "",
  endDate: "",
};

// ─── Config ───

export const MARKETPLACE_OPTIONS = [
  { value: "shopee", label: "Shopee" },
  { value: "tokopedia", label: "Tokopedia" },
  { value: "lazada", label: "Lazada" },
  { value: "aliexpress", label: "AliExpress" },
];

export const AFFILIATE_INFO: Array<{
  id: Marketplace;
  label: string;
  param: string;
  signupUrl: string;
  hint: string;
}> = [
  {
    id: "shopee",
    label: "Shopee Affiliate",
    param: "aff_atk",
    signupUrl: "https://affiliate.shopee.co.id",
    hint: "Daftar gratis di affiliate.shopee.co.id. Setelah approve, salin tracking ID Anda (mis. abcDE123).",
  },
  {
    id: "tokopedia",
    label: "Tokopedia Affiliate",
    param: "aff_code",
    signupUrl: "https://affiliate.tokopedia.com",
    hint: "Daftar di affiliate.tokopedia.com. Salin affiliate code Anda (mis. jelajahbelanja).",
  },
  {
    id: "lazada",
    label: "Lazada Affiliate",
    param: "aff_id",
    signupUrl: "https://www.lazada.co.id/wow/camp/pdhl/id/lazadaaffiliate/index",
    hint: "Daftar di lazada.co.id affiliate program. Salin Aff ID Anda (mis. 12345).",
  },
  {
    id: "aliexpress",
    label: "AliExpress Affiliate",
    param: "aff_fcid",
    signupUrl: "https://portals.aliexpress.com",
    hint: "Daftar di portals.aliexpress.com. Salin tracking ID Anda.",
  },
];

// ─── Helpers ───

export function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}
