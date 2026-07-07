/**
 * Marketplace yang didukung. Default = mock (Mode Demo).
 * Untuk produksi: shopee, tokopedia, lazada adalah marketplace lokal Indonesia.
 */
export type Marketplace =
  | "shopee"
  | "tokopedia"
  | "lazada"
  | "aliexpress"
  | "amazon"
  | "tiktok"
  | "mock";

export interface Product {
  id: string;
  title: string;
  url: string; // URL asli produk di marketplace
  affiliateUrl?: string; // URL dengan affiliate tag (dipakai di tombol "Lihat Produk")
  image: string;
  price: number; // dalam Rupiah
  originalPrice?: number; // harga sebelum diskon
  discountPercent?: number;
  rating: number; // 0-5
  reviewCount: number;
  soldCount: number;
  soldPerDay: number; // computed dari soldCount / daysSinceListed
  timestamp: string; // ISO date
  marketplace: Marketplace;
  category: string;
  categorySlug?: string;
  viralScore: number;
  isViral: boolean;
  /** Lokasi seller (untuk marketplace lokal) */
  location?: string;
}

export type ProductFilter = "latest" | "viral" | "weekly";

export interface ProductsResponse {
  products: Product[];
  total: number;
  source: "live" | "mock";
}

export interface CategoryDTO {
  id: string;
  name: string;
  emoji: string;
  keywords: string;
  amazonNode: string | null;
  aliexpressCat: string | null;
  shopeeCat: string | null;
  tokopediaCat: string | null;
  lazadaCat: string | null;
  accesstradeCat: string | null;
  order: number;
  enabled: boolean;
}

export interface CreateCategoryInput {
  name: string;
  emoji: string;
  keywords: string;
  amazonNode?: string | null;
  aliexpressCat?: string | null;
  shopeeCat?: string | null;
  tokopediaCat?: string | null;
  lazadaCat?: string | null;
  accesstradeCat?: string | null;
  enabled?: boolean;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  emoji?: string;
  keywords?: string;
  amazonNode?: string | null;
  aliexpressCat?: string | null;
  shopeeCat?: string | null;
  tokopediaCat?: string | null;
  lazadaCat?: string | null;
  accesstradeCat?: string | null;
  order?: number;
  enabled?: boolean;
}

export interface AffiliateTagDTO {
  id: string;
  marketplace: Marketplace;
  tag: string;
  enabled: boolean;
}

export interface UpdateAffiliateTagInput {
  marketplace: Marketplace;
  tag: string;
  enabled?: boolean;
}
