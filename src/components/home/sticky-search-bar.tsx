"use client";

import { SearchAutocomplete } from "@/components/search-autocomplete";

interface StickySearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

/**
 * StickySearchBar — muncul setelah hero section scroll keluar layar.
 * Pakai SearchAutocomplete untuk suggestions live.
 */
export function StickySearchBar({ search, onSearchChange }: StickySearchBarProps) {
  return (
    <div className="sticky top-14 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-4 max-w-[1400px] py-2">
        <SearchAutocomplete
          value={search}
          onChange={onSearchChange}
          onSearch={onSearchChange}
          placeholder="Cari produk..."
          variant="light"
        />
      </div>
    </div>
  );
}
