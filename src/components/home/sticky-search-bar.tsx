"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface StickySearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

/**
 * StickySearchBar — muncul setelah hero section scroll keluar layar.
 */
export function StickySearchBar({ search, onSearchChange }: StickySearchBarProps) {
  return (
    <div className="sticky top-14 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-4 max-w-7xl py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari produk viral..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari produk viral"
            className={cn(
              "h-9 pl-10 pr-4 text-sm",
              "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
              "text-foreground placeholder-zinc-400",
              "focus:ring-1 focus:ring-primary/50",
              "rounded-lg"
            )}
          />
        </div>
      </div>
    </div>
  );
}
