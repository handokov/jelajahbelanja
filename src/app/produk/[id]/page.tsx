import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { extractProductId, productSlug, slugify } from "@/lib/utils";
import ProductDetailClient from "./ProductDetailClient";
import ProductError from "./error";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Lookup produk dari URL slug dengan collision-safe matching.
 *
 * BUG LAMA: shortId cuma 8 char (timestamp saja). Produk yang di-insert dalam
 * batch sama (cth: 7 produk Books & Stationery) punya 8-char prefix identik →
 * findMany({ startsWith, take: 1 }) selalu return produk yang sama (Bantex).
 * Akibatnya: SEMUA produk di kategori Books & Stationery detail page-nya nge-link
 * ke "Bantex Buku Tulis".
 *
 * FIX:
 * 1. URL BARU pakai 14-char shortId (0 collision di DB production).
 * 2. URL LAMA (8-char, sudah di-share / ter-index Google) tetap jalan:
 *    - findMany tanpa take:1 → ambil SEMUA match
 *    - Kalau multiple match → disambiguasi pakai title portion di slug
 *    - Kalau ketemu produk yang benar → redirect ke URL 14-char baru (canonical)
 */
const getProduct = cache(async (slug: string) => {
  try {
    // 1. Coba exact match by full ID (URL paling lama: /produk/<full-cuid>)
    const exact = await db.shopeeProduct.findUnique({ where: { id: slug } });
    if (exact) return { product: exact, needsRedirect: false };

    // 2. Extract shortId dari slug (bisa 8 atau 14 char)
    const shortId = extractProductId(slug);
    if (shortId.length < 8) return { product: null, needsRedirect: false };

    // 3. Cari SEMUA produk yang ID-nya start dengan shortId (tanpa take:1!)
    const products = await db.shopeeProduct.findMany({
      where: { id: { startsWith: shortId } },
    });

    if (products.length === 0) return { product: null, needsRedirect: false };

    // 4. Kalau cuma 1 match → langsung pakai (URL 14-char baru, unik)
    if (products.length === 1) {
      return { product: products[0], needsRedirect: true };
    }

    // 5. Multiple matches (URL 8-char lama yang tabrakan) → disambiguasi pakai title.
    //    Slug format: {slugify-4-kata-pertama-title}-{shortId}
    //    Jadi title portion = slug tanpa segmen shortId terakhir.
    const slugParts = slug.split("-");
    slugParts.pop(); // hapus shortId
    const slugTitlePart = slugParts.join("-");

    // Cari produk yang slugify(4 kata pertama title)-nya cocok dengan slugTitlePart.
    // Kalau TIDAK ada yang cocok (URL malformed / title produk sudah diedit) → return null
    // (404) lebih baik daripada tunjukin produk salah ke user.
    const matched = products.find((p) => {
      const productTitleSlug = slugify(p.title).split("-").slice(0, 4).join("-");
      return productTitleSlug === slugTitlePart;
    });

    if (!matched) return { product: null, needsRedirect: false };
    return { product: matched, needsRedirect: true };
  } catch (err) {
    console.error("[ProductPage] DB error in getProduct:", err);
    return { product: null, needsRedirect: false };
  }
});

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { product } = await getProduct(id);

  if (!product) {
    return { title: "Produk tidak ditemukan - JelajahBelanja" };
  }

  // Canonical URL selalu pakai slug 14-char baru (SEO: hindari duplicate content)
  const productUrl = `/produk/${productSlug(product.title, product.id)}`;
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

  let result;
  try {
    result = await getProduct(id);
  } catch (err) {
    console.error("[ProductPage] DB error fetching product:", err);
    // DB error — tampilkan error boundary daripada crash
    return <ProductError error={new Error("Gagal memuat data produk")} reset={() => {}} />;
  }

  const { product, needsRedirect } = result;

  if (!product) {
    notFound();
  }

  // Redirect URL lama (8-char shortId / full ID) ke URL baru (14-char shortId).
  // Ini fix shared links yang sudah tersebar + SEO canonical.
  if (needsRedirect) {
    const newSlug = productSlug(product.title, product.id);
    if (id !== newSlug) {
      redirect(`/produk/${newSlug}`);
    }
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
