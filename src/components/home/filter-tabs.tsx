"use client";

import { Clock, Flame, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductFilter } from "@/lib/types";

interface FilterTabsProps {
  filter: ProductFilter;
  onFilterChange: (filter: ProductFilter) => void;
}

/**
 * FilterTabs — tabs untuk Terbaru / Viral 24 Jam / Top Mingguan.
 */
export function FilterTabs({ filter, onFilterChange }: FilterTabsProps) {
  return (
    <section aria-label="Filter produk viral" className="mb-6">
      <Tabs
        value={filter}
        onValueChange={(v) => onFilterChange(v as ProductFilter)}
      >
        <TabsList className="grid w-full max-w-md grid-cols-3 h-10">
          <TabsTrigger value="latest" className="text-xs md:text-sm">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Terbaru
          </TabsTrigger>
          <TabsTrigger value="viral" className="text-xs md:text-sm">
            <Flame className="w-3.5 h-3.5 mr-1" />
            Viral 24 Jam
          </TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs md:text-sm">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            Top Mingguan
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </section>
  );
}
