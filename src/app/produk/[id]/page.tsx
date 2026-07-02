import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductDetailClient from "./ProductDetailClient";
import ProductError from "./error";

interface Props {
  params: Promise<{ id: string }>;
}

// React.cache() deduplikasi DB query dalam 1 request
// Jadi generateMetadata + ProductPage share hasil yang sama, gak query 2x
const getProduct = cache(async (id: string) => {
  try {
    const dbId = id.startsWith("shopee-") ? id.replace("shopee-", "") : id;
    return await db.shopeeProduct.findUnique({ where: { id: dbId } });
  } catch (err) {
    console.error("[ProductPage] DB error in getProduct:", err);
    return null;
  }
});

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return { title: "Produk tidak ditemukan - JelajahBelanja" };
  }

  const productUrl = `/produk/${id}`;
  const mpLabel =
    product.marketplace
      ? product.marketplace.charAt(0).toUpperCase() + product.marketplace.slice(1)
      : "Shopee";
  const priceStr = `Rp ${product.price.toLocaleString("id-ID")}`;
  const description = `Beli ${product.title} dengan harga ${priceStr}${product.discountPercent ? ` diskon ${product.discountPercent}%` : ""} di ${mpLabel}. Rating ${product.rating}/5, ${product.soldCount} terjual.`;

  return {
    title: `${product.title} - JelajahBelanja`,
    description,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: product.title,
      description: `${priceStr}${product.discountPercent ? ` | Diskon ${product.discountPercent}%` : ""} di ${mpLabel}`,
      url: productUrl,
      images: product.image
        ? [
            {
              url: product.image,
              width: 800,
              height: 800,
              alt: product.title,
            },
          ]
        : [],
      type: "website",
      siteName: "JelajahBelanja",
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: `${priceStr}${product.discountPercent ? ` | Diskon ${product.discountPercent}%` : ""} di ${mpLabel}`,
      images: product.image ? [product.image] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch (err) {
    console.error("[ProductPage] DB error fetching product:", err);
    // DB error — tampilkan error boundary daripada crash
    return <ProductError error={new Error("Gagal memuat data produk")} reset={() => {}} />;
  }

  if (!product) {
    notFound();
  }

  // Get related products (same category, excluding current)
  let related: Awaited<ReturnType<typeof db.shopeeProduct.findMany>> = [];
  try {
    related = await db.shopeeProduct.findMany({
      where: {
        category: product.category,
        isHidden: false,
        id: { not: product.id },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
  } catch (err) {
    console.error("[ProductPage] DB error fetching related products:", err);
    // Related products gagal? Gak masalah, tetap tampilkan produk utama
    // related tetap empty array []
  }

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
