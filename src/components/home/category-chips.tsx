"use client";

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
 */
export function CategoryChips({
  categories,
  activeCategory,
  onCategoryChange,
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
          onClick={() => onCategoryChange("all")}
          emoji="✨"
          label="Semua"
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            active={activeCategory === c.id}
            onClick={() => onCategoryChange(c.id)}
            emoji={c.emoji}
            label={c.name}
          />
        ))}
      </nav>
    </section>
  );
}

function CategoryChip({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium border transition",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-primary/40 hover:text-primary"
      )}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}
