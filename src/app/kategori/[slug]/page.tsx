import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ensureCategoriesSeeded, ensureAffiliateTagsSeeded } from "@/lib/seed";
import CategoryPageClient from "./CategoryPageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

// Cache DB query dalam 1 request
const getCategory = cache(async (slug: string) => {
  try {
    await ensureCategoriesSeeded();
    // Slug = category ID atau slugified name
    // Coba by ID dulu
    let category = await db.category.findUnique({ where: { id: slug } });
    // Kalau tidak ketemu, coba cari by name (slugified)
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

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return { title: "Kategori tidak ditemukan - JelajahBelanja" };
  }

  return {
    title: `${category.name} - Produk Viral & Best Seller`,
    description: `Temukan produk ${category.name} viral dan best seller dari Shopee, Tokopedia, Lazada, Blibli. Update terbaru, harga termurah, diskon terbesar.`,
    alternates: {
      canonical: `/kategori/${category.id}`,
    },
  };
}

// Generate static params untuk kategori yang enabled (SEO + performance)
export async function generateStaticParams() {
  try {
    await ensureCategoriesSeeded();
    const categories = await db.category.findMany({
      where: { enabled: true },
      select: { id: true, name: true },
    });
    // Pakai ID sebagai slug (lebih stabil daripada name yang bisa berubah)
    return categories.map(c => ({ slug: c.id }));
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
