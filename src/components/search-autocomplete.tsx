"use client";

import * as React from "react";
import Link from "next/link";
import { Search, X, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (val: string) => void;
  placeholder?: string;
  className?: string;
  /** Style variant: 'light' (default, white bg) atau 'dark' (di atas background gelap) */
  variant?: "light" | "dark";
}

interface Suggestion {
  id: string;
  title: string;
  price: number;
  image: string;
  marketplace: string;
}

const MARKETPLACE_LABELS: Record<string, string> = {
  shopee: "Shopee",
  tokopedia: "Tokopedia",
  lazada: "Lazada",
  blibli: "Blibli",
  tiktok: "TikTok Shop",
  aliexpress: "AliExpress",
  amazon: "Amazon",
};

/**
 * SearchAutocomplete — search input dengan live suggestions dropdown.
 *
 * Fitur:
 * - Debounce 300ms sebelum fetch
 * - Max 5 suggestions dari /api/products?search=xxx&limit=5
 * - Click suggestion → navigate ke /produk/{id}
 * - Enter → trigger onSearch (filter homepage)
 * - Keyboard navigation (arrow up/down, escape to close)
 */
export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  placeholder = "Cari produk ...",
  className,
  variant = "light",
}: SearchAutocompleteProps) {
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Fetch suggestions dengan debounce
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(value.trim())}&limit=5&filter=latest`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.products || []);
          setShowSuggestions(true);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Close dropdown saat click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
      setShowSuggestions(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        // Navigate to product detail
        window.location.href = `/produk/${suggestions[activeIndex].id}`;
      } else {
        // Trigger search
        onSearch(value);
        setShowSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
          variant === "dark" ? "text-white/70" : "text-zinc-400"
        )} />
        <input
          type="search"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className={cn(
            "w-full h-10 md:h-11 pl-10 pr-4 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40",
            variant === "dark"
              ? "bg-white/15 backdrop-blur-md border border-white/20 text-white placeholder-white/70 focus:bg-white/25 focus:border-white/40"
              : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-foreground"
          )}
          aria-label="Cari produk"
          autoComplete="off"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              variant === "dark" ? "text-white/70 hover:text-white" : "text-zinc-400 hover:text-zinc-600"
            )}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-xs text-zinc-500 text-center">
              Mencari produk...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-zinc-500 text-center">
              Tidak ada produk untuk "{value}"
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 text-[10px] text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {suggestions.length} produk ditemukan
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <li key={s.id}>
                    <Link
                      href={`/produk/${s.id}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition",
                        idx === activeIndex && "bg-violet-50 dark:bg-violet-900/20"
                      )}
                      onClick={() => setShowSuggestions(false)}
                    >
                      <img
                        src={s.image}
                        alt=""
                        className="w-10 h-10 rounded object-contain bg-zinc-100 dark:bg-zinc-800 flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {s.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                            Rp{s.price.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {MARKETPLACE_LABELS[s.marketplace] || s.marketplace}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  onSearch(value);
                  setShowSuggestions(false);
                }}
                className="w-full px-3 py-2 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 border-t border-zinc-100 dark:border-zinc-800 font-medium"
              >
                Lihat semua hasil untuk "{value}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
