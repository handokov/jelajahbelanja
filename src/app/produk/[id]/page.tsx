import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

// React.cache() deduplikasi DB query dalam 1 request
// Jadi generateMetadata + ProductPage share hasil yang sama, gak query 2x
const getProduct = cache(async (id: string) => {
  const dbId = id.startsWith("shopee-") ? id.replace("shopee-", "") : id;
  return db.shopeeProduct.findUnique({ where: { id: dbId } });
});

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return { title: "Produk tidak ditemukan - JelajahBelanja" };
  }

  return {
    title: `${product.title} - JelajahBelanja`,
    description: `Beli ${product.title} dengan harga Rp ${product.price.toLocaleString("id-ID")}${product.discountPercent ? ` diskon ${product.discountPercent}%` : ""}. Rating ${product.rating}/5, ${product.soldCount} terjual.`,
    openGraph: {
      title: product.title,
      description: `Rp ${product.price.toLocaleString("id-ID")}${product.discountPercent ? ` | Diskon ${product.discountPercent}%` : ""}`,
      images: product.image ? [{ url: product.image }] : [],
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.image,
    description: `${product.title} - Rp ${product.price.toLocaleString("id-ID")}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: product.price,
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} related={related} />
    </>
  );
}
