export type Marketplace = "amazon" | "aliexpress" | "mock";

export interface Product {
  id: string;
  title: string;
  url: string;
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
  viralScore: number;
  isViral: boolean;
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
  order: number;
  enabled: boolean;
}

export interface CreateCategoryInput {
  name: string;
  emoji: string;
  keywords: string;
  amazonNode?: string | null;
  aliexpressCat?: string | null;
  enabled?: boolean;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  emoji?: string;
  keywords?: string;
  amazonNode?: string | null;
  aliexpressCat?: string | null;
  order?: number;
  enabled?: boolean;
}
