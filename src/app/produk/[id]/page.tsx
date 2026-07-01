import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { stripMarketplacePrefix } from "@/lib/utils";
import { SITE_URL } from "@/lib/config";
import { dbRowToProduct, type ShopeeProductRow } from "@/lib/product-mapper";
import ProductDetailClient, { type ShopeeProduct } from "./ProductDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

// React.cache() deduplikasi DB query dalam 1 request
// Jadi generateMetadata + ProductPage share hasil yang sama, gak query 2x
const getProduct = cache(async (id: string) => {
  const dbId = stripMarketplacePrefix(id);
  return db.shopeeProduct.findUnique({ where: { id: dbId } });
});

/**
 * ISR: Pre-generate halaman produk saat build, revalidate tiap 1 jam.
 * Produk baru yang belum di-generate akan di-render on-demand (fallback).
 * Ini mempercepat TTFB (Time To First Byte) dan membantu Google indexing.
 */
export const revalidate = 3600; // 1 jam

export async function generateStaticParams() {
  try {
    const products = await db.shopeeProduct.findMany({
      where: { enabled: true, isHidden: { not: true } },
      select: { id: true, marketplace: true, url: true },
      orderBy: { soldCount: "desc" },
      // Batasi top 500 saat build — sisanya fallback SSR
      take: 500,
    });

    return products.map((p) => {
      const mp = p.marketplace || "shopee";
      return { id: `${mp}-${p.id}` };
    });
  } catch {
    // Kalau DB belum ada di build time, skip — fallback ke SSR
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return { title: "Produk tidak ditemukan - JelajahBelanja" };
  }

  // Pakai dbRowToProduct supaya marketplace resolved dari URL
  const dto = dbRowToProduct(product as ShopeeProductRow);
  const canonicalUrl = `${SITE_URL}/produk/${dto.marketplace}-${product.id}`;

  return {
    title: `${dto.title} - JelajahBelanja`,
    description: `Beli ${dto.title} dengan harga Rp ${dto.price.toLocaleString("id-ID")}${dto.discountPercent ? ` diskon ${dto.discountPercent}%` : ""}. Rating ${dto.rating}/5, ${dto.soldCount} terjual.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: dto.title,
      description: `Rp ${dto.price.toLocaleString("id-ID")}${dto.discountPercent ? ` | Diskon ${dto.discountPercent}%` : ""}`,
      url: canonicalUrl,
      images: dto.image ? [{ url: dto.image }] : [],
      type: "website",
      siteName: "JelajahBelanja",
    },
    twitter: {
      card: "summary_large_image",
      title: dto.title,
      description: `Rp ${dto.price.toLocaleString("id-ID")}${dto.discountPercent ? ` | Diskon ${dto.discountPercent}%` : ""}`,
      images: dto.image ? [dto.image] : [],
    },
  };
}

/**
 * Serialize Prisma ShopeeProduct row for client component.
 * Prisma returns Date objects, but client expects ISO strings.
 * Uses dbRowToProduct() which already handles marketplace resolution via URL.
 */
function serialize(row: Awaited<ReturnType<typeof getProduct>>): ShopeeProduct | null {
  if (!row) return null;
  const dto = dbRowToProduct(row as ShopeeProductRow);
  return {
    ...row,
    // Override marketplace with resolved value from dbRowToProduct
    marketplace: dto.marketplace,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeMany(rows: Awaited<ReturnType<typeof db.shopeeProduct.findMany>>): ShopeeProduct[] {
  return rows.map((r) => {
    const dto = dbRowToProduct(r as ShopeeProductRow);
    return {
      ...r,
      marketplace: dto.marketplace,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    // Debug: log kenapa product gak ketemu
    console.warn(`[produk/${id}] Product NOT found. Raw id="${id}", stripped="${stripMarketplacePrefix(id)}"`);
    notFound();
  }

  // Get related products (same category, excluding current)
  const related = await db.shopeeProduct.findMany({
    where: {
      category: product.category,
      isHidden: false,
      id: { not: product.id },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  // JSON-LD structured data for SEO
  const dto = dbRowToProduct(product as ShopeeProductRow);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: dto.title,
    image: dto.image,
    description: `${dto.title} - Rp ${dto.price.toLocaleString("id-ID")}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: dto.price,
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: dto.rating,
      reviewCount: dto.reviewCount,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient key={product.id} product={serialize(product)!} related={serializeMany(related)} />
    </>
  );
}
