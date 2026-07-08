"use client";

import * as React from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CategoryDTO } from "@/lib/types";

interface CategoryChipsProps {
  categories: CategoryDTO[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  isLoading?: boolean;
}

/**
 * CategoryChips — horizontal scrollable category selector.
 * Di homepage: klik chip → navigate ke /kategori/[id] (URL clean untuk SEO).
 * "Semua" → navigate ke homepage "/".
 */
export function CategoryChips({
  categories,
  activeCategory,
  isLoading,
}: CategoryChipsProps) {
  if (isLoading) {
    return (
      <section aria-label="Kategori produk viral" className="mb-6">
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Kategori produk viral" className="mb-6">
      <nav className="flex md:grid md:grid-cols-8 gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
        <CategoryChip
          active={activeCategory === "all"}
          href="/"
          label="Semua"
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            active={activeCategory === c.id}
            href={`/kategori/${c.id}`}
            label={c.name}
          />
        ))}
      </nav>
    </section>
  );
}

function CategoryChip({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  emoji?: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex-shrink-0 inline-flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium border transition whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-primary/40 hover:text-primary"
      )}
    >
      {label}
    </Link>
  );
}

