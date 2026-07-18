import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ensureCategoriesSeeded, ensureAffiliateTagsSeeded } from "@/lib/seed";
import { slugify } from "@/lib/utils";
import CategoryPageClient from "./CategoryPageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

// Cache DB query dalam 1 request
const getCategory = cache(async (slug: string) => {
  try {
    await ensureCategoriesSeeded();

    // Coba by ID dulu (backwards compatible dengan URL lama)
    let category = await db.category.findUnique({ where: { id: slug } });

    // Kalau tidak ketemu by ID, cari by slug (dari nama kategori)
    if (!category) {
      const allCats = await db.category.findMany({ where: { enabled: true } });
      category = allCats.find(c => slugify(c.name) === slug) || null;
    }

    return category;
  } catch (err) {
    console.error("[CategoryPage] DB error:", err);
    return null;
  }
});

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return { title: "Kategori tidak ditemukan - JelajahBelanja" };
  }

  return {
    title: `${category.name} - Produk Anak Terbaik & Best Seller | JelajahBelanja`,
    description: `Kurasi produk ${category.name} terbaik dari Shopee & Tokopedia. Rating ≥ 4.8, harga termurah, diskon terbesar. Update terbaru setiap hari.`,
    alternates: {
      canonical: `/kategori/${slugify(category.name)}`,
    },
    openGraph: {
      title: `${category.name} - Produk Anak Terbaik | JelajahBelanja`,
      description: `Kurasi produk ${category.name} terbaik dari Shopee & Tokopedia. Rating ≥ 4.8.`,
    },
  };
}

// Generate static params untuk kategori yang enabled (SEO + performance)
// Pakai slug (dari nama) bukan ID
export async function generateStaticParams() {
  try {
    await ensureCategoriesSeeded();
    const categories = await db.category.findMany({
      where: { enabled: true },
      select: { id: true, name: true },
    });
    // Generate slug untuk tiap kategori
    return categories.map(c => ({ slug: slugify(c.name) }));
  } catch {
    return [];
  }
}

export const dynamicParams = true; // allow new kategori tanpa rebuild

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    notFound();
  }

  // Get all categories for chips
  await ensureAffiliateTagsSeeded();
  const allCategories = await db.category.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, emoji: true },
  });

  return (
    <CategoryPageClient
      category={JSON.parse(JSON.stringify(category))}
      allCategories={JSON.parse(JSON.stringify(allCategories))}
    />
  );
}
